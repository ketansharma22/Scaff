"""
Integration test: full pipeline in mock mode.
Runs without Docker — all external calls are mocked.
"""
import pytest
import os

# Force mock mode for all integration tests
os.environ["MOCK_MODE"] = "true"

from app.domain.requirements.parser import RequirementsParser
from app.domain.architecture.decision_engine import ArchitectureDecisionEngine
from app.domain.ai.enhancement_engine import AIEnhancementEngine
from app.infra.llm.ollama_client import OllamaClient
from app.infra.vector_db.qdrant_store import QdrantStore


SAMPLE_INPUT = """
I'm building a SaaS project management tool similar to Asana.
It needs user authentication, real-time task updates, file attachments,
team workspaces, email notifications, and a public REST API for integrations.
We're a 6-person team targeting 50,000 users within 12 months.
Must be GDPR compliant. Using PostgreSQL and we prefer Python.
"""


@pytest.fixture
async def pipeline():
    llm = OllamaClient()
    store = QdrantStore(llm_client=llm)
    await store.startup()
    yield {
        "llm": llm,
        "store": store,
        "parser": RequirementsParser(llm_client=llm),
        "engine": ArchitectureDecisionEngine(),
        "ai_engine": AIEnhancementEngine(llm=llm, vector_store=store),
    }
    await store.shutdown()
    await llm.close()


@pytest.mark.asyncio
async def test_full_pipeline_returns_blueprint(pipeline):
    p = pipeline

    # Step 1: Parse
    spec = await p["parser"].parse(SAMPLE_INPUT)
    assert spec is not None
    assert "auth" in spec.features
    assert "realtime_notifications" in spec.features
    assert "file_upload" in spec.features
    assert "GDPR" in spec.compliance

    # Step 2: Decide
    decision = p["engine"].evaluate(spec)
    assert decision.architecture_pattern is not None
    assert decision.deployment_model is not None
    assert decision.primary_db == "postgresql"
    assert len(decision.applied_rules) > 0

    # Step 3: AI enhance
    blueprint = await p["ai_engine"].enhance(spec, decision)
    assert blueprint is not None
    assert blueprint.architecture_pattern == decision.architecture_pattern
    assert blueprint.primary_db == decision.primary_db
    assert len(blueprint.services) > 0
    assert len(blueprint.data_stores) > 0
    assert blueprint.cost_estimate is not None


@pytest.mark.asyncio
async def test_pipeline_serializes_to_json(pipeline):
    p = pipeline
    spec = await p["parser"].parse(SAMPLE_INPUT)
    decision = p["engine"].evaluate(spec)
    blueprint = await p["ai_engine"].enhance(spec, decision)

    # Must be serializable to JSON without errors
    import json
    json_str = blueprint.model_dump_json()
    data = json.loads(json_str)
    assert "architecture_pattern" in data
    assert "services" in data
    assert "trade_offs" in data


@pytest.mark.asyncio
async def test_rag_search_returns_results(pipeline):
    store = pipeline["store"]
    results = await store.search("microservices architecture pattern scaling")
    assert len(results) > 0
    assert all(r.score > 0 for r in results)


@pytest.mark.asyncio
async def test_pipeline_handles_minimal_input(pipeline):
    p = pipeline
    minimal = "I want to build a simple blog website"
    spec = await p["parser"].parse(minimal)
    decision = p["engine"].evaluate(spec)
    blueprint = await p["ai_engine"].enhance(spec, decision)
    assert blueprint is not None


@pytest.mark.asyncio
async def test_pipeline_handles_enterprise_input(pipeline):
    p = pipeline
    enterprise = """
    Fortune 500 company building an internal HR platform.
    10 million employees worldwide. SOC2 and GDPR compliance required.
    Needs SSO via SAML, file storage, advanced search, real-time messaging,
    analytics dashboard, webhooks, and a public API.
    100 engineers on the team.
    """
    spec = await p["parser"].parse(enterprise)
    decision = p["engine"].evaluate(spec)
    blueprint = await p["ai_engine"].enhance(spec, decision)

    from app.domain.architecture.models import ArchitecturePattern, DeploymentModel
    assert decision.architecture_pattern == ArchitecturePattern.MICROSERVICES
    assert decision.deployment_model == DeploymentModel.KUBERNETES
