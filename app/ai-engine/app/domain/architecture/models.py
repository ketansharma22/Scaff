from __future__ import annotations
from enum import Enum
from pydantic import BaseModel, Field


class ArchitecturePattern(str, Enum):
    MONOLITH = "monolith"
    MODULAR_MONOLITH = "modular_monolith"
    MICROSERVICES = "microservices"
    SERVERLESS = "serverless"


class DeploymentModel(str, Enum):
    DOCKER_COMPOSE = "docker_compose"
    ECS_FARGATE = "ecs_fargate"
    KUBERNETES = "kubernetes"
    SERVERLESS = "serverless"


class ServiceSpec(BaseModel):
    name: str
    responsibility: str
    tech_stack: list[str] = Field(default_factory=list)
    scales_independently: bool = True
    min_replicas: int = 1
    max_replicas: int = 4


class DataStoreSpec(BaseModel):
    name: str
    engine: str         # postgresql, redis, qdrant, s3, opensearch, ...
    purpose: str
    replication: bool = False
    notes: str = ""


class CommunicationPattern(BaseModel):
    from_service: str
    to_service: str
    protocol: str       # REST, gRPC, WebSocket, Redis Streams, ...
    pattern: str        # sync, async, pub-sub
    notes: str = ""


class ScalingStrategy(BaseModel):
    current_tier: str
    next_trigger: str
    actions: list[str] = Field(default_factory=list)


class TradeOff(BaseModel):
    decision: str
    pros: list[str] = Field(default_factory=list)
    cons: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)


class CostEstimate(BaseModel):
    monthly_usd_low: int
    monthly_usd_high: int
    biggest_cost_driver: str
    notes: str = ""


# ── Decision Engine output ────────────────────────────────────────────────────

class DecisionResult(BaseModel):
    """Output of the deterministic rule engine."""
    architecture_pattern: ArchitecturePattern = ArchitecturePattern.MODULAR_MONOLITH
    deployment_model: DeploymentModel = DeploymentModel.DOCKER_COMPOSE
    primary_db: str = "postgresql"
    cache: str | None = None
    search_engine: str | None = None
    message_bus: str | None = None
    realtime_transport: str | None = None
    cdn_required: bool = False

    services: list[str] = Field(default_factory=list)
    data_stores: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    applied_rules: list[str] = Field(default_factory=list)

    def add_service(self, *names: str) -> None:
        for n in names:
            if n not in self.services:
                self.services.append(n)

    def add_recommendation(self, text: str) -> None:
        if text not in self.recommendations:
            self.recommendations.append(text)


# ── Full blueprint (enriched by LLM) ─────────────────────────────────────────

class ArchitectureBlueprint(BaseModel):
    """
    Final output delivered to the user.
    Decision result + LLM-added narrative, trade-offs, and scaling strategy.
    """
    # Core decisions (from rule engine)
    architecture_pattern: ArchitecturePattern
    deployment_model: DeploymentModel
    primary_db: str
    cache: str | None = None
    search_engine: str | None = None
    message_bus: str | None = None
    realtime_transport: str | None = None

    # Detailed specs (LLM enriched)
    services: list[ServiceSpec] = Field(default_factory=list)
    data_stores: list[DataStoreSpec] = Field(default_factory=list)
    communication_patterns: list[CommunicationPattern] = Field(default_factory=list)
    scaling_strategy: list[ScalingStrategy] = Field(default_factory=list)
    trade_offs: list[TradeOff] = Field(default_factory=list)
    cost_estimate: CostEstimate | None = None

    # Metadata
    applied_rules: list[str] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    enhancement_method: str = "rule_engine_only"  # or "llm_enhanced" or "mock"
