"""
RequirementsParser: converts free-text → RequirementsSpec

Pipeline:
  1. heuristic_extract()  — fast regex / keyword pass, returns partial spec + confidence
  2. if confidence < threshold → llm_enrich() — LLM fills gaps
  3. validate() and return
"""
from __future__ import annotations

import re
from app.core.logging import get_logger
from app.domain.requirements.models import (
    RequirementsSpec, UserScale, DataCharacteristics,
    TechPreferences, TrafficPattern, BudgetTier, GrowthRate,
    KNOWN_FEATURES,
)

logger = get_logger(__name__)

# ── Scale extraction patterns ─────────────────────────────────────────────────
_SCALE_PATTERNS = [
    (r"(\d+)\s*k\s*(users|customers|mau|dau)", lambda m: int(m.group(1)) * 1_000),
    (r"(\d+)\s*m\s*(users|customers|mau|dau)", lambda m: int(m.group(1)) * 1_000_000),
    (r"(\d[\d,]*)\s*(users|customers|mau|dau)", lambda m: int(m.group(1).replace(",", ""))),
    (r"(\d+)\s*million", lambda m: int(m.group(1)) * 1_000_000),
]

# ── Feature keyword map ───────────────────────────────────────────────────────
_FEATURE_KEYWORDS: dict[str, list[str]] = {
    "auth": ["login", "auth", "signup", "sign up", "register", "jwt", "oauth", "sso", "password"],
    "file_upload": ["upload", "file", "image", "video", "media", "s3", "storage", "attachment"],
    "search": ["search", "full.text", "elastic", "opensearch", "solr", "find", "query"],
    "realtime_notifications": ["realtime", "real-time", "websocket", "ws", "live", "push notification", "socket.io", "streaming"],
    "payments": ["payment", "billing", "stripe", "subscription", "invoice", "checkout", "plan"],
    "email": ["email", "smtp", "sendgrid", "ses", "mailgun", "notification", "transactional"],
    "api_public": ["public api", "rest api", "graphql", "openapi", "swagger", "third.party", "integration"],
    "admin_panel": ["admin", "dashboard", "cms", "backoffice", "back office", "management panel"],
    "analytics": ["analytics", "tracking", "metrics", "mixpanel", "amplitude", "segment", "reporting"],
    "multi_tenancy": ["multi.tenant", "saas", "organization", "workspace", "team", "white.label"],
    "background_jobs": ["background", "cron", "job", "queue", "scheduled", "async task", "worker"],
    "webhooks": ["webhook", "callback", "event", "trigger", "notify external"],
    "rate_limiting": ["rate limit", "throttle", "quota", "abuse", "ddos"],
}

_TRAFFIC_KEYWORDS = {
    TrafficPattern.REALTIME: ["realtime", "real-time", "live", "streaming", "websocket"],
    TrafficPattern.BURSTY: ["bursty", "spike", "viral", "flash sale", "peak", "campaign"],
}

_BUDGET_KEYWORDS = {
    BudgetTier.BOOTSTRAP: ["bootstrap", "solo", "side project", "weekend", "free"],
    BudgetTier.ENTERPRISE: ["enterprise", "fortune 500", "large company", "compliance", "soc2"],
    BudgetTier.GROWTH: ["series", "funded", "growth", "scale-up"],
}

_COMPLIANCE_KEYWORDS = {
    "GDPR": ["gdpr", "european", "eu ", "privacy"],
    "HIPAA": ["hipaa", "health", "medical", "patient", "ehr", "phi"],
    "SOC2": ["soc2", "soc 2", "compliance", "enterprise audit"],
    "PCI": ["pci", "payment card", "credit card"],
}


class RequirementsParser:
    CONFIDENCE_THRESHOLD = 0.6

    def __init__(self, llm_client=None):
        """
        llm_client: optional LLMClient for enrichment when confidence is low.
        If None, heuristic-only mode.
        """
        self._llm = llm_client

    async def parse(self, raw_text: str) -> RequirementsSpec:
        text = raw_text.strip()
        if len(text) > 8192:
            text = text[:8192]
            logger.warning("input_truncated", original_len=len(raw_text))

        spec, confidence = self._heuristic_extract(text)

        logger.info("heuristic_parse_done", confidence=confidence, features=spec.features)

        if confidence < self.CONFIDENCE_THRESHOLD and self._llm is not None:
            logger.info("confidence_low_triggering_llm", confidence=confidence)
            spec = await self._llm_enrich(spec, text)
            spec.parse_method = "llm"
        else:
            spec.parse_method = "heuristic"

        spec.parse_confidence = confidence
        return spec

    # ── Heuristic extraction ─────────────────────────────────────────────────

    def _heuristic_extract(self, text: str) -> tuple[RequirementsSpec, float]:
        lower = text.lower()
        signals = 0
        total_signals = 7  # number of detection categories

        # 1. Scale
        user_scale, scale_found = self._extract_scale(lower)
        if scale_found:
            signals += 1

        # 2. Features
        features = self._extract_features(lower)
        if features:
            signals += 1

        # 3. Traffic pattern
        traffic = TrafficPattern.STEADY
        for pattern, keywords in _TRAFFIC_KEYWORDS.items():
            if any(kw in lower for kw in keywords):
                traffic = pattern
                signals += 1
                break
        else:
            signals += 0.5  # steady is a valid default

        # 4. Budget tier
        budget = BudgetTier.STARTUP
        for tier, keywords in _BUDGET_KEYWORDS.items():
            if any(kw in lower for kw in keywords):
                budget = tier
                signals += 1
                break
        else:
            signals += 0.5

        # 5. Compliance
        compliance = [tag for tag, kws in _COMPLIANCE_KEYWORDS.items()
                      if any(kw in lower for kw in kws)]
        if compliance:
            signals += 1

        # 6. Team size
        team_size, team_found = self._extract_team_size(lower)
        if team_found:
            signals += 1

        # 7. Data characteristics
        data_chars = self._extract_data_characteristics(lower)
        signals += 0.5

        confidence = min(signals / total_signals, 1.0)

        spec = RequirementsSpec(
            raw_input=text,
            user_scale=user_scale,
            traffic_pattern=traffic,
            features=features,
            data_characteristics=data_chars,
            compliance=compliance,
            team_size=team_size,
            budget_tier=budget,
        )
        return spec, confidence

    def _extract_scale(self, lower: str) -> tuple[UserScale, bool]:
        for pattern, extractor in _SCALE_PATTERNS:
            m = re.search(pattern, lower)
            if m:
                count = extractor(m)
                # Guess current as 10% of target
                current = max(1, count // 10)
                # Guess growth rate from magnitude
                growth = (
                    GrowthRate.HYPERGROWTH if count >= 1_000_000
                    else GrowthRate.FAST if count >= 100_000
                    else GrowthRate.MEDIUM if count >= 10_000
                    else GrowthRate.SLOW
                )
                return UserScale(current=current, target=count, growth_rate=growth), True
        return UserScale(), False

    def _extract_features(self, lower: str) -> list[str]:
        found = []
        for feature, keywords in _FEATURE_KEYWORDS.items():
            if any(re.search(r'\b' + re.escape(kw) + r'\b', lower) for kw in keywords):
                found.append(feature)
        return found

    def _extract_team_size(self, lower: str) -> tuple[int, bool]:
        m = re.search(r'(\d+)\s*(person|people|developer|engineer|member)\s*(team|squad)?', lower)
        if m:
            return int(m.group(1)), True
        if "solo" in lower or "just me" in lower or "single dev" in lower:
            return 1, True
        return 5, False

    def _extract_data_characteristics(self, lower: str) -> DataCharacteristics:
        write_heavy = any(kw in lower for kw in ["write heavy", "write-heavy", "high write", "lots of writes", "insert heavy"])
        read_heavy = any(kw in lower for kw in ["read heavy", "read-heavy", "high read", "mostly reads", "content delivery"])
        unstructured = any(kw in lower for kw in ["unstructured", "document", "mongodb", "nosql", "json store", "blob"])
        non_relational = unstructured or any(kw in lower for kw in ["mongodb", "dynamo", "cassandra", "nosql"])

        return DataCharacteristics(
            write_heavy=write_heavy,
            read_heavy=read_heavy or not write_heavy,  # default to read-heavy
            relational=not non_relational,
            unstructured=unstructured,
        )

    # ── LLM enrichment (called when confidence is low) ───────────────────────

    async def _llm_enrich(self, partial: RequirementsSpec, raw_text: str) -> RequirementsSpec:
        """
        Sends partial spec + raw text to LLM, asks it to fill gaps.
        Returns enriched RequirementsSpec.
        """
        prompt = f"""You are a software architect. Extract structured requirements from the user's description.

USER DESCRIPTION:
{raw_text}

PARTIAL EXTRACTION (fill in gaps, correct mistakes):
{partial.model_dump_json(indent=2)}

Respond with ONLY valid JSON matching this exact schema. No prose, no markdown:
- user_scale: {{current: int, target: int, growth_rate: "2x_12mo"|"5x_12mo"|"10x_12mo"|"50x_12mo"}}
- traffic_pattern: "steady"|"bursty"|"realtime"
- features: array of strings from: {list(KNOWN_FEATURES)}
- data_characteristics: {{write_heavy: bool, read_heavy: bool, relational: bool, unstructured: bool, estimated_db_size_gb: float}}
- compliance: array of strings (e.g. ["GDPR"])
- team_size: int
- budget_tier: "bootstrap"|"startup"|"growth"|"enterprise"
- latency_sla_ms: int
- availability_sla_percent: float
"""
        try:
            response_text = await self._llm.complete(prompt, max_tokens=1024, temperature=0.1)
            import json
            data = json.loads(response_text)
            data["raw_input"] = partial.raw_input
            return RequirementsSpec(**data)
        except Exception as e:
            logger.error("llm_enrich_failed", error=str(e))
            return partial  # fall back to heuristic result
