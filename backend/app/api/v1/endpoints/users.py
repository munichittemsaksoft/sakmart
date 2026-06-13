from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.core.deps import get_current_user, optional_user
from app.models.models import User
from app.schemas.schemas import UserOut, UserUpdate, TemplateSummary, Page
from app.services import template_service

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/{username}", response_model=UserOut)
def get_user(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "User not found")
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    data: UserUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{username}/templates", response_model=Page[TemplateSummary])
def user_templates(
    username: str,
    page: int = 1,
    size: int = 12,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(optional_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "User not found")
    # owners and admins see all statuses; everyone else sees only published
    is_owner = current_user and (str(current_user.id) == str(user.id) or current_user.role == "admin")
    status = None if is_owner else "published"
    items, total, pages = template_service.get_templates(
        db, page=page, size=size, status=status, author_id=user.id
    )
    return Page(items=items, total=total, page=page, size=size, pages=pages)
