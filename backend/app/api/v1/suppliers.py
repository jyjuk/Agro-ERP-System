from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api.deps import get_db, get_current_user
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.models.supplier import Supplier
from app.models.user import User

router = APIRouter()


def generate_supplier_code(db: Session) -> str:
    """Генерувати унікальний код постачальника: SUP-0001, SUP-0002, ..."""
    # Знайти останній код
    last_supplier = db.query(Supplier).order_by(Supplier.id.desc()).first()

    if last_supplier and last_supplier.code and last_supplier.code.startswith('SUP-'):
        try:
            last_num = int(last_supplier.code.split('-')[1])
            new_num = last_num + 1
        except (IndexError, ValueError):
            new_num = 1
    else:
        new_num = 1

    return f"SUP-{new_num:04d}"


@router.get("/", response_model=List[SupplierResponse])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of suppliers"""
    query = db.query(Supplier)
    if active_only:
        query = query.filter(Supplier.is_active == True)

    suppliers = query.offset(skip).limit(limit).all()
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierResponse)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get supplier by ID"""
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )
    return supplier


@router.post("/", response_model=SupplierResponse, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new supplier (код генерується автоматично)"""
    # Автогенерація коду
    code = generate_supplier_code(db)

    # Створити постачальника з автогенерованим кодом
    supplier_data = supplier.model_dump()
    supplier_data['code'] = code

    db_supplier = Supplier(**supplier_data)
    db.add(db_supplier)
    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: int,
    supplier: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update supplier (код не можна змінити)"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    # Update fields (код автоматично виключається, оскільки його немає в SupplierUpdate)
    for field, value in supplier.model_dump(exclude_unset=True).items():
        setattr(db_supplier, field, value)

    db.commit()
    db.refresh(db_supplier)
    return db_supplier


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete supplier (set is_active=False)"""
    db_supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not db_supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    db_supplier.is_active = False
    db.commit()
    return None
