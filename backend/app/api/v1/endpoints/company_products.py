"""
Company Products marketplace endpoints.
"""
import uuid
import re
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session, joinedload

from app.db.session import get_db
from app.core.deps import get_current_user, optional_user
from app.models.models import CompanyProduct, CompanyAgent, CompanyProductPurchase, User
from app.schemas.schemas import (
    CompanyProductCreate, CompanyProductUpdate, CompanyProductOut, CompanyProductSummary,
    CheckoutRequest, CompanyProductPurchaseOut,
)
from app.services.storage import storage

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/companies", tags=["companies"])


def _slugify(text: str) -> str:
    slug = re.sub(r"[^\w\s-]", "", text.lower())
    return re.sub(r"[\s_-]+", "-", slug).strip("-")[:180]


def _unique_slug(base: str, db: Session) -> str:
    slug = base
    n = 1
    while db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def _mock_charge(card_number: str) -> str:
    last4 = card_number.replace(" ", "")[-4:]
    return f"mock_txn_{last4}_{uuid.uuid4().hex[:8]}"


def _load_company(slug: str, db: Session) -> CompanyProduct:
    company = (
        db.query(CompanyProduct)
        .options(
            joinedload(CompanyProduct.author),
            joinedload(CompanyProduct.agents),
        )
        .filter(CompanyProduct.slug == slug)
        .first()
    )
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


# ── Purchase sub-routes (defined before /{slug}) ──────────────────────────────

@router.get("/purchases/me", response_model=list[CompanyProductPurchaseOut])
def my_company_purchases(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(CompanyProductPurchase)
        .options(joinedload(CompanyProductPurchase.company_product).joinedload(CompanyProduct.author))
        .filter(CompanyProductPurchase.user_id == current_user.id)
        .order_by(CompanyProductPurchase.purchased_at.desc())
        .all()
    )


@router.get("/purchases/check/{slug}")
def check_company_purchase(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    is_owner = str(company.author_id) == str(current_user.id)
    purchased = (
        db.query(CompanyProductPurchase)
        .filter(
            CompanyProductPurchase.user_id == current_user.id,
            CompanyProductPurchase.company_product_id == company.id,
        )
        .first()
    ) is not None
    return {"purchased": purchased or is_owner, "price": company.price}


@router.post("/purchases/{slug}", response_model=CompanyProductPurchaseOut)
def purchase_company(
    slug: str,
    body: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not company.price or company.price <= 0:
        raise HTTPException(status_code=400, detail="This company setup is free")
    if str(company.author_id) == str(current_user.id):
        raise HTTPException(status_code=400, detail="You own this company setup")

    existing = (
        db.query(CompanyProductPurchase)
        .filter(
            CompanyProductPurchase.user_id == current_user.id,
            CompanyProductPurchase.company_product_id == company.id,
        )
        .first()
    )
    if existing:
        return (
            db.query(CompanyProductPurchase)
            .options(joinedload(CompanyProductPurchase.company_product).joinedload(CompanyProduct.author))
            .filter(CompanyProductPurchase.id == existing.id)
            .one()
        )

    payment_ref = _mock_charge(body.card_number)
    purchase = CompanyProductPurchase(
        user_id=current_user.id,
        company_product_id=company.id,
        amount_paid=company.price,
        payment_ref=payment_ref,
        status="completed",
    )
    db.add(purchase)
    company.purchase_count = (company.purchase_count or 0) + 1
    db.commit()
    db.refresh(purchase)
    return (
        db.query(CompanyProductPurchase)
        .options(joinedload(CompanyProductPurchase.company_product).joinedload(CompanyProduct.author))
        .filter(CompanyProductPurchase.id == purchase.id)
        .one()
    )


# ── ZIP upload ────────────────────────────────────────────────────────────────

@router.post("/{slug}/zip", response_model=CompanyProductOut)
async def upload_company_zip(
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if str(company.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    if not file.filename or not file.filename.lower().endswith(".zip"):
        raise HTTPException(status_code=422, detail="Only .zip files are accepted")

    if company.zip_storage_key:
        try:
            await storage().delete(company.zip_storage_key)
        except Exception:
            pass

    content = await file.read()
    key, url = await storage().upload(content, file.filename, "application/zip")
    company.zip_storage_key = key
    company.zip_url = url
    db.commit()
    return _load_company(slug, db)


@router.get("/{slug}/download")
def download_company_zip(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if not company.zip_storage_key:
        raise HTTPException(status_code=404, detail="No ZIP file uploaded")

    is_owner = str(company.author_id) == str(current_user.id)
    is_admin = current_user.role in ("admin", "super_admin")
    is_free = not company.price or company.price <= 0
    purchased = (
        db.query(CompanyProductPurchase)
        .filter(
            CompanyProductPurchase.user_id == current_user.id,
            CompanyProductPurchase.company_product_id == company.id,
        )
        .first()
    ) is not None

    if not (is_owner or is_admin or is_free or purchased):
        raise HTTPException(status_code=403, detail="Purchase required to download")

    from fastapi.responses import RedirectResponse
    url = storage().download_url(company.zip_storage_key, filename=f"{company.slug}.zip")
    return RedirectResponse(url=url)


# ── CRUD ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[CompanyProductSummary])
def list_company_products(
    q: str | None = Query(None),
    industry: str | None = Query(None),
    skip: int = 0,
    limit: int = Query(50, le=100),
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    qry = (
        db.query(CompanyProduct)
        .options(joinedload(CompanyProduct.author))
        .filter(CompanyProduct.status == "published")
    )
    if q:
        qry = qry.filter(CompanyProduct.name.ilike(f"%{q}%"))
    if industry:
        qry = qry.filter(CompanyProduct.industry == industry)
    return qry.order_by(CompanyProduct.created_at.desc()).offset(skip).limit(limit).all()


@router.post("", response_model=CompanyProductOut, status_code=201)
def create_company_product(
    body: CompanyProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    slug = _unique_slug(_slugify(body.name), db)
    agents_data = body.agents
    company_data = body.model_dump(exclude={"agents"})
    company = CompanyProduct(
        slug=slug,
        author_id=current_user.id,
        agent_count=len(agents_data),
        **company_data,
    )
    db.add(company)
    db.flush()

    for i, a in enumerate(agents_data):
        db.add(CompanyAgent(company_id=company.id, position=i, **a.model_dump(exclude={"position"})))

    db.commit()
    return _load_company(slug, db)


@router.get("/{slug}", response_model=CompanyProductOut)
def get_company_product(
    slug: str,
    db: Session = Depends(get_db),
    _user=Depends(optional_user),
):
    company = _load_company(slug, db)
    company.view_count = (company.view_count or 0) + 1
    db.commit()
    return company


@router.patch("/{slug}", response_model=CompanyProductOut)
def update_company_product(
    slug: str,
    body: CompanyProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if str(company.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(company, field, value)
    db.commit()
    return _load_company(slug, db)


@router.delete("/{slug}", status_code=204)
def delete_company_product(
    slug: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    company = db.query(CompanyProduct).filter(CompanyProduct.slug == slug).first()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    if str(company.author_id) != str(current_user.id) and current_user.role not in ("admin", "super_admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    db.delete(company)
    db.commit()
