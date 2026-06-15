"""
ORM Models for ClipMart
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer, String,
    Text, JSON, UniqueConstraint, Index, Enum as SAEnum
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import enum

from app.db.session import Base


def now_utc():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    user = "user"
    admin = "admin"
    super_admin = "super_admin"


class TemplateStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


class Category(str, enum.Enum):
    marketing = "Marketing"
    saas = "SaaS"
    ecommerce = "E-commerce"
    agency = "Agency"
    media = "Media"
    finance = "Finance"
    other = "Other"


# ─────────────────────────────────────────────
# User
# ─────────────────────────────────────────────
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(320), unique=True, nullable=False, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String(200), nullable=True)
    avatar_url = Column(String, nullable=True)
    bio = Column(Text, nullable=True)
    role = Column(String(50), default=UserRole.user.value, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    templates = relationship("Template", back_populates="author", cascade="all, delete-orphan")
    forks = relationship("Fork", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    starred = relationship("Star", back_populates="user", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="user", cascade="all, delete-orphan")
    agent_products = relationship("AgentProduct", back_populates="author", cascade="all, delete-orphan")
    agent_product_purchases = relationship("AgentProductPurchase", back_populates="user", cascade="all, delete-orphan")
    company_products = relationship("CompanyProduct", back_populates="author", cascade="all, delete-orphan")
    company_product_purchases = relationship("CompanyProductPurchase", back_populates="user", cascade="all, delete-orphan")


# ─────────────────────────────────────────────
# Template
# ─────────────────────────────────────────────
class Template(Base):
    __tablename__ = "templates"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)
    category = Column(SAEnum(Category), nullable=False)
    status = Column(SAEnum(TemplateStatus), default=TemplateStatus.draft, nullable=False)
    tags = Column(JSON, default=list)           # ["affiliate", "SEO", ...]
    agent_count = Column(Integer, default=1)
    monthly_cost = Column(Integer, nullable=True)   # USD cents
    monthly_revenue_min = Column(Integer, nullable=True)  # USD cents
    monthly_revenue_max = Column(Integer, nullable=True)
    thumbnail_url = Column(String, nullable=True)
    preview_images = Column(JSON, default=list)    # list of URLs
    config_schema = Column(JSON, default=dict)     # JSON schema for agent config
    zip_url = Column(String, nullable=True)
    zip_storage_key = Column(String, nullable=True)
    price = Column(Integer, nullable=True)          # USD cents; null/0 = free
    fork_count = Column(Integer, default=0)
    star_count = Column(Integer, default=0)
    view_count = Column(Integer, default=0)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    author = relationship("User", back_populates="templates")
    agents = relationship("Agent", back_populates="template", cascade="all, delete-orphan")
    forks = relationship("Fork", back_populates="template", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="template", cascade="all, delete-orphan")
    stars = relationship("Star", back_populates="template", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="template", cascade="all, delete-orphan")
    purchases = relationship("Purchase", back_populates="template", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_templates_category_status", "category", "status"),
    )


# ─────────────────────────────────────────────
# Agent (within a template)
# ─────────────────────────────────────────────
class AgentTier(str, enum.Enum):
    leadership = "Leadership"
    operations = "Operations"
    execution = "Execution"


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)          # e.g. "claude-sonnet-4-6"
    schedule = Column(String(100), nullable=True)        # e.g. "every 4h"
    responsibilities = Column(JSON, default=list)
    tier = Column(SAEnum(AgentTier), default=AgentTier.execution)
    position = Column(Integer, default=0)
    parent_name = Column(String(100), nullable=True)     # name/id of parent agent

    template = relationship("Template", back_populates="agents")


# ─────────────────────────────────────────────
# Fork
# ─────────────────────────────────────────────
class Fork(Base):
    __tablename__ = "forks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    custom_config = Column(JSON, default=dict)
    forked_at = Column(DateTime(timezone=True), default=now_utc)

    template = relationship("Template", back_populates="forks")
    user = relationship("User", back_populates="forks")

    __table_args__ = (UniqueConstraint("template_id", "user_id", name="uq_fork_user_template"),)


# ─────────────────────────────────────────────
# Star
# ─────────────────────────────────────────────
class Star(Base):
    __tablename__ = "stars"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    starred_at = Column(DateTime(timezone=True), default=now_utc)

    template = relationship("Template", back_populates="stars")
    user = relationship("User", back_populates="starred")

    __table_args__ = (UniqueConstraint("template_id", "user_id", name="uq_star_user_template"),)


# ─────────────────────────────────────────────
# Review
# ─────────────────────────────────────────────
class Review(Base):
    __tablename__ = "reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    rating = Column(Integer, nullable=False)     # 1–5
    body = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=now_utc)

    template = relationship("Template", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


# ─────────────────────────────────────────────
# Asset (uploaded files per template)
# ─────────────────────────────────────────────
class Asset(Base):
    __tablename__ = "assets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    filename = Column(String, nullable=False)
    storage_key = Column(String, nullable=False)  # blob name or relative path
    url = Column(String, nullable=False)
    content_type = Column(String, nullable=True)
    size_bytes = Column(Integer, nullable=True)
    uploaded_at = Column(DateTime(timezone=True), default=now_utc)

    template = relationship("Template", back_populates="assets")


# ─────────────────────────────────────────────
# Purchase (mock payment)
# ─────────────────────────────────────────────
class PurchaseStatus(str, enum.Enum):
    completed = "completed"
    refunded = "refunded"


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id"), nullable=False)
    amount_paid = Column(Integer, nullable=False)       # USD cents at time of purchase
    payment_ref = Column(String(100), nullable=True)    # mock transaction id
    status = Column(String(20), default=PurchaseStatus.completed.value)
    purchased_at = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="purchases")
    template = relationship("Template", back_populates="purchases")

    __table_args__ = (UniqueConstraint("user_id", "template_id", name="uq_purchase_user_template"),)


# ─────────────────────────────────────────────
# AgentProduct  (standalone agent for sale)
# ─────────────────────────────────────────────
class AgentProduct(Base):
    __tablename__ = "agent_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    role = Column(String(200), nullable=False)
    model = Column(String(100), nullable=False)
    tier = Column(String(50), default="Execution")
    description = Column(Text, nullable=True)
    instructions = Column(Text, nullable=True)
    responsibilities = Column(JSON, default=list)
    tags = Column(JSON, default=list)
    price = Column(Integer, nullable=True)           # USD cents; null = free
    status = Column(String(20), default="draft")     # draft | published | archived
    view_count = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    author = relationship("User", back_populates="agent_products")
    purchases = relationship("AgentProductPurchase", back_populates="agent_product", cascade="all, delete-orphan")


class AgentProductPurchase(Base):
    __tablename__ = "agent_product_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    agent_product_id = Column(UUID(as_uuid=True), ForeignKey("agent_products.id"), nullable=False)
    amount_paid = Column(Integer, nullable=False)
    payment_ref = Column(String(100), nullable=True)
    status = Column(String(20), default="completed")
    purchased_at = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="agent_product_purchases")
    agent_product = relationship("AgentProduct", back_populates="purchases")

    __table_args__ = (UniqueConstraint("user_id", "agent_product_id", name="uq_agent_product_purchase"),)


# ─────────────────────────────────────────────
# CompanyProduct  (company AI setup for sale)
# ─────────────────────────────────────────────
class CompanyProduct(Base):
    __tablename__ = "company_products"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(200), unique=True, nullable=False, index=True)
    author_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name = Column(String(200), nullable=False)
    industry = Column(String(100), nullable=True)
    description = Column(Text, nullable=True)
    long_description = Column(Text, nullable=True)
    mission = Column(Text, nullable=True)
    values = Column(JSON, default=list)              # list of value strings
    tags = Column(JSON, default=list)
    agent_count = Column(Integer, default=0)
    price = Column(Integer, nullable=True)           # USD cents; null = free
    zip_url = Column(String, nullable=True)
    zip_storage_key = Column(String, nullable=True)
    status = Column(String(20), default="draft")
    view_count = Column(Integer, default=0)
    purchase_count = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=now_utc)
    updated_at = Column(DateTime(timezone=True), default=now_utc, onupdate=now_utc)

    author = relationship("User", back_populates="company_products")
    agents = relationship("CompanyAgent", back_populates="company", cascade="all, delete-orphan")
    purchases = relationship("CompanyProductPurchase", back_populates="company_product", cascade="all, delete-orphan")


class CompanyAgent(Base):
    """Agents embedded in a CompanyProduct (similar to Agent in Template)."""
    __tablename__ = "company_agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    company_id = Column(UUID(as_uuid=True), ForeignKey("company_products.id"), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    tier = Column(String(50), default="Execution")
    responsibilities = Column(JSON, default=list)
    parent_name = Column(String(100), nullable=True)
    position = Column(Integer, default=0)

    company = relationship("CompanyProduct", back_populates="agents")


class CompanyProductPurchase(Base):
    __tablename__ = "company_product_purchases"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    company_product_id = Column(UUID(as_uuid=True), ForeignKey("company_products.id"), nullable=False)
    amount_paid = Column(Integer, nullable=False)
    payment_ref = Column(String(100), nullable=True)
    status = Column(String(20), default="completed")
    purchased_at = Column(DateTime(timezone=True), default=now_utc)

    user = relationship("User", back_populates="company_product_purchases")
    company_product = relationship("CompanyProduct", back_populates="purchases")

    __table_args__ = (UniqueConstraint("user_id", "company_product_id", name="uq_company_product_purchase"),)
