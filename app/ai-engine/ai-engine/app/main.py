from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import structlog

from app.core.config import get_settings
from app.core.logging import setup_logging, get_logger

setup_logging()
logger = get_logger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "startup",
        env=settings.env,
        mock_mode=settings.mock_mode,
        ollama_url=settings.ollama_base_url,
        qdrant_url=settings.qdrant_url,
    )
    if settings.mock_mode:
        logger.warning(
            "mock_mode_active",
            message="All LLM and vector DB calls are mocked. Set MOCK_MODE=false to use real services.",
        )
    yield
    logger.info("shutdown")


app = FastAPI(
    title="AI Architecture Generator — AI Engine",
    version="0.1.0",
    description="LLM + RAG + Decision Engine for generating system architecture blueprints",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.env == "development" else ["https://yourdomain.com"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


# ── Routes ────────────────────────────────────────────────────────────────────
from app.api.v1.generate import router as generate_router  # noqa: E402

app.include_router(generate_router)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "mock_mode": settings.mock_mode,
        "env": settings.env,
    }


@app.get("/")
async def root():
    return {"message": "AI Architecture Generator — AI Engine", "docs": "/docs"}
