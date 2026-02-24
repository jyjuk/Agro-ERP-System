from pydantic import BaseModel, ConfigDict
from datetime import date as date_type
from decimal import Decimal
from typing import Optional, List


# Nested schemas for relationships
class ProductInfo(BaseModel):
    id: int
    code: str
    name: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentInfo(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class UserInfo(BaseModel):
    id: int
    username: str

    model_config = ConfigDict(from_attributes=True)


class WriteOffItemBase(BaseModel):
    product_id: int
    quantity: Decimal
    notes: Optional[str] = None


class WriteOffItemCreate(WriteOffItemBase):
    pass


class WriteOffItemResponse(WriteOffItemBase):
    id: int
    writeoff_id: int
    unit_cost: Optional[Decimal] = None
    total_cost: Optional[Decimal] = None
    product: Optional[ProductInfo] = None

    model_config = ConfigDict(from_attributes=True)


class WriteOffBase(BaseModel):
    date: date_type
    department_id: int
    reason: str
    notes: Optional[str] = None


class WriteOffCreate(WriteOffBase):
    items: List[WriteOffItemCreate]


class WriteOffUpdate(BaseModel):
    date: Optional[date_type] = None
    reason: Optional[str] = None
    notes: Optional[str] = None


class WriteOffResponse(WriteOffBase):
    id: int
    number: str
    total_cost: Decimal
    status: str
    created_by: int
    items: List[WriteOffItemResponse] = []
    department: Optional[DepartmentInfo] = None
    creator: Optional[UserInfo] = None

    model_config = ConfigDict(from_attributes=True)
