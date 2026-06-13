"""
Central application configuration.
All values are read from the .env file (or environment variables).
Do not hardcode secrets or environment-specific values here.
"""
from functools import lru_cache
from typing import Literal
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
        "extra": "ignore",
    }

    # ── Application ──────────────────────────────────────────────
    app_name: str
    app_env: Literal["development", "staging", "production"]
    debug: bool
    log_level: str

    # ── API ──────────────────────────────────────────────────────
    api_host: str
    api_port: int
    api_prefix: str
    cors_origins: list[str]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors(cls, v):
        if isinstance(v, str):
            return [o.strip() for o in v.split(",")]
        return v

    # ── Security ─────────────────────────────────────────────────
    secret_key: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int
    algorithm: str

    # ── Database ─────────────────────────────────────────────────
    database_url: str
    azure_database_url: str = ""
    database_pool_size: int
    database_max_overflow: int

    # ── Storage ──────────────────────────────────────────────────
    storage_backend: Literal["local", "azure"]

    # Local
    local_upload_dir: str
    local_base_url: str

    # Azure (optional — blank when using local storage)
    azure_storage_connection_string: str = ""
    azure_container_name: str = ""
    azure_cdn_base_url: str = ""

    # ── Pagination ───────────────────────────────────────────────
    default_page_size: int
    max_page_size: int

    # ── AI ───────────────────────────────────────────────────────
    gemini_api_key: str = ""
    gemini_model: str

    # ── Email ────────────────────────────────────────────────────
    smtp_host: str = ""
    smtp_port: int
    smtp_user: str = ""
    smtp_password: str = ""
    emails_from_address: str


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
