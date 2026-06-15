"""
Skills marketplace endpoints.
"""
import uuid
import re
import logging

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.deps import get_current_user, optional_user
from app.models.models import Skill, SkillPurchase, User
from app.schemas.schemas import (
    SkillCreate, SkillUpdate, SkillOut, SkillSummary,
    CheckoutRequest, SkillPurchaseOut,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/skills", tags=["skills"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", slug).strip("-")[:180]


def _unique_slug(base: str, db: Session) -> str:
    slug = base
    n = 1
    while db.query(Skill).filter(Skill.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _mock_charge(card_number: str) -> str:
    last4 = card_number.replace(" ", "")[-4:]
    return f"mock_txn_{last4}_{uuid.uuid4().hex[:8]}"


# ── Purchase sub-routes (before /{slug} to avoid path collision) ──

@router.get("/purchases/me", response_model=list[SkillPurchaseOut])
def my_skill_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(SkillPurchase)
        .options(joinedload(SkillPurchase.skill).joinedload(Skill.author))
        .filter(SkillPurchase.user_id == current_user.id)
        .order_by(SkillPurchase.purchased_at.desc())
        .all()
    )


@router.get("/purchases/check/{slug}")
def check_skill_purchase(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.query(Skill).filter(Skill.slug == slug).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    is_owner = str(skill.author_id) == str(current_user.id)
    purchased = (
        db.query(SkillPurchase)
        .filter(
            SkillPurchase.user_id == current_user.id,
            SkillPurchase.skill_id == skill.id,
        )
        .first()
    ) is not None
    return {"purchased": purchased or is_owner, "price": skill.price}


@router.post("/purchases/{slug}", response_model=SkillPurchaseOut)
def purchase_skill(
    slug: str,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.query(Skill).filter(Skill.slug == slug).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if not skill.price or skill.price <= 0:
        raise HTTPException(status_code=400, detail="This skill is free")
    if str(skill.author_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You own this skill")

    existing = (
        db.query(SkillPurchase)
        .filter(
            SkillPurchase.user_id == current_user.id,
            SkillPurchase.skill_id == skill.id,
        )
        .first()
    )
    if existing:
        return (
            db.query(SkillPurchase)
            .options(joinedload(SkillPurchase.skill).joinedload(Skill.author))
            .filter(SkillPurchase.id == existing.id)
            .one()
        )

    payment_ref = _mock_charge(body.card_number)
    purchase = SkillPurchase(
        user_id=current_user.id,
        skill_id=skill.id,
        amount_paid=skill.price,
        payment_ref=payment_ref,
        status="completed",
    )
    db.add(purchase)
    skill.purchase_count = (skill.purchase_count or 0) + 1
    db.commit()
    db.refresh(purchase)
    return (
        db.query(SkillPurchase)
        .options(joinedload(SkillPurchase.skill).joinedload(Skill.author))
        .filter(SkillPurchase.id == purchase.id)
        .one()
    )


# ── CRUD ──────────────────────────────────────────────────────────

@router.get("", response_model=list[SkillSummary])
def list_skills(
    q: str | None = Query(None),
    category: str | None = Query(None),
    skip: int = 0,
    limit: int = Query(100, le=200),
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    qry = (
        db.query(Skill)
        .options(joinedload(Skill.author))
        .filter(Skill.status == "published")
    )
    if q:
        qry = qry.filter(Skill.name.ilike(f"%{q}%"))
    if category:
        qry = qry.filter(Skill.category == category)
    return qry.order_by(Skill.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=SkillOut, status_code=201)
def create_skill(
    body: SkillCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = _unique_slug(_slugify(body.name), db)
    skill = Skill(slug=slug, author_id=current_user.id, **body.model_dump())
    db.add(skill)
    db.commit()
    db.refresh(skill)
    return (
        db.query(Skill)
        .options(joinedload(Skill.author))
        .filter(Skill.id == skill.id)
        .one()
    )


@router.get("/{slug}", response_model=SkillOut)
def get_skill(
    slug: str,
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    skill = (
        db.query(Skill)
        .options(joinedload(Skill.author))
        .filter(Skill.slug == slug)
        .first()
    )
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    skill.view_count = (skill.view_count or 0) + 1
    db.commit()
    return skill


@router.patch("/{slug}", response_model=SkillOut)
def update_skill(
    slug: str,
    body: SkillUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.query(Skill).filter(Skill.slug == slug).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if str(skill.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(skill, field, value)
    db.commit()
    return (
        db.query(Skill)
        .options(joinedload(Skill.author))
        .filter(Skill.id == skill.id)
        .one()
    )


@router.delete("/{slug}", status_code=204)
def delete_skill(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    skill = db.query(Skill).filter(Skill.slug == slug).first()
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")
    if str(skill.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(skill)
    db.commit()
