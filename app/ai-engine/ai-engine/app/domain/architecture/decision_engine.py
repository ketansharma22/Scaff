"""
Architecture Decision Engine
─────────────────────────────
Deterministic, zero-LLM rule evaluation.
Rules are priority-ordered dataclasses; first match per category wins
(unless rule.accumulate is True).

Adding rules: just append to RULES list. No code changes elsewhere.
"""
from __future__ import annotations

import dataclasses
from typing import Callable

from app.core.logging import get_logger
from app.domain.requirements.models import RequirementsSpec, TrafficPattern, BudgetTier
from app.domain.architecture.models import (
    DecisionResult, ArchitecturePattern, DeploymentModel,
)

logger = get_logger(__name__)


@dataclasses.dataclass
class Rule:
    id: str
    category: str
    priority: int                                 # higher = evaluated first
    condition: Callable[[RequirementsSpec], bool]
    action: Callable[[DecisionResult, RequirementsSpec], None]
    accumulate: bool = False                      # if True, rule always runs (doesn't block lower ones)
    description: str = ""


# ─────────────────────────────────────────────────────────────────────────────
# RULE DEFINITIONS
# ─────────────────────────────────────────────────────────────────────────────

def _rules() -> list[Rule]:
    return [

        # ── Architecture Pattern ──────────────────────────────────────────────
        Rule(
            id="R010", category="architecture_pattern", priority=100,
            description="Large scale or many features → microservices",
            condition=lambda s: s.user_scale.target > 100_000 or len(s.features) > 8,
            action=lambda r, s: (
                setattr(r, "architecture_pattern", ArchitecturePattern.MICROSERVICES),
                r.add_service("api_gateway", "auth_service", "notification_service"),
                r.add_recommendation(
                    "Microservices justified at this scale. "
                    "Ensure each service owns its data — no shared DBs."
                ),
            ),
        ),
        Rule(
            id="R011", category="architecture_pattern", priority=80,
            description="Small team + medium scale → modular monolith",
            condition=lambda s: s.team_size <= 8 and s.user_scale.target <= 50_000,
            action=lambda r, s: (
                setattr(r, "architecture_pattern", ArchitecturePattern.MODULAR_MONOLITH),
                r.add_recommendation(
                    "Modular monolith is optimal for your team size. "
                    "Design clear module boundaries now to ease future extraction."
                ),
            ),
        ),
        Rule(
            id="R012", category="architecture_pattern", priority=60,
            description="Solo / bootstrap with low scale → monolith",
            condition=lambda s: s.team_size <= 2 and s.user_scale.target <= 5_000,
            action=lambda r, s: (
                setattr(r, "architecture_pattern", ArchitecturePattern.MONOLITH),
                r.add_recommendation(
                    "Start simple. A well-structured monolith will get you to 10k users."
                ),
            ),
        ),

        # ── Deployment Model ──────────────────────────────────────────────────
        Rule(
            id="R020", category="deployment_model", priority=100,
            description="High scale or high availability → Kubernetes",
            condition=lambda s: s.user_scale.target > 50_000 or s.availability_sla_percent >= 99.9,
            action=lambda r, s: (
                setattr(r, "deployment_model", DeploymentModel.KUBERNETES),
                r.add_recommendation(
                    "Kubernetes with HPA. Set PodDisruptionBudget to maintain availability during deploys."
                ),
            ),
        ),
        Rule(
            id="R021", category="deployment_model", priority=80,
            description="Growth stage → ECS Fargate",
            condition=lambda s: 10_000 < s.user_scale.target <= 50_000,
            action=lambda r, s: (
                setattr(r, "deployment_model", DeploymentModel.ECS_FARGATE),
                r.add_recommendation("ECS Fargate removes cluster management overhead. Migrate to EKS at 50k users."),
            ),
        ),
        Rule(
            id="R022", category="deployment_model", priority=60,
            description="Small scale → Docker Compose / single host",
            condition=lambda s: s.user_scale.target <= 10_000,
            action=lambda r, s: (
                setattr(r, "deployment_model", DeploymentModel.DOCKER_COMPOSE),
                r.add_recommendation("Docker Compose on a single VPS (Hetzner CX31 ~€10/mo) is sufficient to start."),
            ),
        ),

        # ── Primary Database ──────────────────────────────────────────────────
        Rule(
            id="R030", category="primary_db", priority=100,
            description="Relational data or auth feature → PostgreSQL",
            condition=lambda s: s.data_characteristics.relational or "auth" in s.features,
            action=lambda r, s: (
                setattr(r, "primary_db", "postgresql"),
                r.data_stores.append("postgresql"),
                r.add_recommendation(
                    "PostgreSQL with connection pooling (PgBouncer). "
                    "Add read replica when read QPS exceeds 500."
                ),
            ),
        ),
        Rule(
            id="R031", category="primary_db", priority=80,
            description="Unstructured / document-heavy data → MongoDB",
            condition=lambda s: s.data_characteristics.unstructured and not s.data_characteristics.relational,
            action=lambda r, s: (
                setattr(r, "primary_db", "mongodb"),
                r.data_stores.append("mongodb"),
                r.add_recommendation(
                    "Use MongoDB Atlas for managed ops. "
                    "Design schema with future query patterns in mind — no joins!"
                ),
            ),
        ),

        # ── Cache ─────────────────────────────────────────────────────────────
        Rule(
            id="R040", category="cache", priority=100,
            description="Read-heavy or bursty traffic → Redis cache",
            condition=lambda s: (
                s.data_characteristics.read_heavy
                or s.traffic_pattern == TrafficPattern.BURSTY
                or s.user_scale.target > 5_000
            ),
            action=lambda r, s: (
                setattr(r, "cache", "redis"),
                r.data_stores.append("redis"),
                r.add_recommendation(
                    "Redis for caching + sessions. TTL strategy: "
                    "user sessions 24h, computed results 5min, rate limit counters 1min."
                ),
            ),
        ),

        # ── Real-time Transport ───────────────────────────────────────────────
        Rule(
            id="R050", category="realtime", priority=100,
            description="Realtime features → WebSockets + message bus",
            condition=lambda s: (
                "realtime_notifications" in s.features
                or s.traffic_pattern == TrafficPattern.REALTIME
            ),
            action=lambda r, s: (
                setattr(r, "realtime_transport", "websockets"),
                setattr(r, "message_bus", "redis_streams"),
                r.data_stores.append("redis_streams"),
                r.add_service("notification_service"),
                r.add_recommendation(
                    "WebSocket connections via sticky sessions (or Redis pub/sub fan-out). "
                    "Upgrade message bus to Kafka at >50k concurrent connections."
                ),
            ),
        ),
        Rule(
            id="R051", category="realtime", priority=80,
            description="Background jobs but no realtime → Redis queue",
            condition=lambda s: "background_jobs" in s.features and s.traffic_pattern != TrafficPattern.REALTIME,
            action=lambda r, s: (
                setattr(r, "message_bus", "redis_queue"),
                r.add_recommendation("Celery + Redis for background jobs. Add dedicated worker pods."),
            ),
        ),

        # ── Search ────────────────────────────────────────────────────────────
        Rule(
            id="R060", category="search", priority=100,
            description="Search feature + meaningful data volume → OpenSearch",
            condition=lambda s: "search" in s.features and s.data_characteristics.estimated_db_size_gb > 1,
            action=lambda r, s: (
                setattr(r, "search_engine", "opensearch"),
                r.data_stores.append("opensearch"),
                r.add_recommendation(
                    "Sync PostgreSQL → OpenSearch via Debezium CDC. "
                    "Start with t3.small.search; scale vertically before horizontally."
                ),
            ),
        ),
        Rule(
            id="R061", category="search", priority=80,
            description="Search feature + small data → PostgreSQL full-text",
            condition=lambda s: "search" in s.features and s.data_characteristics.estimated_db_size_gb <= 1,
            action=lambda r, s: (
                setattr(r, "search_engine", "postgresql_fts"),
                r.add_recommendation(
                    "PostgreSQL full-text search (tsvector/tsquery) is sufficient at this scale. "
                    "Migrate to OpenSearch when index size exceeds 1GB."
                ),
            ),
        ),

        # ── CDN ───────────────────────────────────────────────────────────────
        Rule(
            id="R070", category="cdn", priority=100,
            description="File upload or large user base → CDN required",
            condition=lambda s: "file_upload" in s.features or s.user_scale.target > 10_000,
            accumulate=True,
            action=lambda r, s: (
                setattr(r, "cdn_required", True),
                r.add_recommendation("Cloudflare CDN for static assets and S3-backed file delivery."),
            ),
        ),

        # ── Service additions (accumulate=True: always run) ───────────────────
        Rule(
            id="R080", category="services", priority=100,
            description="Auth feature → always add auth service/module",
            condition=lambda s: "auth" in s.features,
            accumulate=True,
            action=lambda r, s: r.add_service("auth_module"),
        ),
        Rule(
            id="R081", category="services", priority=100,
            description="Payments → billing service",
            condition=lambda s: "payments" in s.features,
            accumulate=True,
            action=lambda r, s: (
                r.add_service("billing_service"),
                r.add_recommendation("Use Stripe. Never store raw card data — PCI scope isolation."),
            ),
        ),
        Rule(
            id="R082", category="services", priority=100,
            description="Multi-tenancy → tenant isolation pattern",
            condition=lambda s: "multi_tenancy" in s.features,
            accumulate=True,
            action=lambda r, s: (
                r.add_service("tenant_middleware"),
                r.add_recommendation(
                    "Row-level security in PostgreSQL for tenant isolation. "
                    "Set app.current_org_id at connection acquire."
                ),
            ),
        ),

        # ── High availability recommendations ─────────────────────────────────
        Rule(
            id="R090", category="ha", priority=100,
            description="SLA >= 99.9% → HA recommendations",
            condition=lambda s: s.availability_sla_percent >= 99.9,
            accumulate=True,
            action=lambda r, s: (
                r.add_recommendation("RDS Multi-AZ + automated failover for 99.9% DB availability."),
                r.add_recommendation("Deploy across minimum 2 availability zones."),
                r.add_recommendation("Health checks + automated pod replacement in K8s."),
            ),
        ),

        # ── Compliance ────────────────────────────────────────────────────────
        Rule(
            id="R100", category="compliance", priority=100,
            description="GDPR compliance requirements",
            condition=lambda s: "GDPR" in s.compliance,
            accumulate=True,
            action=lambda r, s: (
                r.add_recommendation("Data residency in EU region (eu-west-1 / europe-west1)."),
                r.add_recommendation("Implement right-to-erasure: soft delete + periodic purge job."),
                r.add_recommendation("Encrypt PII at rest (PostgreSQL column encryption or pgcrypto)."),
            ),
        ),
        Rule(
            id="R101", category="compliance", priority=100,
            description="HIPAA compliance requirements",
            condition=lambda s: "HIPAA" in s.compliance,
            accumulate=True,
            action=lambda r, s: (
                r.add_recommendation("HIPAA: Enable audit logging for all PHI access."),
                r.add_recommendation("HIPAA: Use AWS HIPAA-eligible services only."),
                r.add_recommendation("HIPAA: BAA required with all data processors."),
                r.add_recommendation("HIPAA: Encrypt all data in transit (TLS 1.2+) and at rest (AES-256)."),
            ),
        ),
    ]


# ─────────────────────────────────────────────────────────────────────────────
# ENGINE
# ─────────────────────────────────────────────────────────────────────────────

class ArchitectureDecisionEngine:

    def __init__(self):
        self._rules = sorted(_rules(), key=lambda r: r.priority, reverse=True)

    def evaluate(self, spec: RequirementsSpec) -> DecisionResult:
        result = DecisionResult()
        decided: set[str] = set()

        for rule in self._rules:
            try:
                if not rule.condition(spec):
                    continue
            except Exception as e:
                logger.warning("rule_condition_error", rule_id=rule.id, error=str(e))
                continue

            # For accumulate rules: always fire
            # For regular rules: only fire if category not yet decided
            if not rule.accumulate and rule.category in decided:
                continue

            try:
                rule.action(result, spec)
                result.applied_rules.append(rule.id)
                if not rule.accumulate:
                    decided.add(rule.category)
                logger.debug("rule_fired", rule_id=rule.id, category=rule.category)
            except Exception as e:
                logger.error("rule_action_error", rule_id=rule.id, error=str(e))

        logger.info(
            "decision_engine_complete",
            pattern=result.architecture_pattern,
            deployment=result.deployment_model,
            rules_fired=len(result.applied_rules),
        )
        return result
