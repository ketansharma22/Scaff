# AI Architecture Generator — AI Engine

The core AI brain: Requirements Parser → Decision Engine → RAG + LLM Enhancement.

## Stack

| Component | Technology |
|-----------|------------|
| API | FastAPI (Python 3.12) |
| LLM | Ollama (local, free — llama3.2 by default) |
| Vector DB | Qdrant |
| Embeddings | nomic-embed-text via Ollama |
| Job Queue | Celery + Redis |
| Database | PostgreSQL 16 |
| Packaging | Docker Compose |

---

## Quickstart (Mock Mode — no downloads needed)

Mock mode bypasses Ollama and Qdrant calls entirely.
Use this to develop and run tests without pulling any models.

```bash
# 1. Clone and enter the project
cd ai-engine

# 2. Copy env file
cp .env.example .env
# MOCK_MODE=true is the default — no changes needed

# 3. Start all services
docker compose up -d postgres redis qdrant

# 4. Install Python deps locally (for running tests outside Docker)
pip install -e ".[dev]"

# 5. Run all tests (no Docker required for unit tests)
pytest tests/unit/ -v

# 6. Run integration tests (needs postgres + redis running)
pytest tests/integration/ -v

# 7. Start the API
uvicorn app.main:app --reload
# → http://localhost:8000
# → http://localhost:8000/docs  (Swagger UI)
```

### Test the API (mock mode)

```bash
# Parse only
curl -X POST http://localhost:8000/v1/parse \
  -H "Content-Type: application/json" \
  -d '{"raw_input": "SaaS project management tool for 50k users with auth, realtime updates, and payments"}'

# Full sync generation (mock — instant response)
curl -X POST http://localhost:8000/v1/generate/sync \
  -H "Content-Type: application/json" \
  -d '{
    "raw_input": "I am building a SaaS platform for remote teams. Need authentication, real-time task updates, file uploads, search, and Stripe billing. 5-person team, targeting 25k users. GDPR compliance required."
  }'

# Async generation (returns job_id)
JOB=$(curl -s -X POST http://localhost:8000/v1/generate \
  -H "Content-Type: application/json" \
  -d '{"raw_input": "healthcare app for managing patient records, HIPAA compliant, 10k users"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")
echo "Job: $JOB"

# Stream progress
curl -N http://localhost:8000/v1/generate/$JOB/stream

# Poll result
curl http://localhost:8000/v1/generate/$JOB
```

---

## Switching to Real Ollama (Full Mode)

```bash
# 1. Start Ollama service
docker compose up -d ollama

# 2. Pull the model (one-time, ~2–4GB)
docker compose exec ollama ollama pull llama3.2
docker compose exec ollama ollama pull nomic-embed-text

# 3. Disable mock mode
# In .env:
MOCK_MODE=false

# 4. Restart API
docker compose restart api worker

# 5. Seed the knowledge base into Qdrant
python scripts/setup_dev.py
```

For GPU acceleration, uncomment the `deploy.resources` block in `docker-compose.yml`
(requires NVIDIA GPU + nvidia-container-toolkit installed on host).

---

## Project Structure

```
app/
  domain/
    requirements/
      models.py          # RequirementsSpec (Pydantic)
      parser.py          # Heuristic + LLM requirement extractor
    architecture/
      models.py          # ArchitectureBlueprint, DecisionResult
      decision_engine.py # Deterministic rule engine (no LLM)
    ai/
      enhancement_engine.py  # RAG retrieval + LLM enrichment
  infra/
    llm/
      ollama_client.py   # Ollama HTTP client + retry + circuit breaker
    vector_db/
      qdrant_store.py    # Qdrant upsert + search + mock mode
  api/v1/
    generate.py          # HTTP routes: generate, stream, parse
  workers/
    ai_tasks.py          # Celery tasks: generate_architecture
  core/
    config.py            # Settings (pydantic-settings)
    logging.py           # Structured logging (structlog)
  main.py                # FastAPI app entry point

tests/
  unit/
    test_decision_engine.py   # Pure Python, no infra needed
    test_parser.py
  integration/
    test_pipeline.py          # Full pipeline in mock mode
```

---

## Architecture Decision Engine

The rule engine is in `app/domain/architecture/decision_engine.py`.
Rules are plain Python — no YAML, no config files needed.

Adding a rule:
```python
Rule(
    id="R999",
    category="my_category",
    priority=100,           # higher = evaluated first
    description="My rule",
    condition=lambda s: "my_feature" in s.features,
    action=lambda r, s: (
        r.add_service("my_service"),
        r.add_recommendation("Add this service for my_feature"),
    ),
)
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_MODE` | `true` | Skip all LLM/vector calls |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Ollama endpoint |
| `OLLAMA_MODEL` | `llama3.2` | Model for generation |
| `OLLAMA_EMBED_MODEL` | `nomic-embed-text` | Model for embeddings |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `DATABASE_URL` | `postgresql://arch:arch@localhost:5432/scaff` | PostgreSQL |
| `REDIS_URL` | `redis://localhost:6379/0` | Redis |

---

## What's Next

- [ ] **Frontend** (Next.js) — diagram viewer, requirements form, SSE progress
- [ ] **Database layer** — SQLAlchemy models + Alembic migrations + version history
- [ ] **Diagram generator** — Blueprint JSON → React Flow node-edge graph
- [ ] **Export engine** — JSON / Markdown / PDF
- [ ] **Auth** — JWT + multi-tenant org isolation
