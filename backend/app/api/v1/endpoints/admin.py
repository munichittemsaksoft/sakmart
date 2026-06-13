"""
Admin-only endpoints — manage users, templates, and system settings.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_admin
from app.models.models import User, Template, Fork, Star, Review, UserRole, TemplateStatus
from app.schemas.schemas import UserOut, TemplateOut, Page, TemplateSummary
from app.core.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])


# ── Dashboard stats ───────────────────────────────────────────

@router.get("/stats")
def get_stats(db: Session = Depends(get_db), _: User = Depends(require_admin)):
    return {
        "users":      db.query(func.count(User.id)).scalar(),
        "templates":  db.query(func.count(Template.id)).scalar(),
        "published":  db.query(func.count(Template.id)).filter(Template.status == TemplateStatus.published).scalar(),
        "forks":      db.query(func.count(Fork.id)).scalar(),
        "stars":      db.query(func.count(Star.id)).scalar(),
        "reviews":    db.query(func.count(Review.id)).scalar(),
    }


# ── Users ─────────────────────────────────────────────────────

@router.get("/users", response_model=Page[UserOut])
def list_users(
    page: int = 1, size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    q = db.query(User)
    total = q.count()
    import math
    items = q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=math.ceil(total / size))


@router.patch("/users/{user_id}/role")
def set_user_role(
    user_id: str, role: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if role not in [r.value for r in UserRole]:
        raise HTTPException(400, f"Invalid role. Must be one of: {[r.value for r in UserRole]}")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.role = role
    db.commit()
    return {"id": user_id, "role": role}


@router.patch("/users/{user_id}/active")
def toggle_user_active(
    user_id: str, active: bool,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "User not found")
    user.is_active = active
    db.commit()
    return {"id": user_id, "is_active": active}


# ── Templates ────────────────────────────────────────────────

@router.get("/templates", response_model=list[TemplateSummary])
def list_all_templates(
    status: str | None = None,
    page: int = 1, size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    from sqlalchemy.orm import joinedload
    q = db.query(Template).options(joinedload(Template.author))
    if status:
        q = q.filter(Template.status == status)
    return q.order_by(Template.created_at.desc()).offset((page - 1) * size).limit(size).all()


@router.patch("/templates/{template_id}/status")
def set_template_status(
    template_id: str, status: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    if status not in [s.value for s in TemplateStatus]:
        raise HTTPException(400, "Invalid status")
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    t.status = status
    db.commit()
    return {"id": template_id, "status": status}


@router.delete("/templates/{template_id}", status_code=204)
def admin_delete_template(
    template_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    t = db.query(Template).filter(Template.id == template_id).first()
    if not t:
        raise HTTPException(404, "Template not found")
    db.delete(t)
    db.commit()


# ── System settings (read-only, from config) ────────────────

@router.get("/settings")
def get_system_settings(_: User = Depends(require_admin)):
    """Returns the current application configuration (read-only)."""
    return {
        "app_name":           settings.app_name,
        "app_env":            settings.app_env,
        "storage_backend":    settings.storage_backend,
        "azure_container":    settings.azure_container_name if settings.storage_backend == "azure" else None,
        "local_upload_dir":   settings.local_upload_dir if settings.storage_backend == "local" else None,
        "cors_origins":       settings.cors_origins,
        "default_page_size":  settings.default_page_size,
        "access_token_expire_minutes": settings.access_token_expire_minutes,
        "refresh_token_expire_days":   settings.refresh_token_expire_days,
    }
