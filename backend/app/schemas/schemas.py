"""
Pydantic v2 schemas for request/response validation.
"""
from __future__ import annotations
import uuid
from datetime import datetime
from typing import Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ── Helpers ──────────────────────────────────────────────────────

class OrmModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ── User ─────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(min_length=3, max_length=50, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(min_length=8)
    full_name: str | None = None


class UserUpdate(BaseModel):
    full_name: str | None = None
    bio: str | None = None
    avatar_url: str | None = None


class UserOut(OrmModel):
    id: uuid.UUID
    email: str
    username: str
    full_name: str | None
    avatar_url: str | None
    bio: str | None
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime


class UserPublic(OrmModel):
    id: uuid.UUID
    username: str
    full_name: str | None
    avatar_url: str | None
    bio: str | None


# ── Auth ─────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Agent ────────────────────────────────────────────────────────

class AgentCreate(BaseModel):
    name: str
    role: str
    model: str
    schedule: str | None = None
    responsibilities: list[str] = []
    tier: str = "Execution"
    position: int = 0


class AgentOut(OrmModel):
    id: uuid.UUID
    name: str
    role: str
    model: str
    schedule: str | None
    responsibilities: list[str]
    tier: str
    position: int


# ── Template ─────────────────────────────────────────────────────

class TemplateCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    long_description: str | None = None
    category: str
    tags: list[str] = []
    agent_count: int = 1
    monthly_cost: int | None = None
    monthly_revenue_min: int | None = None
    monthly_revenue_max: int | None = None
    config_schema: dict[str, Any] = {}
    agents: list[AgentCreate] = []


class TemplateUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    long_description: str | None = None
    category: str | None = None
    tags: list[str] | None = None
    agent_count: int | None = None
    monthly_cost: int | None = None
    monthly_revenue_min: int | None = None
    monthly_revenue_max: int | None = None
    config_schema: dict[str, Any] | None = None
    status: str | None = None


class TemplateOut(OrmModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str | None
    long_description: str | None
    category: str
    status: str
    tags: list[str]
    agent_count: int
    monthly_cost: int | None
    monthly_revenue_min: int | None
    monthly_revenue_max: int | None
    thumbnail_url: str | None
    preview_images: list[str]
    fork_count: int
    star_count: int
    view_count: int
    author: UserPublic
    agents: list[AgentOut]
    created_at: datetime
    updated_at: datetime


class TemplateSummary(OrmModel):
    id: uuid.UUID
    slug: str
    title: str
    description: str | None
    category: str
    status: str
    tags: list[str]
    agent_count: int
    monthly_cost: int | None
    monthly_revenue_min: int | None
    monthly_revenue_max: int | None
    thumbnail_url: str | None
    fork_count: int
    star_count: int
    view_count: int
    author: UserPublic
    created_at: datetime


# ── Fork ────────────────────────────────────────────────────────

class ForkCreate(BaseModel):
    custom_config: dict[str, Any] = {}


class ForkOut(OrmModel):
    id: uuid.UUID
    template_id: uuid.UUID
    user_id: uuid.UUID
    custom_config: dict[str, Any]
    forked_at: datetime


# ── Review ───────────────────────────────────────────────────────

class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    body: str | None = None


class ReviewOut(OrmModel):
    id: uuid.UUID
    rating: int
    body: str | None
    user: UserPublic
    created_at: datetime


# ── Pagination ───────────────────────────────────────────────────

class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int
    pages: int


# ── Asset ─────────────────────────────────────────────────────────

class AssetOut(OrmModel):
    id: uuid.UUID
    filename: str
    url: str
    content_type: str | None
    size_bytes: int | None
    uploaded_at: datetime
