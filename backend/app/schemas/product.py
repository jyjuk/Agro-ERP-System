from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProductCategoryResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int] = None

    class Config:
        from_attributes = True


class UnitResponse(BaseModel):
    id: int
    name: str
    short_name: str

    class Config:
        from_attributes = True


class ProductBase(BaseModel):
    name: str
    category_id: int
    unit_id: int
    product_type: str  # consumable або spare_part
    description: Optional[str] = None
    min_stock_level: Optional[int] = 0


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    product_type: Optional[str] = None
    description: Optional[str] = None
    min_stock_level: Optional[int] = None
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    id: int
    code: str  # Автогенерований код
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[ProductCategoryResponse] = None
    unit: Optional[UnitResponse] = None

    class Config:
        from_attributes = True
