#!/usr/bin/env python3
"""
setup_dev.py
─────────────
One-time dev environment setup:
  1. Waits for all services to be healthy
  2. Runs DB migrations (when DB layer is added)
  3. Seeds the knowledge base into Qdrant
  4. Optionally pulls the Ollama model

Usage:
  python scripts/setup_dev.py
  python scripts/setup_dev.py --pull-model   # also pulls llama3.2 (4GB download)
"""
import asyncio
import sys
import time
import argparse
import httpx

# Add parent to path
sys.path.insert(0, ".")

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)

KB_DOCUMENTS = [
    {
        "id": "kb-101", "category": "patterns", "title": "Monolith First Strategy",
        "content": (
            "Martin Fowler's 'Monolith First' strategy recommends starting with a monolith "
            "and extracting services only when the need is clear. "
            "Benefits: simpler deployment, easier refactoring, no distributed systems overhead. "
            "Extract when: a module has significantly different scaling needs, "
            "or different teams need independent deployment velocity."
        ),
    },
    {
        "id": "kb-102", "category": "patterns", "title": "CQRS Pattern",
        "content": (
            "Command Query Responsibility Segregation separates read and write models. "
            "Write side: handles commands, enforces business rules, emits events. "
            "Read side: optimized for queries, can use different data store. "
            "Benefits: independent scaling of reads/writes, optimized read models. "
            "When to use: read/write ratio > 10:1 or complex domain logic."
        ),
    },
    {
        "id": "kb-103", "category": "tradeoffs", "title": "Kafka vs Redis Streams",
        "content": (
            "Redis Streams: low latency, simple ops, suitable for < 100k events/sec, "
            "retention limited by memory. Good for task queues and simple event buses. "
            "Kafka: high throughput (millions/sec), long retention (days/weeks), "
            "complex ops but essential for event sourcing and audit logs at scale. "
            "Migrate from Redis Streams to Kafka when retention > 24h or volume > 50k/sec."
        ),
    },
    {
        "id": "kb-104", "category": "scaling", "title": "Database Sharding Strategy",
        "content": (
            "Vertical scaling: upgrade to larger instance. Simple, no code changes. "
            "Read replicas: distribute read traffic. Best for read-heavy workloads. "
            "Connection pooling (PgBouncer): reduces connection overhead. Do this first. "
            "Horizontal sharding: partition data across nodes. Last resort — complex queries, "
            "cross-shard joins impossible. Use Citus extension for PostgreSQL sharding."
        ),
    },
    {
        "id": "kb-105", "category": "patterns", "title": "API Gateway Pattern",
        "content": (
            "API Gateway is the single entry point for all clients. "
            "Responsibilities: routing, authentication, rate limiting, SSL termination, "
            "request/response transformation, logging. "
            "Options: Kong (open source, Kubernetes native), AWS API Gateway (serverless), "
            "Nginx + Lua (DIY, high performance). "
            "Kong is recommended for Kubernetes deployments due to its plugin ecosystem."
        ),
    },
    {
        "id": "kb-106", "category": "scaling", "title": "CDN Strategy for SaaS",
        "content": (
            "Cloudflare CDN reduces origin load and improves global latency. "
            "Cache static assets (JS, CSS, images) with long TTLs (1 year + content hash). "
            "Cache API responses selectively: public endpoints yes, authenticated no. "
            "Use Cloudflare Workers for edge-side logic (auth token validation, geo-routing). "
            "Cost: free tier handles 100k requests/day; Pro tier at $20/mo for most startups."
        ),
    },
    {
        "id": "kb-107", "category": "tradeoffs", "title": "SQL vs NoSQL Decision Framework",
        "content": (
            "Choose SQL (PostgreSQL) when: data is relational, you need transactions, "
            "schema is relatively stable, team knows SQL well. "
            "Choose NoSQL when: document model fits naturally (MongoDB), "
            "extreme write throughput needed (Cassandra), "
            "or simple key-value access (Redis/DynamoDB). "
            "Avoid NoSQL for complex relationships — joins are hard in document stores. "
            "PostgreSQL JSONB handles semi-structured data well without sacrificing ACID."
        ),
    },
    {
        "id": "kb-108", "category": "patterns", "title": "Multi-Tenancy Architecture Patterns",
        "content": (
            "Three common patterns: "
            "(1) Shared DB, shared schema: cheapest, use Row Level Security (RLS). "
            "(2) Shared DB, separate schema: more isolation, harder migrations. "
            "(3) Separate DB per tenant: strongest isolation, expensive at scale. "
            "For most SaaS: shared DB + RLS is the right default. "
            "Move to separate DB for enterprise tenants requiring compliance isolation."
        ),
    },
]


async def wait_for_service(name: str, url: str, timeout: int = 60) -> bool:
    logger.info(f"Waiting for {name}...", url=url)
    async with httpx.AsyncClient() as client:
        for _ in range(timeout):
            try:
                resp = await client.get(url, timeout=2)
                if resp.status_code < 500:
                    logger.info(f"{name} is ready")
                    return True
            except Exception:
                pass
            await asyncio.sleep(1)
    logger.error(f"{name} not ready after {timeout}s")
    return False


async def seed_knowledge_base():
    logger.info("Seeding knowledge base into Qdrant...")

    from app.infra.llm.ollama_client import OllamaClient
    from app.infra.vector_db.qdrant_store import QdrantStore

    llm = OllamaClient()
    store = QdrantStore(llm_client=llm)

    await store.startup()

    for doc in KB_DOCUMENTS:
        doc_id = await store.upsert(
            content=doc["content"],
            category=doc["category"],
            title=doc["title"],
            doc_id=doc["id"],
        )
        logger.info("indexed_document", id=doc_id, title=doc["title"])

    await store.shutdown()
    await llm.close()
    logger.info("Knowledge base seeding complete", count=len(KB_DOCUMENTS))


async def pull_ollama_model(model: str):
    settings = get_settings()
    logger.info(f"Pulling Ollama model: {model} (this may take several minutes)...")
    async with httpx.AsyncClient(timeout=600) as client:
        try:
            resp = await client.post(
                f"{settings.ollama_base_url}/api/pull",
                json={"name": model},
            )
            logger.info("model_pull_complete", model=model, status=resp.status_code)
        except Exception as e:
            logger.error("model_pull_failed", error=str(e))


async def main(pull_model: bool):
    settings = get_settings()

    # Check services
    services = [
        ("API", "http://localhost:8000/health"),
        ("Qdrant", f"{settings.qdrant_url}/collections"),
    ]
    if not settings.mock_mode:
        services.append(("Ollama", f"{settings.ollama_base_url}/api/tags"))

    for name, url in services:
        ok = await wait_for_service(name, url)
        if not ok and name in ("Qdrant",):
            logger.warning(f"{name} not available, skipping dependent setup")

    # Seed KB
    await seed_knowledge_base()

    # Pull model
    if pull_model and not settings.mock_mode:
        await pull_ollama_model(settings.ollama_model)
        await pull_ollama_model(settings.ollama_embed_model)

    logger.info("Dev setup complete! Run: docker compose up")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--pull-model", action="store_true", help="Pull Ollama models (large download)")
    args = parser.parse_args()
    asyncio.run(main(pull_model=args.pull_model))
