"""
Celery Workers
───────────────
Tasks run asynchronously so HTTP response returns immediately.
Job progress is published to Redis and consumed via SSE endpoint.
"""
from __future__ import annotations

import asyncio
import json

from celery import Celery
from celery.signals import worker_process_init

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "ai_engine",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
    task_acks_late=True,              # re-queue on worker crash
    worker_prefetch_multiplier=1,     # don't prefetch — LLM tasks are slow
    task_routes={
        "app.workers.ai_tasks.generate_architecture": {"queue": "ai"},
        "app.workers.ai_tasks.index_kb_document": {"queue": "ai"},
    },
    result_expires=3600,              # 1h TTL on results
)


# ── Progress publisher ────────────────────────────────────────────────────────

def _publish_progress(redis_url: str, job_id: str, stage: str, data: dict) -> None:
    """Publish job progress event to Redis list (consumed by SSE endpoint)."""
    import redis as redis_lib
    r = redis_lib.from_url(redis_url)
    event = json.dumps({"stage": stage, "job_id": job_id, **data})
    r.lpush(f"job_progress:{job_id}", event)
    r.expire(f"job_progress:{job_id}", 3600)


# ── Tasks ────────────────────────────────────────────────────────────────────

@celery_app.task(
    name="app.workers.ai_tasks.generate_architecture",
    bind=True,
    max_retries=2,
    default_retry_delay=5,
)
def generate_architecture(self, job_id: str, raw_input: str) -> dict:
    """
    Full generation pipeline:
      1. Parse requirements
      2. Run decision engine
      3. AI enhancement (RAG + LLM)
      4. Return blueprint JSON
    """
    redis_url = settings.redis_url

    def publish(stage: str, **data):
        _publish_progress(redis_url, job_id, stage, data)

    try:
        publish("started", message="Beginning analysis")

        # Lazy import to avoid heavy imports at module load
        from app.domain.requirements.parser import RequirementsParser
        from app.domain.architecture.decision_engine import ArchitectureDecisionEngine
        from app.domain.ai.enhancement_engine import AIEnhancementEngine
        from app.infra.llm.ollama_client import OllamaClient
        from app.infra.vector_db.qdrant_store import QdrantStore

        llm = OllamaClient()
        store = QdrantStore(llm_client=llm)

        # Run async code in sync Celery context
        loop = asyncio.new_event_loop()

        async def _run():
            await store.startup()

            publish("parsing", message="Parsing requirements")
            parser = RequirementsParser(llm_client=llm)
            spec = await parser.parse(raw_input)
            publish("parsed", confidence=spec.parse_confidence, features=spec.features)

            publish("deciding", message="Running architecture decision engine")
            engine = ArchitectureDecisionEngine()
            decision = engine.evaluate(spec)
            publish("decided", rules_fired=len(decision.applied_rules), pattern=decision.architecture_pattern.value)

            publish("enhancing", message="Enhancing with AI reasoning")
            ai_engine = AIEnhancementEngine(llm=llm, vector_store=store)
            blueprint = await ai_engine.enhance(spec, decision)
            publish("enhanced", method=blueprint.enhancement_method)

            await store.shutdown()
            await llm.close()
            return spec, blueprint

        spec, blueprint = loop.run_until_complete(_run())
        loop.close()

        result = {
            "job_id": job_id,
            "requirements": spec.model_dump(),
            "blueprint": blueprint.model_dump(),
        }
        publish("complete", message="Architecture generated successfully")
        return result

    except Exception as exc:
        publish("error", message=str(exc))
        raise self.retry(exc=exc)


@celery_app.task(name="app.workers.ai_tasks.index_kb_document")
def index_kb_document(doc_id: str, title: str, content: str, category: str) -> str:
    """Index a knowledge base document into Qdrant."""
    from app.infra.llm.ollama_client import OllamaClient
    from app.infra.vector_db.qdrant_store import QdrantStore

    llm = OllamaClient()
    store = QdrantStore(llm_client=llm)

    loop = asyncio.new_event_loop()

    async def _run():
        await store.startup()
        result_id = await store.upsert(
            content=content, category=category,
            title=title, doc_id=doc_id,
        )
        await store.shutdown()
        await llm.close()
        return result_id

    result = loop.run_until_complete(_run())
    loop.close()
    return result
