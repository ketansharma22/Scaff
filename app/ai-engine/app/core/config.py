from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    env: str = "development"
    log_level: str = "INFO"
    secret_key: str = "dev-secret-key-change-in-prod"

    # Mock mode — bypass all LLM and vector DB calls
    mock_mode: bool = True

    # Ollama
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama3.2"
    ollama_embed_model: str = "nomic-embed-text"
    ollama_timeout_seconds: int = 120

    # Qdrant
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "architecture_patterns"
    qdrant_vector_size: int = 768  # nomic-embed-text / all-MiniLM-L6-v2

    # Database
    database_url: str = "postgresql://arch:arch@localhost:5432/archgen"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # LLM generation settings
    llm_max_retries: int = 3
    llm_temperature: float = 0.2
    llm_max_tokens: int = 4096

    # RAG settings
    rag_top_k: int = 5
    rag_score_threshold: float = 0.65
    rag_max_context_tokens: int = 2000

    # Rate limiting
    max_input_chars: int = 8192


@lru_cache
def get_settings() -> Settings:
    return Settings()
