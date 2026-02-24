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


class SupplierSimple(BaseModel):
    id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class PurchaseItemBase(BaseModel):
    product_id: int
    quantity: Decimal
    unit_price: Decimal  # КРИТИЧНО: Ціна за одиницю
    notes: Optional[str] = None


class PurchaseItemCreate(PurchaseItemBase):
    pass


class PurchaseItemResponse(PurchaseItemBase):
    id: int
    total_price: Decimal  # КРИТИЧНО: quantity * unit_price

    model_config = ConfigDict(from_attributes=True)


class PurchaseItemWithProduct(PurchaseItemResponse):
    product: Optional[ProductSimple] = None


class PurchaseBase(BaseModel):
    date: date  # КРИТИЧНО: Дата закупівлі
    supplier_id: int
    department_id: int  # Куди оприбуткувати (Основний склад)
    notes: Optional[str] = None


class PurchaseCreate(PurchaseBase):
    items: List[PurchaseItemCreate]


class PurchaseUpdate(BaseModel):
    date: Optional[date] = None
    supplier_id: Optional[int] = None
    department_id: Optional[int] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class PurchaseResponse(PurchaseBase):
    id: int
    number: str  # Автоматично згенерований номер
    total_amount: Decimal  # КРИТИЧНО: Загальна вартість
    status: str  # draft, confirmed, received, cancelled
    created_by: Optional[int] = None
    created_at: datetime
    updated_at: datetime
    items: List[PurchaseItemWithProduct] = []
    supplier: Optional[SupplierSimple] = None
    department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)
