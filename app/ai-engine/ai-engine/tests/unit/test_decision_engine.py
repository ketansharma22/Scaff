"""
Unit tests for the Architecture Decision Engine.
These are pure Python — no DB, no LLM, no Docker required.
"""
import pytest
from app.domain.requirements.models import (
    RequirementsSpec, UserScale, DataCharacteristics,
    TrafficPattern, BudgetTier, GrowthRate,
)
from app.domain.architecture.decision_engine import ArchitectureDecisionEngine
from app.domain.architecture.models import ArchitecturePattern, DeploymentModel


@pytest.fixture
def engine():
    return ArchitectureDecisionEngine()


def _spec(**kwargs) -> RequirementsSpec:
    defaults = dict(raw_input="test", user_scale=UserScale())
    defaults.update(kwargs)
    return RequirementsSpec(**defaults)


class TestArchitecturePattern:

    def test_large_scale_gets_microservices(self, engine):
        spec = _spec(user_scale=UserScale(current=10_000, target=200_000))
        result = engine.evaluate(spec)
        assert result.architecture_pattern == ArchitecturePattern.MICROSERVICES

    def test_many_features_gets_microservices(self, engine):
        spec = _spec(features=["auth", "payments", "search", "realtime_notifications",
                                "file_upload", "analytics", "webhooks", "admin_panel", "email"])
        result = engine.evaluate(spec)
        assert result.architecture_pattern == ArchitecturePattern.MICROSERVICES

    def test_small_team_gets_modular_monolith(self, engine):
        spec = _spec(team_size=5, user_scale=UserScale(current=100, target=5_000))
        result = engine.evaluate(spec)
        assert result.architecture_pattern == ArchitecturePattern.MODULAR_MONOLITH

    def test_solo_bootstrap_gets_monolith(self, engine):
        spec = _spec(team_size=1, user_scale=UserScale(current=10, target=500))
        result = engine.evaluate(spec)
        assert result.architecture_pattern == ArchitecturePattern.MONOLITH


class TestDeploymentModel:

    def test_high_scale_gets_kubernetes(self, engine):
        spec = _spec(user_scale=UserScale(current=1000, target=100_000))
        result = engine.evaluate(spec)
        assert result.deployment_model == DeploymentModel.KUBERNETES

    def test_high_sla_gets_kubernetes(self, engine):
        spec = _spec(availability_sla_percent=99.95)
        result = engine.evaluate(spec)
        assert result.deployment_model == DeploymentModel.KUBERNETES

    def test_small_scale_gets_docker_compose(self, engine):
        spec = _spec(user_scale=UserScale(current=10, target=1_000))
        result = engine.evaluate(spec)
        assert result.deployment_model == DeploymentModel.DOCKER_COMPOSE


class TestDatabaseSelection:

    def test_relational_gets_postgresql(self, engine):
        spec = _spec(data_characteristics=DataCharacteristics(relational=True))
        result = engine.evaluate(spec)
        assert result.primary_db == "postgresql"

    def test_unstructured_gets_mongodb(self, engine):
        spec = _spec(
            data_characteristics=DataCharacteristics(relational=False, unstructured=True)
        )
        result = engine.evaluate(spec)
        assert result.primary_db == "mongodb"

    def test_auth_feature_forces_postgresql(self, engine):
        spec = _spec(
            features=["auth"],
            data_characteristics=DataCharacteristics(relational=False, unstructured=True)
        )
        result = engine.evaluate(spec)
        # auth rule (R030) has higher priority than unstructured (R031)
        assert result.primary_db == "postgresql"


class TestCacheSelection:

    def test_read_heavy_gets_redis(self, engine):
        spec = _spec(data_characteristics=DataCharacteristics(read_heavy=True))
        result = engine.evaluate(spec)
        assert result.cache == "redis"

    def test_bursty_traffic_gets_redis(self, engine):
        spec = _spec(traffic_pattern=TrafficPattern.BURSTY)
        result = engine.evaluate(spec)
        assert result.cache == "redis"


class TestRealtimeFeatures:

    def test_realtime_feature_gets_websockets(self, engine):
        spec = _spec(features=["realtime_notifications"])
        result = engine.evaluate(spec)
        assert result.realtime_transport == "websockets"
        assert result.message_bus == "redis_streams"
        assert "notification_service" in result.services

    def test_realtime_traffic_gets_websockets(self, engine):
        spec = _spec(traffic_pattern=TrafficPattern.REALTIME)
        result = engine.evaluate(spec)
        assert result.realtime_transport == "websockets"


class TestSearchSelection:

    def test_search_with_large_db_gets_opensearch(self, engine):
        spec = _spec(
            features=["search"],
            data_characteristics=DataCharacteristics(estimated_db_size_gb=10.0)
        )
        result = engine.evaluate(spec)
        assert result.search_engine == "opensearch"

    def test_search_with_small_db_gets_postgresql_fts(self, engine):
        spec = _spec(
            features=["search"],
            data_characteristics=DataCharacteristics(estimated_db_size_gb=0.5)
        )
        result = engine.evaluate(spec)
        assert result.search_engine == "postgresql_fts"


class TestComplianceRules:

    def test_gdpr_adds_eu_recommendations(self, engine):
        spec = _spec(compliance=["GDPR"])
        result = engine.evaluate(spec)
        assert any("EU" in r or "erasure" in r for r in result.recommendations)

    def test_hipaa_adds_audit_recommendations(self, engine):
        spec = _spec(compliance=["HIPAA"])
        result = engine.evaluate(spec)
        assert any("HIPAA" in r for r in result.recommendations)


class TestAppliedRules:

    def test_applied_rules_are_tracked(self, engine):
        spec = _spec(
            features=["auth", "payments"],
            user_scale=UserScale(current=100, target=50_000),
        )
        result = engine.evaluate(spec)
        assert len(result.applied_rules) > 0
        # Auth and payments are accumulate=True, should always appear
        assert "R080" in result.applied_rules
        assert "R081" in result.applied_rules
