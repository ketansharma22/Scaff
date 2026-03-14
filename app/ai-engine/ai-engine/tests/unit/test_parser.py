"""
Unit tests for RequirementsParser (heuristic path only — no LLM needed).
"""
import pytest
from app.domain.requirements.parser import RequirementsParser
from app.domain.requirements.models import TrafficPattern, BudgetTier


@pytest.fixture
def parser():
    return RequirementsParser(llm_client=None)


@pytest.mark.asyncio
class TestScaleExtraction:

    async def test_extracts_k_users(self, parser):
        spec = await parser.parse("I need an app for 50k users")
        assert spec.user_scale.target == 50_000

    async def test_extracts_million_users(self, parser):
        spec = await parser.parse("targeting 2 million users in the first year")
        assert spec.user_scale.target == 2_000_000

    async def test_extracts_plain_number(self, parser):
        spec = await parser.parse("we have 1000 customers right now")
        assert spec.user_scale.target == 1000


@pytest.mark.asyncio
class TestFeatureExtraction:

    async def test_extracts_auth(self, parser):
        spec = await parser.parse("users need to login and register accounts")
        assert "auth" in spec.features

    async def test_extracts_payments(self, parser):
        spec = await parser.parse("Stripe integration for subscription billing")
        assert "payments" in spec.features

    async def test_extracts_search(self, parser):
        spec = await parser.parse("full-text search across all content")
        assert "search" in spec.features

    async def test_extracts_realtime(self, parser):
        spec = await parser.parse("real-time notifications via WebSocket")
        assert "realtime_notifications" in spec.features

    async def test_extracts_file_upload(self, parser):
        spec = await parser.parse("users can upload images and attachments")
        assert "file_upload" in spec.features

    async def test_extracts_multiple_features(self, parser):
        spec = await parser.parse(
            "Users login, search content, upload files, and receive live notifications"
        )
        assert "auth" in spec.features
        assert "search" in spec.features
        assert "file_upload" in spec.features
        assert "realtime_notifications" in spec.features


@pytest.mark.asyncio
class TestTrafficPattern:

    async def test_detects_realtime(self, parser):
        spec = await parser.parse("real-time streaming data dashboard")
        assert spec.traffic_pattern == TrafficPattern.REALTIME

    async def test_detects_bursty(self, parser):
        spec = await parser.parse("flash sale events cause huge spikes in traffic")
        assert spec.traffic_pattern == TrafficPattern.BURSTY

    async def test_defaults_to_steady(self, parser):
        spec = await parser.parse("a simple blog platform for writers")
        assert spec.traffic_pattern == TrafficPattern.STEADY


@pytest.mark.asyncio
class TestComplianceExtraction:

    async def test_extracts_gdpr(self, parser):
        spec = await parser.parse("EU users, must be GDPR compliant, privacy focused")
        assert "GDPR" in spec.compliance

    async def test_extracts_hipaa(self, parser):
        spec = await parser.parse("healthcare app managing patient health records")
        assert "HIPAA" in spec.compliance


@pytest.mark.asyncio
class TestTeamSize:

    async def test_extracts_team_size(self, parser):
        spec = await parser.parse("we are a 3 person engineering team")
        assert spec.team_size == 3

    async def test_solo_dev(self, parser):
        spec = await parser.parse("solo developer building a side project")
        assert spec.team_size == 1


@pytest.mark.asyncio
class TestInputSanitization:

    async def test_handles_empty_ish_input(self, parser):
        # Should not crash, just return defaults
        spec = await parser.parse("I want to build something cool")
        assert spec is not None

    async def test_long_input_truncated(self, parser):
        long_input = "build an app " * 1000
        spec = await parser.parse(long_input)
        assert len(spec.raw_input) <= 8192
