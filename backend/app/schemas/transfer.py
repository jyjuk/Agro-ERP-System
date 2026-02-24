from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal


# Simple responses for nested objects
class ProductSimple(BaseModel):
    id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class TransferItemBase(BaseModel):
    product_id: int
    quantity: Decimal
    notes: Optional[str] = None


class TransferItemCreate(TransferItemBase):
    pass


class TransferItemResponse(TransferItemBase):
    id: int
    unit_cost: Optional[Decimal] = None  # КРИТИЧНО: Собівартість
    total_cost: Optional[Decimal] = None  # КРИТИЧНО: quantity * unit_cost

    model_config = ConfigDict(from_attributes=True)


class TransferItemWithProduct(TransferItemResponse):
    product: Optional[ProductSimple] = None


class TransferBase(BaseModel):
    date: date  # КРИТИЧНО: Дата переміщення
    from_department_id: int  # З якого підрозділу
    to_department_id: int  # На який підрозділ
    notes: Optional[str] = None


class TransferCreate(TransferBase):
    items: List[TransferItemCreate]


class TransferUpdate(BaseModel):
    date: Optional[date] = None
    from_department_id: Optional[int] = None
    to_department_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class TransferResponse(TransferBase):
    id: int
    number: str  # Автоматично згенерований номер (TRF-YYYYMMDD-XXX)
    status: str  # draft, confirmed, cancelled
    total_cost: Decimal  # КРИТИЧНО: Загальна вартість
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[TransferItemWithProduct] = []
    from_department: Optional[DepartmentSimple] = None
    to_department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)
