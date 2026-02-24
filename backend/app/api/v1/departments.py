from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.models.department import Department
from app.models.user import User
from pydantic import BaseModel, ConfigDict

router = APIRouter()


class DepartmentResponse(BaseModel):
    id: int
    name: str
    type: str
    is_main_warehouse: bool
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


@router.get("/", response_model=List[DepartmentResponse])
def list_departments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Список підрозділів"""
    departments = db.query(Department).filter(Department.is_active == True).all()
    return departments
