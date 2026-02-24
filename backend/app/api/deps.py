from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.core.security import decode_token
from app.models.user import User, Role

security = HTTPBearer()


def get_db() -> Generator:
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user from JWT token"""
    token = credentials.credentials
    payload = decode_token(token)

    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username: str = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )

    return user


def _get_role_name(user: User, db: Session) -> str:
    """Query role name directly from DB to avoid lazy-loading issues"""
    if user.role_id is None:
        return ""
    role = db.query(Role).filter(Role.id == user.role_id).first()
    return role.name if role else ""


def get_current_admin_user(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Get current user and verify they are an admin"""
    if _get_role_name(current_user, db) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin access required."
        )
    return current_user


def get_current_manager_or_admin(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Admin + manager only (purchases)"""
    if _get_role_name(current_user, db) not in ("admin", "manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions."
        )
    return current_user


def get_current_warehouse_or_above(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Admin + manager + warehouse_manager (transfers, write-offs)"""
    if _get_role_name(current_user, db) not in ("admin", "manager", "warehouse_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions."
        )
    return current_user


def get_current_report_reader(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> User:
    """Anyone who can read reports and inventory: admin, manager, warehouse_manager, accountant"""
    if _get_role_name(current_user, db) not in ("admin", "manager", "warehouse_manager", "accountant"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions."
        )
    return current_user
