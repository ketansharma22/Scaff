"""
Groq LLM Client  — FREE tier, no credit card needed
────────────────────────────────────────────────────
Sign up at console.groq.com, create an API key, set GROQ_API_KEY=...

Free limits (as of 2025):
  - llama-3.3-70b-versatile: 14,400 req/day, 6,000 req/hour
  - Response speed: ~500 tokens/sec (much faster than local Ollama on CPU)

Same interface as OllamaClient — drop-in replacement.
"""
from __future__ import annotations

import json
import hashlib
import logging
from typing import AsyncIterator

import httpx
from tenacity import (
    retry, stop_after_attempt, wait_exponential,
    retry_if_exception_type, before_sleep_log,
)

from app.core.config import get_settings
from app.core.logging import get_logger
from app.infra.llm.ollama_client import LLMError, LLMTimeoutError, CircuitBreaker

logger = get_logger(__name__)
_tenacity_logger = logging.getLogger("tenacity")

GROQ_BASE_URL = "https://api.groq.com/openai/v1"

# Groq supports OpenAI-compatible embeddings endpoint (text-embedding-ada-002 equivalent)
# We fall back to deterministic mock embeddings since Groq doesn't host embed models
EMBED_FALLBACK = True


class GroqClient:
    """
    Drop-in replacement for OllamaClient using Groq's free API.
    Implements the same .complete(), .stream(), .embed(), .close() interface.
    """

    def __init__(self):
        self._settings = get_settings()
        self._circuit = CircuitBreaker()
        if not self._settings.groq_api_key:
            logger.warning(
                "groq_api_key_missing",
                message="GROQ_API_KEY not set. Set it in .env to use Groq. Falling back to mock mode.",
            )
        self._client = httpx.AsyncClient(
            base_url=GROQ_BASE_URL,
            timeout=self._settings.groq_timeout_seconds,
            headers={
                "Authorization": f"Bearer {self._settings.groq_api_key}",
                "Content-Type": "application/json",
            },
        )

    # ── Public interface (same as OllamaClient) ───────────────────────────────

    async def complete(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> str:
        if self._settings.mock_mode or not self._settings.groq_api_key:
            return self._mock_response(prompt)

        if self._circuit.is_open():
            raise LLMError("Groq circuit breaker open — too many recent failures")

        return await self._call_with_retry(prompt, system, max_tokens, temperature)

    async def stream(
        self,
        prompt: str,
        *,
        system: str | None = None,
        max_tokens: int | None = None,
        temperature: float | None = None,
    ) -> AsyncIterator[str]:
        if self._settings.mock_mode or not self._settings.groq_api_key:
            yield self._mock_response(prompt)
            return

        if self._circuit.is_open():
            raise LLMError("Groq circuit breaker open")

        async for chunk in self._stream_call(prompt, system, max_tokens, temperature):
            yield chunk

    async def embed(self, text: str) -> list[float]:
        """
        Groq doesn't host embedding models, so we use deterministic
        keyword-based embeddings. Good enough for RAG in mock/free mode.
        For production embeddings use: OpenAI, Voyage AI (free tier),
        or Jina AI (free tier) — all have free plans.
        """
        if self._settings.mock_mode or EMBED_FALLBACK:
            return self._deterministic_embed(text)

        # If you add an embedding provider later, put it here
        return self._deterministic_embed(text)

    async def close(self) -> None:
        await self._client.aclose()

    # ── Internal ──────────────────────────────────────────────────────────────

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
            resp = await self._client.post("/chat/completions", json=payload)
            resp.raise_for_status()
            data = resp.json()
            self._circuit.record(True)
            return data["choices"][0]["message"]["content"]
        except httpx.TimeoutException as e:
            self._circuit.record(False)
            raise LLMTimeoutError(f"Groq timed out after {self._settings.groq_timeout_seconds}s") from e
        except httpx.HTTPStatusError as e:
            self._circuit.record(False)
            body = e.response.text
            # Rate limit hit — wait and retry
            if e.response.status_code == 429:
                raise LLMError(f"Groq rate limit hit: {body}") from e
            raise LLMError(f"Groq HTTP {e.response.status_code}: {body}") from e
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
            async with self._client.stream("POST", "/chat/completions", json=payload) as resp:
                resp.raise_for_status()
                async for line in resp.aiter_lines():
                    if not line or line == "data: [DONE]":
                        continue
                    if line.startswith("data: "):
                        try:
                            chunk = json.loads(line[6:])
                            delta = chunk["choices"][0].get("delta", {})
                            if content := delta.get("content"):
                                yield content
                        except (json.JSONDecodeError, KeyError, IndexError):
                            continue
            self._circuit.record(True)
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
        s = self._settings
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        return {
            "model": s.groq_model,
            "messages": messages,
            "stream": stream,
            "temperature": temperature if temperature is not None else s.llm_temperature,
            "max_tokens": max_tokens if max_tokens is not None else s.llm_max_tokens,
        }

    def _deterministic_embed(self, text: str) -> list[float]:
        """
        Deterministic keyword-overlap embeddings.
        Not as good as neural embeddings but works for RAG with a small KB.
        """
        size = self._settings.qdrant_vector_size
        h = int(hashlib.sha256(text.lower().encode()).hexdigest(), 16)
        # Mix hash with keyword signals for better semantic grouping
        keywords = {
            "microservices": 0, "monolith": 1, "postgresql": 2, "mongodb": 3,
            "redis": 4, "kafka": 5, "kubernetes": 6, "docker": 7,
            "auth": 8, "payments": 9, "search": 10, "realtime": 11,
            "cache": 12, "queue": 13, "scale": 14, "hipaa": 15,
        }
        vec = [(((h >> (i * 4)) & 0xF) / 15.0) for i in range(size)]
        # Boost relevant keyword dimensions
        text_lower = text.lower()
        for kw, dim in keywords.items():
            if kw in text_lower and dim < size:
                vec[dim] = min(1.0, vec[dim] + 0.4)
        return vec

    def _mock_response(self, prompt: str) -> str:
        logger.debug("groq_mock_response")
        return json.dumps({
            "services": [
                {"name": "api", "responsibility": "Core REST API gateway", "tech_stack": ["FastAPI", "Python 3.12"], "scales_independently": True, "min_replicas": 1, "max_replicas": 4},
                {"name": "worker", "responsibility": "Background job processing", "tech_stack": ["Celery", "Redis"], "scales_independently": True, "min_replicas": 1, "max_replicas": 3},
            ],
            "data_stores": [
                {"name": "Primary DB", "engine": "postgresql", "purpose": "Relational data — users, billing, workspaces", "replication": False, "notes": "Add read replica at 10k users"},
                {"name": "Cache", "engine": "redis", "purpose": "Sessions, rate limiting, job queues", "replication": False, "notes": "Upstash free tier works for <10k req/day"},
            ],
            "communication_patterns": [
                {"from_service": "api", "to_service": "postgresql", "protocol": "TCP/SQL", "pattern": "sync", "notes": "Connection pooling via PgBouncer at scale"},
                {"from_service": "api", "to_service": "worker", "protocol": "Redis Queue", "pattern": "async", "notes": "Fire-and-forget for emails, webhooks"},
            ],
            "scaling_strategy": [
                {"current_tier": "0–1k users", "next_trigger": "p95 latency > 500ms or CPU > 70%", "actions": ["Scale API replicas horizontally", "Enable Redis caching for hot paths"]},
                {"current_tier": "1k–10k users", "next_trigger": "DB connection pool > 80%", "actions": ["Add PgBouncer", "Add PostgreSQL read replica", "Move search to dedicated service"]},
                {"current_tier": "10k–100k users", "next_trigger": "Single-region latency > 200ms", "actions": ["Multi-region deployment", "CDN for static assets", "Consider splitting into microservices"]},
            ],
            "trade_offs": [
                {"decision": "Modular Monolith over Microservices", "pros": ["Simple ops for small team", "Single deploy", "Shared DB transactions", "Fast iteration"], "cons": ["Harder to scale individual components", "Tech stack lock-in", "Deployment bottleneck"], "alternatives": ["Split into microservices at 50k+ users when team grows"]},
            ],
            "cost_estimate": {
                "monthly_usd_low": 0,
                "monthly_usd_high": 5,
                "biggest_cost_driver": "Railway compute ($5 free credit/month)",
                "notes": "Vercel free + Railway free tier + Supabase free + Upstash free + Groq free = $0/month until serious traffic.",
            },
        })
