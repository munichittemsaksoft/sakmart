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
        conn.execute(text("ALTER TABLE templates ADD COLUMN IF NOT EXISTS price INTEGER"))
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
        # Purchases table (created by Base.metadata.create_all above, but guard for safety)
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
                amount_paid INTEGER NOT NULL,
                payment_ref VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                purchased_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT uq_purchase_user_template UNIQUE (user_id, template_id)
            )
        """))
        # Agent products tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                slug VARCHAR(200) UNIQUE NOT NULL,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                role VARCHAR(200) NOT NULL,
                model VARCHAR(100) NOT NULL,
                tier VARCHAR(50) DEFAULT 'Execution',
                description TEXT,
                instructions TEXT,
                responsibilities JSONB DEFAULT '[]',
                tags JSONB DEFAULT '[]',
                price INTEGER,
                status VARCHAR(20) DEFAULT 'draft',
                view_count INTEGER DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_product_purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                agent_product_id UUID NOT NULL REFERENCES agent_products(id) ON DELETE CASCADE,
                amount_paid INTEGER NOT NULL,
                payment_ref VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                purchased_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT uq_agent_product_purchase UNIQUE (user_id, agent_product_id)
            )
        """))
        # Company products tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_products (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                slug VARCHAR(200) UNIQUE NOT NULL,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                industry VARCHAR(100),
                description TEXT,
                long_description TEXT,
                mission TEXT,
                values JSONB DEFAULT '[]',
                tags JSONB DEFAULT '[]',
                agent_count INTEGER DEFAULT 0,
                price INTEGER,
                zip_url VARCHAR,
                zip_storage_key VARCHAR,
                status VARCHAR(20) DEFAULT 'draft',
                view_count INTEGER DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_agents (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                company_id UUID NOT NULL REFERENCES company_products(id) ON DELETE CASCADE,
                name VARCHAR(100) NOT NULL,
                role VARCHAR(100) NOT NULL,
                model VARCHAR(100) NOT NULL,
                tier VARCHAR(50) DEFAULT 'Execution',
                responsibilities JSONB DEFAULT '[]',
                parent_name VARCHAR(100),
                position INTEGER DEFAULT 0
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS company_product_purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                company_product_id UUID NOT NULL REFERENCES company_products(id) ON DELETE CASCADE,
                amount_paid INTEGER NOT NULL,
                payment_ref VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                purchased_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT uq_company_product_purchase UNIQUE (user_id, company_product_id)
            )
        """))
        # Skills tables
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS skills (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                slug VARCHAR(200) UNIQUE NOT NULL,
                author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(200) NOT NULL,
                category VARCHAR(100),
                description TEXT,
                long_description TEXT,
                instructions TEXT,
                parameters JSONB DEFAULT '[]',
                tags JSONB DEFAULT '[]',
                price INTEGER,
                status VARCHAR(20) DEFAULT 'draft',
                view_count INTEGER DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS agent_product_skills (
                agent_product_id UUID NOT NULL REFERENCES agent_products(id) ON DELETE CASCADE,
                skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                PRIMARY KEY (agent_product_id, skill_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS template_agent_products (
                template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
                agent_product_id UUID NOT NULL REFERENCES agent_products(id) ON DELETE CASCADE,
                PRIMARY KEY (template_id, agent_product_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS template_skills (
                template_id UUID NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
                skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                PRIMARY KEY (template_id, skill_id)
            )
        """))
        conn.execute(text("""
            CREATE TABLE IF NOT EXISTS skill_purchases (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                skill_id UUID NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
                amount_paid INTEGER NOT NULL,
                payment_ref VARCHAR(100),
                status VARCHAR(20) DEFAULT 'completed',
                purchased_at TIMESTAMPTZ DEFAULT NOW(),
                CONSTRAINT uq_skill_purchase UNIQUE (user_id, skill_id)
            )
        """))
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
