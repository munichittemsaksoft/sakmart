"""
Central application configuration.
All values are read from environment variables (Azure App Service Application Settings)
or a local .env file for development.
"""
from functools import lru_cache
from pathlib import Path
from typing import Literal
from pydantic_settings import BaseSettings
from pydantic import field_validator

# Resolve .env relative to this file (backend/.env), not gunicorn's CWD
_ENV_FILE = Path(__file__).resolve().parent.parent.parent / ".env"


class Settings(BaseSettings):
    model_config = {
        "env_file": str(_ENV_FILE),
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    # ── Application ──────────────────────────────────────────────
    app_name: str = "SAKmart API"
    app_env: Literal["development", "staging", "production"] = "production"
    debug: bool = False
    log_level: str = "INFO"

    # ── API ──────────────────────────────────────────────────────
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    # ── Security ─────────────────────────────────────────────────
    secret_key: str
    access_token_expire_minutes: int = 30
    refresh_token_expire_days: int = 7
    algorithm: str = "HS256"

    # ── Database ─────────────────────────────────────────────────
    database_url: str
    azure_database_url: str = ""
    database_pool_size: int = 5
    database_max_overflow: int = 10

    # ── Storage ──────────────────────────────────────────────────
    storage_backend: Literal["local", "azure"] = "azure"

    # Local
    local_upload_dir: str = "/tmp/uploads"
    local_base_url: str = "/uploads"

    # Azure (optional — blank when using local storage)
    azure_storage_connection_string: str = ""
    azure_container_name: str = ""
    azure_cdn_base_url: str = ""

    # ── Pagination ───────────────────────────────────────────────
    default_page_size: int = 20
    max_page_size: int = 100

    # ── AI ───────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # ── Email ────────────────────────────────────────────────────
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    emails_from_address: str = "noreply@sakmart.app"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
