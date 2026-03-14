"""
Ollama LLM Client
──────────────────
- async HTTP calls to Ollama /api/generate
- Retry with exponential backoff (tenacity)
- Hard timeout per call
- Mock mode for development without Ollama running
"""
from __future__ import annotations

import json
import time
from collections import deque
from typing import AsyncIterator

import httpx
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log,
)
import logging

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger(__name__)
_tenacity_logger = logging.getLogger("tenacity")


class LLMError(Exception):
    pass


class LLMTimeoutError(LLMError):
    pass


class CircuitOpenError(LLMError):
    pass


class CircuitBreaker:
    """
    Simple sliding-window circuit breaker.
    Opens when error_rate > threshold in the last window_seconds.
    """
    def __init__(self, threshold: float = 0.5, window_seconds: int = 60, min_calls: int = 5):
        self._threshold = threshold
        self._window = window_seconds
        self._min_calls = min_calls
        self._calls: deque[tuple[float, bool]] = deque()  # (timestamp, success)
        self._open_until: float = 0.0

    def _prune(self) -> None:
        cutoff = time.time() - self._window
        while self._calls and self._calls[0][0] < cutoff:
            self._calls.popleft()

    def is_open(self) -> bool:
        if time.time() < self._open_until:
            return True
        return False

    def record(self, success: bool) -> None:
        self._prune()
        self._calls.append((time.time(), success))
        if len(self._calls) >= self._min_calls:
            failures = sum(1 for _, ok in self._calls if not ok)
            rate = failures / len(self._calls)
            if rate >= self._threshold:
                self._open_until = time.time() + 300  # trip for 5 min
                logger.warning("circuit_breaker_tripped", error_rate=rate)

    def reset(self) -> None:
        self._open_until = 0.0
        self._calls.clear()


class OllamaClient:

    def __init__(self):
        self._settings = get_settings()
        self._circuit = CircuitBreaker()
        self._client = httpx.AsyncClient(
            base_url=self._settings.ollama_base_url,
            timeout=self._settings.ollama_timeout_seconds,
        )

    # ── Public interface ─────────────────────────────────────────────────────

    async def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        """Return full completion string."""
        if self._settings.mock_mode:
            return self._mock_response(prompt)

        if self._circuit.is_open():
            raise CircuitOpenError("LLM circuit breaker is open — too many recent failures")

        return await self._call_with_retry(prompt, system, max_tokens, temperature)

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        """Yield token chunks as they arrive."""
        if self._settings.mock_mode:
            yield self._mock_response(prompt)
            return

        if self._circuit.is_open():
            raise CircuitOpenError("LLM circuit breaker is open")

        async for chunk in self._stream_call(prompt, system, max_tokens, temperature):
            yield chunk

    async def embed(self, text: str) -> list[float]:
        """Return embedding vector for text."""
        if self._settings.mock_mode:
            # Return deterministic fake embedding (for testing)
            import hashlib
            h = int(hashlib.md5(text.encode()).hexdigest(), 16)
            size = self._settings.qdrant_vector_size
            return [(((h >> i) & 0xFF) / 255.0) for i in range(size)]

        try:
            resp = await self._client.post(
                "/api/embeddings",
                json={"model": self._settings.ollama_embed_model, "prompt": text},
            )
            resp.raise_for_status()
            return resp.json()["embedding"]
        except Exception as e:
            logger.error("embed_failed", error=str(e))
            raise LLMError(f"Embedding failed: {e}") from e

    async def close(self) -> None:
        await self._client.aclose()

    # ── Internal ─────────────────────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=15),
        retry=retry_if_exception_type((httpx.HTTPError, LLMError)),
        before_sleep=before_sleep_log(_tenacity_logger, logging.WARNING),
        reraise=True,
    )
    async def _call_with_retry(
        self,
        prompt: str,
        system: str | None,
        max_tokens: int | None,
        temperature: float | None,
    ) -> str:
        payload = self._build_payload(prompt, system, max_tokens, temperature, stream=False)
        try:
            resp = await self._client.post("/api/generate", json=payload)
            resp.raise_for_status()
            data = resp.json()
            self._circuit.record(True)
            return data["response"]
        except httpx.TimeoutException as e:
            self._circuit.record(False)
            raise LLMTimeoutError(f"Ollama timed out after {self._settings.ollama_timeout_seconds}s") from e
        except httpx.HTTPStatusError as e:
            self._circuit.record(False)
            raise LLMError(f"Ollama HTTP {e.response.status_code}: {e.response.text}") from e
        except Exception as e:
            self._circuit.record(False)
            raise LLMError(str(e)) from e

    async def _stream_call(
        self,
        prompt: str,
        system: str | None,
        max_tokens: int | None,
        temperature: float | None,
    ) -> AsyncIterator[str]:
        payload = self._build_payload(prompt, system, max_tokens, temperature, stream=True)
        try:
            async with self._client.stream("POST", "/api/generate", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if line:
                        chunk = json.loads(line)
                        if token := chunk.get("response"):
                            yield token
                        if chunk.get("done"):
                            self._circuit.record(True)
                            return
        except Exception as e:
            self._circuit.record(False)
            raise LLMError(str(e)) from e

    def _build_payload(
        self,
        prompt: str,
        system: str | None,
        max_tokens: int | None,
        temperature: float | None,
        stream: bool,
    ) -> dict:
        settings = self._settings
        payload: dict = {
            "model": settings.ollama_model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": temperature if temperature is not None else settings.llm_temperature,
                "num_predict": max_tokens if max_tokens is not None else settings.llm_max_tokens,
            },
        }
        if system:
            payload["system"] = system
        return payload

    def _mock_response(self, prompt: str) -> str:
        """
        Returns a realistic mock JSON response for development.
        Shape matches what the AI Enhancement prompt expects.
        """
        logger.debug("mock_llm_response")
        return json.dumps({
            "services": [
                {"name": "api", "responsibility": "Core REST API", "tech_stack": ["FastAPI", "Python"], "scales_independently": True, "min_replicas": 1, "max_replicas": 4},
                {"name": "worker", "responsibility": "Background job processing", "tech_stack": ["Celery", "Redis"], "scales_independently": True, "min_replicas": 1, "max_replicas": 3},
            ],
            "data_stores": [
                {"name": "Primary DB", "engine": "postgresql", "purpose": "Relational data storage", "replication": False, "notes": "Start with single instance; add replica at 10k users"},
                {"name": "Cache", "engine": "redis", "purpose": "Sessions, caching, rate limiting", "replication": False, "notes": ""},
            ],
            "communication_patterns": [
                {"from_service": "api", "to_service": "postgresql", "protocol": "TCP", "pattern": "sync", "notes": ""},
                {"from_service": "api", "to_service": "worker", "protocol": "Redis Queue", "pattern": "async", "notes": ""},
            ],
            "scaling_strategy": [
                {"current_tier": "0–1k users", "next_trigger": "p95 latency > 500ms or CPU > 70%", "actions": ["Scale API horizontally", "Add DB read replica"]},
                {"current_tier": "1k–10k users", "next_trigger": "DB connections > 80% pool", "actions": ["Add PgBouncer", "Enable Redis caching layer"]},
            ],
            "trade_offs": [
                {"decision": "Modular Monolith over Microservices", "pros": ["Simpler ops", "Faster development", "Single deploy unit"], "cons": ["Harder to scale independently", "Tech stack locked"], "alternatives": ["Microservices at 50k+ users"]},
            ],
            "cost_estimate": {
                "monthly_usd_low": 30,
                "monthly_usd_high": 80,
                "biggest_cost_driver": "VPS / compute",
                "notes": "Hetzner CX31 + managed PostgreSQL. Scales to ~$200/mo at 10k users.",
            },
        })
