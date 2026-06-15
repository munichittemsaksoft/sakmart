"""
Mock payment / purchase endpoints.
POST /purchases/{slug}  — buy a template (mock payment, always succeeds)
GET  /purchases/me      — list current user's purchases
"""
import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.deps import get_current_user
from app.models.models import Purchase, Template, User
from app.schemas.schemas import CheckoutRequest, PurchaseOut

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/purchases", tags=["purchases"])


def _mock_charge(card_number: str, amount: int) -> str:
    """Simulate a payment processor. Always approves, returns a fake transaction id."""
    last4 = card_number.replace(" ", "")[-4:]
    return f"mock_txn_{last4}_{uuid.uuid4().hex[:8]}"


@router.post("/{slug}", response_model=PurchaseOut)
def purchase_template(
    slug: str,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(Template).filter(Template.slug == slug).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    if not template.price or template.price <= 0:
        raise HTTPException(status_code=400, detail="This template is free — no purchase needed")

    # Owner never needs to buy their own template
    if str(template.author_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You own this template")

    # Idempotent: already purchased
    existing = (
        db.query(Purchase)
        .filter(Purchase.user_id == current_user.id, Purchase.template_id == template.id)
        .first()
    )
    if existing:
        return existing

    payment_ref = _mock_charge(body.card_number, template.price)
    purchase = Purchase(
        user_id=current_user.id,
        template_id=template.id,
        amount_paid=template.price,
        payment_ref=payment_ref,
        status="completed",
    )
    db.add(purchase)
    db.commit()
    db.refresh(purchase)

    # Eager-load template for the response
    purchase = (
        db.query(Purchase)
        .options(joinedload(Purchase.template).joinedload(Template.author))
        .filter(Purchase.id == purchase.id)
        .one()
    )
    logger.info("Purchase completed: user=%s template=%s ref=%s", current_user.id, slug, payment_ref)
    return purchase


@router.get("/me", response_model=list[PurchaseOut])
def my_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    purchases = (
        db.query(Purchase)
        .options(joinedload(Purchase.template).joinedload(Template.author))
        .filter(Purchase.user_id == current_user.id)
        .order_by(Purchase.purchased_at.desc())
        .all()
    )
    return purchases


@router.get("/check/{slug}")
def check_purchase(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Returns {purchased: bool} for the current user and template slug."""
    template = db.query(Template).filter(Template.slug == slug).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    is_owner = str(template.author_id) == str(current_user.id)
    purchased = (
        db.query(Purchase)
        .filter(Purchase.user_id == current_user.id, Purchase.template_id == template.id)
        .first()
    ) is not None

    return {"purchased": purchased or is_owner, "price": template.price}
