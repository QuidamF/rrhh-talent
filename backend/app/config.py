from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Proveedor de LLM: "ollama" (local) | "gemini" (Google AI Studio) | "openai"
    llm_provider: str = "ollama"
    ollama_base_url: str = "http://host.docker.internal:11434"
    ollama_model: str = "gemma4:4b"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"
    gemini_base_url: str = "https://generativelanguage.googleapis.com/v1beta"
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_base_url: str = "https://api.openai.com/v1"
    database_url: str = "sqlite:///./data/rh.sqlite"
    storage_path: str = "/app/storage/candidates"
    max_cv_size_mb: int = 10
    redis_url: str = "redis://rh_redis:6379/0"
    cors_allowed_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://localhost:8000"
    id_document_retention_hours: int = 24
    security_secret_key: str = "rh-secure-token-secret-key-change-in-production-32b"
    admin_api_key: str = "rh-admin-secret-api-key-2026"
    require_auth: bool = False
    enforce_signed_urls: bool = False
    enable_at_rest_encryption: bool = True

    @property
    def allowed_origins_list(self) -> list[str]:
        import os
        origins = [origin.strip() for origin in self.cors_allowed_origins.split(",") if origin.strip()]
        f_port = os.getenv("FRONTEND_PORT")
        if f_port:
            origins.extend([f"http://localhost:{f_port}", f"http://127.0.0.1:{f_port}"])
        return list(set(origins))


    class Config:
        case_sensitive = False

settings = Settings()
