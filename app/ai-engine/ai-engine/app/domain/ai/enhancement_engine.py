"""
AI Enhancement Engine
──────────────────────
Takes the deterministic DecisionResult and enriches it with:
  1. Relevant patterns / trade-offs from the knowledge base (RAG)
  2. LLM-generated narrative: detailed service specs, trade-off analysis, cost estimate

The raw user input is NEVER injected into prompts.
Only the structured RequirementsSpec JSON is used.
"""
from __future__ import annotations

import json

from app.core.config import get_settings
from app.core.logging import get_logger
from app.domain.requirements.models import RequirementsSpec
from app.domain.architecture.models import (
    ArchitectureBlueprint, DecisionResult,
    ServiceSpec, DataStoreSpec, CommunicationPattern,
    ScalingStrategy, TradeOff, CostEstimate,
)
from app.infra.llm.ollama_client import OllamaClient, LLMError
from app.infra.vector_db.qdrant_store import QdrantStore

logger = get_logger(__name__)

SYSTEM_PROMPT = """You are a senior software architect producing structured JSON output.
Your task: given a requirements specification and a set of architectural decisions, produce
a detailed ArchitectureBlueprint as a JSON object.

RULES:
- Respond with ONLY valid JSON. No markdown, no prose, no code fences.
- Do not include any keys outside the schema below.
- Be specific and actionable — no generic advice.

OUTPUT SCHEMA:
{
  "services": [{"name": str, "responsibility": str, "tech_stack": [str], "scales_independently": bool, "min_replicas": int, "max_replicas": int}],
  "data_stores": [{"name": str, "engine": str, "purpose": str, "replication": bool, "notes": str}],
  "communication_patterns": [{"from_service": str, "to_service": str, "protocol": str, "pattern": str, "notes": str}],
  "scaling_strategy": [{"current_tier": str, "next_trigger": str, "actions": [str]}],
  "trade_offs": [{"decision": str, "pros": [str], "cons": [str], "alternatives": [str]}],
  "cost_estimate": {"monthly_usd_low": int, "monthly_usd_high": int, "biggest_cost_driver": str, "notes": str}
}
"""


def _build_user_prompt(
    spec: RequirementsSpec,
    decision: DecisionResult,
    rag_context: str,
) -> str:
    # Serialize only spec (NOT raw_input — that's never sent to LLM)
    safe_spec = spec.model_dump(exclude={"raw_input"})
    return f"""REQUIREMENTS_SPEC:
{json.dumps(safe_spec, indent=2)}

DECISION_ENGINE_OUTPUT:
{decision.model_dump_json(indent=2)}

RELEVANT_ARCHITECTURE_PATTERNS (from knowledge base):
{rag_context}

Produce the ArchitectureBlueprint JSON now. Be specific to the requirements above.
"""


def _parse_blueprint_response(
    raw: str,
    decision: DecisionResult,
) -> ArchitectureBlueprint:
    """Parse LLM JSON response into ArchitectureBlueprint. Falls back gracefully."""
    try:
        # Strip any accidental markdown fences
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            lines = cleaned.split("\n")
            cleaned = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

        data = json.loads(cleaned)

        return ArchitectureBlueprint(
            architecture_pattern=decision.architecture_pattern,
            deployment_model=decision.deployment_model,
            primary_db=decision.primary_db,
            cache=decision.cache,
            search_engine=decision.search_engine,
            message_bus=decision.message_bus,
            realtime_transport=decision.realtime_transport,
            applied_rules=decision.applied_rules,
            recommendations=decision.recommendations,
            enhancement_method="llm_enhanced",
            services=[ServiceSpec(**s) for s in data.get("services", [])],
            data_stores=[DataStoreSpec(**d) for d in data.get("data_stores", [])],
            communication_patterns=[CommunicationPattern(**c) for c in data.get("communication_patterns", [])],
            scaling_strategy=[ScalingStrategy(**s) for s in data.get("scaling_strategy", [])],
            trade_offs=[TradeOff(**t) for t in data.get("trade_offs", [])],
            cost_estimate=CostEstimate(**data["cost_estimate"]) if "cost_estimate" in data else None,
        )
    except Exception as e:
        logger.error("blueprint_parse_failed", error=str(e), raw_preview=raw[:200])
        raise


def _decision_only_blueprint(decision: DecisionResult) -> ArchitectureBlueprint:
    """Fallback: return decision engine result only, no LLM enrichment."""
    return ArchitectureBlueprint(
        architecture_pattern=decision.architecture_pattern,
        deployment_model=decision.deployment_model,
        primary_db=decision.primary_db,
        cache=decision.cache,
        search_engine=decision.search_engine,
        message_bus=decision.message_bus,
        realtime_transport=decision.realtime_transport,
        applied_rules=decision.applied_rules,
        recommendations=decision.recommendations,
        enhancement_method="rule_engine_only",
        services=[ServiceSpec(name=s, responsibility="", tech_stack=[]) for s in decision.services],
        data_stores=[DataStoreSpec(name=ds, engine=ds, purpose="") for ds in decision.data_stores],
    )


class AIEnhancementEngine:

    def __init__(self, llm: OllamaClient, vector_store: QdrantStore):
        self._llm = llm
        self._store = vector_store
        self._settings = get_settings()

    async def enhance(
        self,
        spec: RequirementsSpec,
        decision: DecisionResult,
    ) -> ArchitectureBlueprint:
        """
        Main entry point.
        Returns fully enriched ArchitectureBlueprint.
        Falls back to decision-only blueprint on LLM failure.
        """
        # Step 1: Retrieve relevant patterns from knowledge base
        rag_context = await self._retrieve_context(spec, decision)
        logger.info("rag_context_retrieved", chars=len(rag_context))

        # Step 2: LLM enrichment
        try:
            prompt = _build_user_prompt(spec, decision, rag_context)
            raw = await self._llm.complete(
                prompt,
                system=SYSTEM_PROMPT,
                temperature=0.2,
                max_tokens=self._settings.llm_max_tokens,
            )
            blueprint = _parse_blueprint_response(raw, decision)
            logger.info("llm_enhancement_complete", method=blueprint.enhancement_method)
            return blueprint

        except LLMError as e:
            logger.error("llm_enhancement_failed_using_fallback", error=str(e))
            return _decision_only_blueprint(decision)
        except Exception as e:
            logger.error("enhancement_unexpected_error", error=str(e))
            return _decision_only_blueprint(decision)

    async def stream_enhance(
        self,
        spec: RequirementsSpec,
        decision: DecisionResult,
    ):
        """Async generator — yields token chunks for SSE streaming."""
        rag_context = await self._retrieve_context(spec, decision)
        prompt = _build_user_prompt(spec, decision, rag_context)

        try:
            async for chunk in self._llm.stream(
                prompt,
                system=SYSTEM_PROMPT,
                temperature=0.2,
            ):
                yield chunk
        except LLMError as e:
            logger.error("stream_enhance_failed", error=str(e))
            # Yield a fallback JSON chunk
            yield _decision_only_blueprint(decision).model_dump_json()

    async def _retrieve_context(
        self,
        spec: RequirementsSpec,
        decision: DecisionResult,
    ) -> str:
        """Build RAG query from spec + decision, retrieve top chunks, format."""
        # Craft a focused semantic query
        query_parts = [
            f"architecture pattern {decision.architecture_pattern.value}",
            f"deployment {decision.deployment_model.value}",
        ]
        if spec.features:
            query_parts.append(f"features: {', '.join(spec.features[:5])}")
        if decision.primary_db:
            query_parts.append(f"database {decision.primary_db}")
        query = " ".join(query_parts)

        results = await self._store.search(
            query=query,
            top_k=self._settings.rag_top_k,
            category_filter=["patterns", "tradeoffs", "scaling"],
        )

        if not results:
            return "No relevant patterns found in knowledge base."

        # Format and token-budget the context
        sections = []
        total_chars = 0
        max_chars = self._settings.rag_max_context_tokens * 4  # ~4 chars/token

        for r in results:
            section = f"[{r.category.upper()}] {r.title}\n{r.content}"
            if total_chars + len(section) > max_chars:
                break
            sections.append(section)
            total_chars += len(section)

        return "\n\n---\n\n".join(sections)
