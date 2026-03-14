"""
Generation API Routes
──────────────────────
POST /v1/generate          → enqueue job, return job_id
GET  /v1/generate/{job_id}/stream  → SSE progress stream
GET  /v1/generate/{job_id}         → poll result (when complete)
POST /v1/parse             → parse requirements only (no generation)
"""
from __future__ import annotations

import asyncio
import json
import uuid

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

router = APIRouter(prefix="/v1", tags=["generation"])


# ── Request / Response schemas ────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    raw_input: str = Field(
        description="Free-text product idea or requirements description",
        min_length=20,
        max_length=8192,
    )


class GenerateResponse(BaseModel):
    job_id: str
    status: str = "queued"
    message: str = "Architecture generation started"


class ParseRequest(BaseModel):
    raw_input: str = Field(min_length=10, max_length=8192)


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post("/generate", response_model=GenerateResponse)
async def start_generation(req: GenerateRequest):
    """
    Enqueue an architecture generation job.
    Returns immediately with a job_id for polling/streaming.
    """
    job_id = str(uuid.uuid4())

    from app.workers.ai_tasks import generate_architecture
    generate_architecture.apply_async(
        kwargs={"job_id": job_id, "raw_input": req.raw_input},
        task_id=job_id,
    )

    return GenerateResponse(job_id=job_id)


@router.get("/generate/{job_id}/stream")
async def stream_progress(job_id: str):
    """
    Server-Sent Events endpoint.
    Clients receive stage events as the job progresses:
      started → parsing → parsed → deciding → decided → enhancing → enhanced → complete
    Connection closes automatically when complete or error is received.
    """
    import redis.asyncio as aioredis
    from app.core.config import get_settings
    settings = get_settings()

    async def event_generator():
        r = aioredis.from_url(settings.redis_url)
        key = f"job_progress:{job_id}"
        seen = set()
        timeout_seconds = 180
        elapsed = 0

        try:
            while elapsed < timeout_seconds:
                # Read all events from the Redis list
                events = await r.lrange(key, 0, -1)
                for raw in reversed(events):  # list is LPUSH so reversed = chronological
                    event_str = raw.decode() if isinstance(raw, bytes) else raw
                    if event_str in seen:
                        continue
                    seen.add(event_str)

                    data = json.loads(event_str)
                    yield f"data: {json.dumps(data)}\n\n"

                    if data.get("stage") in ("complete", "error"):
                        return

                await asyncio.sleep(0.5)
                elapsed += 0.5
        finally:
            await r.aclose()

        yield f"data: {json.dumps({'stage': 'timeout', 'message': 'Job timed out'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
        },
    )


@router.get("/generate/{job_id}")
async def get_result(job_id: str):
    """
    Poll for job result.
    Returns 202 while pending, 200 with blueprint when complete, 500 on error.
    """
    from app.workers.celery_app import celery_app
    from celery.result import AsyncResult

    result: AsyncResult = celery_app.AsyncResult(job_id)

    if result.state == "PENDING":
        return {"status": "pending", "job_id": job_id}
    elif result.state == "STARTED":
        return {"status": "running", "job_id": job_id}
    elif result.state == "SUCCESS":
        return {"status": "complete", "job_id": job_id, "result": result.result}
    elif result.state == "FAILURE":
        raise HTTPException(status_code=500, detail=str(result.info))
    else:
        return {"status": result.state.lower(), "job_id": job_id}


@router.post("/parse")
async def parse_only(req: ParseRequest):
    """
    Parse requirements without running the full generation pipeline.
    Useful for the frontend to show a preview before confirming generation.
    """
    from app.domain.requirements.parser import RequirementsParser
    from app.infra.llm.ollama_client import OllamaClient

    llm = OllamaClient()
    parser = RequirementsParser(llm_client=llm)

    try:
        spec = await parser.parse(req.raw_input)
        return {"spec": spec.model_dump(exclude={"raw_input"}), "confidence": spec.parse_confidence}
    finally:
        await llm.close()


@router.post("/generate/sync")
async def generate_sync(req: GenerateRequest):
    """
    Synchronous generation — runs the full pipeline in the request.
    For development/testing only. Do NOT expose in production (no timeout protection).
    """
    from app.domain.requirements.parser import RequirementsParser
    from app.domain.architecture.decision_engine import ArchitectureDecisionEngine
    from app.domain.ai.enhancement_engine import AIEnhancementEngine
    from app.infra.llm.ollama_client import OllamaClient
    from app.infra.vector_db.qdrant_store import QdrantStore

    llm = OllamaClient()
    store = QdrantStore(llm_client=llm)

    try:
        await store.startup()

        parser = RequirementsParser(llm_client=llm)
        spec = await parser.parse(req.raw_input)

        engine = ArchitectureDecisionEngine()
        decision = engine.evaluate(spec)

        ai_engine = AIEnhancementEngine(llm=llm, vector_store=store)
        blueprint = await ai_engine.enhance(spec, decision)

        return {
            "requirements": spec.model_dump(exclude={"raw_input"}),
            "blueprint": blueprint.model_dump(),
        }
    finally:
        await store.shutdown()
        await llm.close()
