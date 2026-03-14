from __future__ import annotations
from enum import Enum
from typing import Annotated
from pydantic import BaseModel, Field


class TrafficPattern(str, Enum):
    STEADY = "steady"
    BURSTY = "bursty"
    REALTIME = "realtime"


class GrowthRate(str, Enum):
    SLOW = "2x_12mo"
    MEDIUM = "5x_12mo"
    FAST = "10x_12mo"
    HYPERGROWTH = "50x_12mo"


class BudgetTier(str, Enum):
    BOOTSTRAP = "bootstrap"
    STARTUP = "startup"
    GROWTH = "growth"
    ENTERPRISE = "enterprise"


class UserScale(BaseModel):
    current: int = Field(default=100, ge=1)
    target: int = Field(default=10_000, ge=1)
    growth_rate: GrowthRate = GrowthRate.MEDIUM


class DataCharacteristics(BaseModel):
    write_heavy: bool = False
    read_heavy: bool = True
    relational: bool = True
    unstructured: bool = False
    estimated_db_size_gb: float = Field(default=10.0, ge=0)


class TechPreferences(BaseModel):
    preferred: list[str] = Field(default_factory=list)
    avoid: list[str] = Field(default_factory=list)


# All recognized feature flags
KNOWN_FEATURES = {
    "auth", "file_upload", "search", "realtime_notifications",
    "payments", "email", "api_public", "admin_panel",
    "analytics", "multi_tenancy", "internationalization",
    "webhooks", "background_jobs", "rate_limiting",
}


class RequirementsSpec(BaseModel):
    """
    Structured representation of user requirements.
    Produced by the RequirementsParser from free-text input.
    """
    raw_input: str = Field(description="Original user text, preserved for audit")

    user_scale: UserScale = Field(default_factory=UserScale)
    traffic_pattern: TrafficPattern = TrafficPattern.STEADY
    features: list[str] = Field(default_factory=list)
    data_characteristics: DataCharacteristics = Field(default_factory=DataCharacteristics)

    compliance: list[str] = Field(
        default_factory=list,
        description="e.g. GDPR, SOC2, HIPAA",
    )
    team_size: Annotated[int, Field(ge=1, le=10_000)] = 5
    budget_tier: BudgetTier = BudgetTier.STARTUP
    tech_preferences: TechPreferences = Field(default_factory=TechPreferences)
    latency_sla_ms: int = Field(default=500, ge=50)
    availability_sla_percent: float = Field(default=99.5, ge=90.0, le=100.0)

    # Parser metadata
    parse_confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    parse_method: str = Field(default="heuristic", description="heuristic | llm | mock")
