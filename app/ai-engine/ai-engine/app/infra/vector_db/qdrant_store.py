"""
Qdrant Vector DB Client
────────────────────────
Handles:
- Collection bootstrap on startup
- Document upsert with metadata
- Similarity search with optional category filter
- Mock mode (in-memory cosine sim for tests)
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass

from qdrant_client import AsyncQdrantClient
from qdrant_client.models import (
    Distance, VectorParams, PointStruct,
    Filter, FieldCondition, MatchValue,
    SearchRequest, ScoredPoint,
)

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class SearchResult:
    id: str
    score: float
    content: str
    category: str
    title: str
    metadata: dict


class QdrantStore:

    def __init__(self, llm_client=None):
        self._settings = get_settings()
        self._llm = llm_client  # for generating embeddings
        self._client: AsyncQdrantClient | None = None
        self._mock_store: list[dict] = []  # used in mock mode

    async def startup(self) -> None:
        if self._settings.mock_mode:
            logger.info("qdrant_mock_mode_active")
            self._load_mock_kb()
            return

        self._client = AsyncQdrantClient(url=self._settings.qdrant_url)
        await self._ensure_collection()
        logger.info("qdrant_connected", url=self._settings.qdrant_url)

    async def shutdown(self) -> None:
        if self._client:
            await self._client.close()

    async def upsert(
        self,
        content: str,
        category: str,
        title: str,
        doc_id: str | None = None,
        metadata: dict | None = None,
    ) -> str:
        point_id = doc_id or str(uuid.uuid4())

        if self._settings.mock_mode:
            self._mock_store.append({
                "id": point_id, "content": content,
                "category": category, "title": title,
                "metadata": metadata or {},
            })
            return point_id

        vector = await self._llm.embed(content)
        point = PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "content": content,
                "category": category,
                "title": title,
                **(metadata or {}),
            },
        )
        await self._client.upsert(
            collection_name=self._settings.qdrant_collection,
            points=[point],
        )
        return point_id

    async def search(
        self,
        query: str,
        top_k: int | None = None,
        category_filter: list[str] | None = None,
    ) -> list[SearchResult]:
        k = top_k or self._settings.rag_top_k
        threshold = self._settings.rag_score_threshold

        if self._settings.mock_mode:
            return self._mock_search(query, k, category_filter)

        vector = await self._llm.embed(query)
        qfilter = None
        if category_filter:
            qfilter = Filter(
                should=[
                    FieldCondition(key="category", match=MatchValue(value=cat))
                    for cat in category_filter
                ]
            )

        hits: list[ScoredPoint] = await self._client.search(
            collection_name=self._settings.qdrant_collection,
            query_vector=vector,
            limit=k,
            score_threshold=threshold,
            query_filter=qfilter,
            with_payload=True,
        )

        return [
            SearchResult(
                id=str(h.id),
                score=h.score,
                content=h.payload.get("content", ""),
                category=h.payload.get("category", ""),
                title=h.payload.get("title", ""),
                metadata={k: v for k, v in h.payload.items()
                           if k not in ("content", "category", "title")},
            )
            for h in hits
        ]

    # ── Internals ────────────────────────────────────────────────────────────

    async def _ensure_collection(self) -> None:
        existing = await self._client.get_collections()
        names = [c.name for c in existing.collections]
        if self._settings.qdrant_collection not in names:
            await self._client.create_collection(
                collection_name=self._settings.qdrant_collection,
                vectors_config=VectorParams(
                    size=self._settings.qdrant_vector_size,
                    distance=Distance.COSINE,
                ),
            )
            logger.info("qdrant_collection_created", name=self._settings.qdrant_collection)
        else:
            logger.info("qdrant_collection_exists", name=self._settings.qdrant_collection)

    def _load_mock_kb(self) -> None:
        """Pre-load a minimal knowledge base for mock mode."""
        kb = [
            {
                "id": "kb-001", "category": "patterns", "title": "Modular Monolith Pattern",
                "content": (
                    "A modular monolith organizes code into well-defined modules with clear boundaries. "
                    "Each module owns its data and exposes a stable interface. "
                    "Easier to operate than microservices; suitable for teams < 10 engineers and < 50k users. "
                    "Modules can be extracted into services as scaling demands arise."
                ),
            },
            {
                "id": "kb-002", "category": "patterns", "title": "Microservices Pattern",
                "content": (
                    "Microservices decompose a system into independently deployable services. "
                    "Each service owns its database. "
                    "Enables independent scaling and technology choices per service. "
                    "Introduces operational complexity: service discovery, distributed tracing, network latency. "
                    "Justified at > 100k users or when teams > 10 engineers need independent deployment velocity."
                ),
            },
            {
                "id": "kb-003", "category": "tradeoffs", "title": "PostgreSQL vs MongoDB",
                "content": (
                    "PostgreSQL excels for relational, transactional data with complex queries. "
                    "JSONB support handles semi-structured data well. "
                    "MongoDB suits document-centric workloads with flexible schemas. "
                    "PostgreSQL is the safer default for most SaaS applications due to ACID guarantees and mature ecosystem."
                ),
            },
            {
                "id": "kb-004", "category": "tradeoffs", "title": "Redis Caching Strategies",
                "content": (
                    "Cache-aside: application manages cache explicitly. Flexible but risks stale data. "
                    "Read-through: cache sits in front of DB, auto-populates on miss. Simpler but less control. "
                    "Write-through: writes go to cache and DB simultaneously. Consistent but higher write latency. "
                    "TTL tuning: set based on acceptable staleness — 60s for frequently changing data, 1h for reference data."
                ),
            },
            {
                "id": "kb-005", "category": "scaling", "title": "PostgreSQL Connection Pooling",
                "content": (
                    "PostgreSQL creates a new OS process per connection — expensive at scale. "
                    "PgBouncer in transaction mode multiplexes many app connections to fewer DB connections. "
                    "Target: max 100–200 DB connections, app can have thousands via pool. "
                    "Add read replica when read QPS exceeds 500 or primary CPU > 60%."
                ),
            },
            {
                "id": "kb-006", "category": "patterns", "title": "Event-Driven Architecture with Redis Streams",
                "content": (
                    "Redis Streams provide a persistent, ordered event log for inter-service communication. "
                    "Consumer groups enable parallel processing. "
                    "Suitable for up to ~50k events/second on a single node. "
                    "Migrate to Kafka when event volume exceeds Redis capacity or replay requirements span months."
                ),
            },
            {
                "id": "kb-007", "category": "scaling", "title": "Horizontal vs Vertical Scaling Decision",
                "content": (
                    "Vertical scaling (bigger instances) is simpler but has a ceiling and single point of failure. "
                    "Horizontal scaling (more instances) requires stateless services and a load balancer. "
                    "Rule of thumb: scale vertically first to avoid premature complexity; "
                    "switch to horizontal when a single instance cannot handle peak load with headroom."
                ),
            },
        ]
        self._mock_store.extend(kb)
        logger.info("mock_kb_loaded", count=len(kb))

    def _mock_search(
        self, query: str, k: int, category_filter: list[str] | None
    ) -> list[SearchResult]:
        """
        Simple keyword overlap scoring for mock mode.
        Not semantically accurate but good enough for dev/testing.
        """
        query_words = set(query.lower().split())
        scored = []
        for doc in self._mock_store:
            if category_filter and doc["category"] not in category_filter:
                continue
            doc_words = set(doc["content"].lower().split())
            overlap = len(query_words & doc_words)
            if overlap > 0:
                score = overlap / (len(query_words) + len(doc_words) - overlap)
                scored.append((score, doc))

        scored.sort(key=lambda x: x[0], reverse=True)
        return [
            SearchResult(
                id=doc["id"],
                score=score,
                content=doc["content"],
                category=doc["category"],
                title=doc["title"],
                metadata={},
            )
            for score, doc in scored[:k]
        ]
