from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional


class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    bank_details: Optional[str] = None


class SupplierCreate(SupplierBase):
    pass


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    tax_id: Optional[str] = None
    bank_details: Optional[str] = None
    is_active: Optional[bool] = None


class SupplierResponse(SupplierBase):
    id: int
    code: str  # Автогенерований код
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
