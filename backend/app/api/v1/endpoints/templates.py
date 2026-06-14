from __future__ import annotations
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, optional_user, is_admin
from app.models.models import User, Template
from app.schemas.schemas import (
    TemplateCreate, TemplateUpdate, TemplateOut, TemplateSummary,
    ForkCreate, ForkOut, ReviewCreate, ReviewOut, Page, AssetOut
)
from app.services import template_service
from app.services.storage import storage
from app.models.models import Asset

router = APIRouter(prefix="/templates", tags=["templates"])


def _get_or_404(db: Session, slug: str) -> Template:
    t = template_service.get_template(db, slug)
    if not t:
        raise HTTPException(404, "Template not found")
    return t


@router.get("", response_model=Page[TemplateSummary])
def list_templates(
    page: int = Query(1, ge=1),
    size: int = Query(12, ge=1, le=100),
    category: str | None = None,
    search: str | None = None,
    tag: str | None = None,
    sort_by: str = Query("created_at", pattern="^(created_at|fork_count|star_count|view_count)$"),
    db: Session = Depends(get_db),
):
    items, total, pages = template_service.get_templates(
        db, page=page, size=size, category=category,
        search=search, tag=tag, sort_by=sort_by
    )
    return Page(items=items, total=total, page=page, size=size, pages=pages)


@router.post("", response_model=TemplateOut, status_code=201)
def create_template(
    data: TemplateCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return template_service.create_template(db, data, user.id)


@router.get("/{slug}", response_model=TemplateOut)
def get_template(slug: str, db: Session = Depends(get_db)):
    return _get_or_404(db, slug)


@router.patch("/{slug}", response_model=TemplateOut)
def update_template(
    slug: str,
    data: TemplateUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    if str(t.author_id) != str(user.id) and not is_admin(user):
        raise HTTPException(403, "Not allowed")
    return template_service.update_template(db, t, data)


@router.delete("/{slug}", status_code=204)
def delete_template(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    if str(t.author_id) != str(user.id) and not is_admin(user):
        raise HTTPException(403, "Not allowed")
    template_service.delete_template(db, t)


@router.post("/{slug}/fork", response_model=ForkOut, status_code=201)
def fork_template(
    slug: str,
    data: ForkCreate = ForkCreate(),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    return template_service.fork_template(db, t, user.id, data)


@router.post("/{slug}/star", status_code=200)
def star_template(
    slug: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    starred = template_service.toggle_star(db, t, user.id)
    return {"starred": starred, "star_count": t.star_count}


@router.get("/{slug}/reviews", response_model=list[ReviewOut])
def list_reviews(slug: str, db: Session = Depends(get_db)):
    t = _get_or_404(db, slug)
    return template_service.get_reviews(db, t.id)


@router.post("/{slug}/reviews", response_model=ReviewOut, status_code=201)
def add_review(
    slug: str,
    data: ReviewCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    return template_service.add_review(db, t, user.id, data)


@router.post("/{slug}/zip", response_model=TemplateOut, status_code=200)
async def upload_zip(
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    if str(t.author_id) != str(user.id) and not is_admin(user):
        raise HTTPException(403, "Not allowed")
    if not file.filename.lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are accepted")

    # Delete previous ZIP if it exists
    if t.zip_storage_key:
        try:
            await storage().delete(t.zip_storage_key)
        except Exception:
            pass

    content = await file.read()
    key, url = await storage().upload(content, file.filename, "application/zip")
    t.zip_storage_key = key
    t.zip_url = url
    db.commit()
    db.refresh(t)
    return t


@router.get("/{slug}/download")
def download_zip(slug: str, db: Session = Depends(get_db)):
    t = _get_or_404(db, slug)
    if not t.zip_storage_key:
        raise HTTPException(404, "No ZIP file available for this template")
    url = storage().download_url(t.zip_storage_key, filename=f"{t.slug}.zip")
    return RedirectResponse(url=url, status_code=302)


@router.post("/{slug}/assets", response_model=AssetOut, status_code=201)
async def upload_asset(
    slug: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    t = _get_or_404(db, slug)
    if str(t.author_id) != str(user.id) and not is_admin(user):
        raise HTTPException(403, "Not allowed")
    content = await file.read()
    key, url = await storage().upload(content, file.filename, file.content_type)
    asset = Asset(
        template_id=t.id,
        filename=file.filename,
        storage_key=key,
        url=url,
        content_type=file.content_type,
        size_bytes=len(content),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset
