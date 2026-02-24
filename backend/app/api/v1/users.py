from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_admin_user
from app.models.user import User, Role
from app.models.department import Department
from app.core.security import get_password_hash
from pydantic import BaseModel, ConfigDict

router = APIRouter()


# Schemas
class RoleInfo(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentInfo(BaseModel):
    id: int
    name: str
    type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UserCreate(BaseModel):
    username: str
    password: str
    role_id: int
    department_id: Optional[int] = None
    is_active: bool = True


class UserUpdate(BaseModel):
    username: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    department_id: Optional[int] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: int
    username: str
    role_id: int
    department_id: Optional[int] = None
    is_active: bool
    role: Optional[RoleInfo] = None
    department: Optional[DepartmentInfo] = None

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=List[UserResponse])
def list_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Список користувачів - тільки адмін"""
    users = db.query(User).offset(skip).limit(limit).all()
    return users


@router.get("/{user_id}", response_model=UserResponse)
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Отримати користувача за ID - тільки адмін"""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Створити користувача - тільки адмін"""
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == user.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Validate role exists
    role = db.query(Role).filter(Role.id == user.role_id).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    # Validate department if provided
    if user.department_id is not None:
        department = db.query(Department).filter(Department.id == user.department_id).first()
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

    # Create user
    db_user = User(
        username=user.username,
        password_hash=get_password_hash(user.password),
        role_id=user.role_id,
        department_id=user.department_id,
        is_active=user.is_active
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Оновити користувача - тільки адмін"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Check if username already exists (if changing)
    if user.username and user.username != db_user.username:
        existing_user = db.query(User).filter(User.username == user.username).first()
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already exists"
            )

    # Update fields
    update_data = user.model_dump(exclude_unset=True)

    # Hash password if provided
    if 'password' in update_data:
        update_data['password_hash'] = get_password_hash(update_data.pop('password'))

    for field, value in update_data.items():
        setattr(db_user, field, value)

    db.commit()
    db.refresh(db_user)
    return db_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Видалити користувача - тільки адмін"""
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Prevent deleting yourself
    if db_user.id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete yourself"
        )

    db.delete(db_user)
    db.commit()
    return None


@router.get("/roles/list", response_model=List[dict])
def list_roles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Список ролей - тільки адмін"""
    roles = db.query(Role).all()
    return [{"id": role.id, "name": role.name, "description": role.description} for role in roles]
