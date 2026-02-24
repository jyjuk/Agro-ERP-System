from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
from decimal import Decimal


class ProductSimple(BaseModel):
    id: int
    name: str
    code: str

    model_config = ConfigDict(from_attributes=True)


class DepartmentSimple(BaseModel):
    id: int
    name: str

    model_config = ConfigDict(from_attributes=True)


class InventoryResponse(BaseModel):
    id: int
    product_id: int
    department_id: int
    quantity: Decimal
    reserved_quantity: Decimal
    available_quantity: Decimal  # quantity - reserved_quantity
    product: Optional[ProductSimple] = None
    department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryTransactionResponse(BaseModel):
    id: int
    transaction_type: str  # receipt, issue, transfer, adjustment
    product_id: int
    from_department_id: Optional[int] = None
    to_department_id: Optional[int] = None
    quantity: Decimal
    unit_cost: Optional[Decimal] = None  # КРИТИЧНО: Собівартість
    reference_id: Optional[int] = None
    reference_type: Optional[str] = None
    performed_by: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime  # КРИТИЧНО: Дата транзакції
    product: Optional[ProductSimple] = None
    from_department: Optional[DepartmentSimple] = None
    to_department: Optional[DepartmentSimple] = None

    model_config = ConfigDict(from_attributes=True)


class DepartmentInventorySummary(BaseModel):
    """Підсумок по залишках підрозділу"""
    department_id: int
    department_name: str
    total_items: int  # Кількість позицій
    total_value: Decimal  # Загальна вартість залишків


class InventoryValueResponse(BaseModel):
    """Вартість залишків товару"""
    product_id: int
    product_name: str
    department_id: int
    department_name: str
    quantity: Decimal
    average_cost: Decimal  # Середня собівартість
    total_value: Decimal  # quantity * average_cost


class LowStockItemResponse(BaseModel):
    """Товар з низьким залишком"""
    product_id: int
    product_name: str
    department_id: int
    department_name: str
    quantity: Decimal
    min_stock_level: Decimal
