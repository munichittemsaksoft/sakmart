"""
Agent Products marketplace endpoints.
"""
import uuid
import re
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.deps import get_current_user, optional_user
from app.models.models import AgentProduct, AgentProductPurchase, Skill, User
from app.schemas.schemas import (
    AgentProductCreate, AgentProductUpdate, AgentProductOut, AgentProductSummary,
    CheckoutRequest, AgentProductPurchaseOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/agents", tags=["agents"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", slug).strip("-")[:180]


def _unique_slug(base: str, db: Session) -> str:
    slug = base
    n = 1
    while db.query(AgentProduct).filter(AgentProduct.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _mock_charge(card_number: str) -> str:
    last4 = card_number.replace(" ", "")[-4:]
    return f"mock_txn_{last4}_{uuid.uuid4().hex[:8]}"


# ── Purchase sub-routes (defined before /{slug} to avoid path collision) ─────

@router.get("/purchases/me", response_model=list[AgentProductPurchaseOut])
def my_agent_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(AgentProductPurchase)
        .options(joinedload(AgentProductPurchase.agent_product).joinedload(AgentProduct.author))
        .filter(AgentProductPurchase.user_id == current_user.id)
        .order_by(AgentProductPurchase.purchased_at.desc())
        .all()
    )


@router.get("/purchases/check/{slug}")
def check_agent_purchase(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = db.query(AgentProduct).filter(AgentProduct.slug == slug).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    is_owner = str(agent.author_id) == str(current_user.id)
    purchased = (
        db.query(AgentProductPurchase)
        .filter(
            AgentProductPurchase.user_id == current_user.id,
            AgentProductPurchase.agent_product_id == agent.id,
        )
        .first()
    ) is not None
    return {"purchased": purchased or is_owner, "price": agent.price}


@router.post("/purchases/{slug}", response_model=AgentProductPurchaseOut)
def purchase_agent(
    slug: str,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = db.query(AgentProduct).filter(AgentProduct.slug == slug).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if not agent.price or agent.price <= 0:
        raise HTTPException(status_code=400, detail="This agent is free")
    if str(agent.author_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You own this agent")

    existing = (
        db.query(AgentProductPurchase)
        .filter(
            AgentProductPurchase.user_id == current_user.id,
            AgentProductPurchase.agent_product_id == agent.id,
        )
        .first()
    )
    if existing:
        return (
            db.query(AgentProductPurchase)
            .options(joinedload(AgentProductPurchase.agent_product).joinedload(AgentProduct.author))
            .filter(AgentProductPurchase.id == existing.id)
            .one()
        )

    payment_ref = _mock_charge(body.card_number)
    purchase = AgentProductPurchase(
        user_id=current_user.id,
        agent_product_id=agent.id,
        amount_paid=agent.price,
        payment_ref=payment_ref,
        status="completed",
    )
    db.add(purchase)
    agent.purchase_count = (agent.purchase_count or 0) + 1
    db.commit()
    db.refresh(purchase)
    return (
        db.query(AgentProductPurchase)
        .options(joinedload(AgentProductPurchase.agent_product).joinedload(AgentProduct.author))
        .filter(AgentProductPurchase.id == purchase.id)
        .one()
    )


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[AgentProductSummary])
def list_agent_products(
    q: str | None = Query(None),
    tier: str | None = Query(None),
    skip: int = 0,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    qry = (
        db.query(AgentProduct)
        .options(joinedload(AgentProduct.author))
        .filter(AgentProduct.status == "published")
    )
    if q:
        qry = qry.filter(AgentProduct.name.ilike(f"%{q}%"))
    if tier:
        qry = qry.filter(AgentProduct.tier == tier)
    return qry.order_by(AgentProduct.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=AgentProductOut, status_code=201)
def create_agent_product(
    body: AgentProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump()
    skill_slugs = data.pop("skill_slugs", [])
    slug = _unique_slug(_slugify(body.name), db)
    agent = AgentProduct(slug=slug, author_id=current_user.id, **data)
    db.add(agent)
    if skill_slugs:
        linked_skills = db.query(Skill).filter(Skill.slug.in_(skill_slugs)).all()
        agent.skills = linked_skills
    db.commit()
    db.refresh(agent)
    return (
        db.query(AgentProduct)
        .options(joinedload(AgentProduct.author), joinedload(AgentProduct.skills).joinedload(Skill.author))
        .filter(AgentProduct.id == agent.id)
        .one()
    )


@router.get("/{slug}", response_model=AgentProductOut)
def get_agent_product(
    slug: str,
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    agent = (
        db.query(AgentProduct)
        .options(joinedload(AgentProduct.author), joinedload(AgentProduct.skills).joinedload(Skill.author))
        .filter(AgentProduct.slug == slug)
        .first()
    )
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    agent.view_count = (agent.view_count or 0) + 1
    db.commit()
    return agent


@router.patch("/{slug}", response_model=AgentProductOut)
def update_agent_product(
    slug: str,
    body: AgentProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = db.query(AgentProduct).filter(AgentProduct.slug == slug).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if str(agent.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(agent, field, value)
    db.commit()
    return (
        db.query(AgentProduct)
        .options(joinedload(AgentProduct.author))
        .filter(AgentProduct.id == agent.id)
        .one()
    )


@router.delete("/{slug}", status_code=204)
def delete_agent_product(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    agent = db.query(AgentProduct).filter(AgentProduct.slug == slug).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    if str(agent.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(agent)
    db.commit()
