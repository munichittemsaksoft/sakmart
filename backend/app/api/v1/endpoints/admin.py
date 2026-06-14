"""
Admin-only endpoints — manage users, templates, and system settings.
"""
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.session import get_db
from app.core.deps import require_admin, require_super_admin
from app.models.models import User, Template, Fork, Star, Review, UserRole, TemplateStatus
from app.schemas.schemas import UserOut, TemplateOut, Page, TemplateSummary
from app.core.config import settings

router = APIRouter(prefix="/admin", tags=["admin"])

VALID_ROLES = [r.value for r in UserRole]


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


# ── Users (super_admin only) ──────────────────────────────────

@router.get("/users", response_model=Page[UserOut])
def list_users(
    page: int = 1, size: int = 20,
    db: Session = Depends(get_db),
    _: User = Depends(require_super_admin),
):
    q = db.query(User)
    total = q.count()
    items = q.order_by(User.created_at.desc()).offset((page - 1) * size).limit(size).all()
    return Page(items=items, total=total, page=page, size=size, pages=math.ceil(total / size) or 1)


@router.patch("/users/{user_id}/role")
def set_user_role(
    user_id: str,
    role: str,
    db: Session = Depends(get_db),
    caller: User = Depends(require_super_admin),
):
    if role not in VALID_ROLES:
        raise HTTPException(400, f"Invalid role. Must be one of: {VALID_ROLES}")
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    # Prevent demoting another super_admin (only self-demotion allowed)
    if target.role == UserRole.super_admin.value and str(target.id) != str(caller.id):
        raise HTTPException(403, "Cannot change another super admin's role")
    target.role = role
    db.commit()
    return {"id": user_id, "role": role}


@router.patch("/users/{user_id}/active")
def toggle_user_active(
    user_id: str,
    active: bool,
    db: Session = Depends(get_db),
    caller: User = Depends(require_super_admin),
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.role == UserRole.super_admin.value and str(target.id) != str(caller.id):
        raise HTTPException(403, "Cannot deactivate another super admin")
    target.is_active = active
    db.commit()
    return {"id": user_id, "is_active": active}


# ── Templates (admin + super_admin) ──────────────────────────

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
    template_id: str,
    status: str,
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


# ── System settings ────────────────────────────────────────

@router.get("/settings")
def get_system_settings(_: User = Depends(require_admin)):
    return {
        "app_name":                    settings.app_name,
        "app_env":                     settings.app_env,
        "storage_backend":             settings.storage_backend,
        "azure_container":             settings.azure_container_name if settings.storage_backend == "azure" else None,
        "local_upload_dir":            settings.local_upload_dir if settings.storage_backend == "local" else None,
        "cors_origins":                settings.cors_origins,
        "default_page_size":           settings.default_page_size,
        "access_token_expire_minutes": settings.access_token_expire_minutes,
        "refresh_token_expire_days":   settings.refresh_token_expire_days,
    }
