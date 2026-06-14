from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token
from app.db.session import get_db
from app.models.models import User, UserRole

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

ADMIN_ROLES = {UserRole.admin.value, UserRole.super_admin.value}


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise creds_exc
        user_id: str = payload.get("sub")
        if not user_id:
            raise creds_exc
    except JWTError:
        raise creds_exc

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise creds_exc
    return user


def is_admin(user: User) -> bool:
    """True for admin and super_admin."""
    return user.role in ADMIN_ROLES


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Allows admin and super_admin."""
    if not is_admin(user):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    """Allows only super_admin."""
    if user.role != UserRole.super_admin.value:
        raise HTTPException(status_code=403, detail="Super admin access required")
    return user


def optional_user(
    token: str | None = Depends(OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)),
    db: Session = Depends(get_db),
) -> User | None:
    if not token:
        return None
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None
