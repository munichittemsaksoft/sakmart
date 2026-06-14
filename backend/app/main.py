"""
ClipMart — FastAPI application entry point.
"""
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.api.v1.router import api_router
from app.db.session import engine
from app.models.models import Base  # noqa: F401 — imports all models

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting ClipMart API [%s]", settings.app_env)
    Base.metadata.create_all(bind=engine)
    # Add new columns to existing tables without Alembic
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE templates ADD COLUMN IF NOT EXISTS zip_url VARCHAR"))
        conn.execute(text("ALTER TABLE templates ADD COLUMN IF NOT EXISTS zip_storage_key VARCHAR"))
        conn.execute(text("ALTER TABLE agents ADD COLUMN IF NOT EXISTS parent_name VARCHAR(100)"))
        # Convert role column from PostgreSQL enum to VARCHAR so we can add roles without DDL migrations
        conn.execute(text("""
            DO $$ BEGIN
                ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text;
            EXCEPTION WHEN others THEN NULL;
            END $$
        """))
        # Rename legacy 'creator' role to 'user'
        conn.execute(text("UPDATE users SET role = 'user' WHERE role = 'creator'"))
        conn.commit()
    # Ensure local upload dir exists
    if settings.storage_backend == "local":
        Path(settings.local_upload_dir).mkdir(parents=True, exist_ok=True)
    yield
    logger.info("Shutting down ClipMart API")


app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(api_router, prefix=settings.api_prefix)

# Serve local uploads as static files
if settings.storage_backend == "local":
    upload_dir = Path(settings.local_upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(upload_dir)), name="uploads")


@app.get("/health")
def health():
    return {
        "status": "ok",
        "app": settings.app_name,
        "env": settings.app_env,
        "storage": settings.storage_backend,
    }
