from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from typing import List, Optional
from datetime import date as date_type
from decimal import Decimal
from app.api.deps import get_db, get_current_user
from app.models.user import User, Role
from app.schemas.inventory import (
    InventoryResponse,
    InventoryTransactionResponse,
    DepartmentInventorySummary,
    InventoryValueResponse,
    LowStockItemResponse
)
from app.models.inventory import Inventory, InventoryTransaction
from app.models.product import Product
from app.models.department import Department

router = APIRouter()


@router.get("/", response_model=List[InventoryResponse])
def list_inventory(
    skip: int = 0,
    limit: int = 100,
    department_id: Optional[int] = None,
    product_id: Optional[int] = None,
    show_zero: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Список залишків по складах"""
    query = db.query(Inventory)

    # department_head бачить тільки свій підрозділ
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and role.name == "department_head":
        department_id = current_user.department_id

    if department_id:
        query = query.filter(Inventory.department_id == department_id)

    if product_id:
        query = query.filter(Inventory.product_id == product_id)

    if not show_zero:
        query = query.filter(Inventory.quantity > 0)

    inventory_list = query.offset(skip).limit(limit).all()

    # Calculate available quantity
    for inv in inventory_list:
        inv.available_quantity = inv.quantity - inv.reserved_quantity

    return inventory_list


@router.get("/department/{department_id}/summary", response_model=DepartmentInventorySummary)
def get_department_summary(
    department_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Підсумок залишків по підрозділу"""
    department = db.query(Department).filter(Department.id == department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Count items
    total_items = db.query(func.count(Inventory.id)).filter(
        Inventory.department_id == department_id,
        Inventory.quantity > 0
    ).scalar()

    # Calculate total value (потрібен розрахунок середньої собівартості)
    inventory_items = db.query(Inventory).filter(
        Inventory.department_id == department_id,
        Inventory.quantity > 0
    ).all()

    total_value = Decimal(0)
    for item in inventory_items:
        # Отримати середню собівартість з останніх транзакцій
        avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.to_department_id == department_id,
            InventoryTransaction.unit_cost.isnot(None)
        ).scalar()

        if avg_cost:
            # Convert to Decimal to avoid type mismatch
            total_value += item.quantity * Decimal(str(avg_cost))

    return {
        "department_id": department_id,
        "department_name": department.name,
        "total_items": total_items or 0,
        "total_value": total_value
    }


@router.get("/value", response_model=List[InventoryValueResponse])
def get_inventory_values(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримати вартість залишків (КРИТИЧНО для аналітики)"""
    query = db.query(Inventory).filter(Inventory.quantity > 0)

    if department_id:
        query = query.filter(Inventory.department_id == department_id)

    inventory_items = query.all()

    result = []
    for item in inventory_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        department = db.query(Department).filter(Department.id == item.department_id).first()

        # Розрахувати середню собівартість
        avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.to_department_id == item.department_id,
            InventoryTransaction.unit_cost.isnot(None)
        ).scalar()

        if not avg_cost:
            avg_cost = Decimal(0)
        else:
            # Convert to Decimal to avoid type mismatch
            avg_cost = Decimal(str(avg_cost))

        total_value = item.quantity * avg_cost

        result.append({
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "department_id": item.department_id,
            "department_name": department.name if department else "Unknown",
            "quantity": item.quantity,
            "average_cost": avg_cost,
            "total_value": total_value
        })

    return result


@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def list_transactions(
    skip: int = 0,
    limit: int = 100,
    product_id: Optional[int] = None,
    department_id: Optional[int] = None,
    transaction_type: Optional[str] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Історія руху товарів (КРИТИЧНО: з датою та вартістю)"""
    query = db.query(InventoryTransaction)

    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)

    if department_id:
        query = query.filter(
            (InventoryTransaction.from_department_id == department_id) |
            (InventoryTransaction.to_department_id == department_id)
        )

    if transaction_type:
        query = query.filter(InventoryTransaction.transaction_type == transaction_type)

    if date_from:
        query = query.filter(InventoryTransaction.created_at >= date_from)

    if date_to:
        query = query.filter(InventoryTransaction.created_at <= date_to)

    transactions = query.order_by(desc(InventoryTransaction.created_at)).offset(skip).limit(limit).all()
    return transactions


@router.get("/low-stock", response_model=List[LowStockItemResponse])
def get_low_stock_items(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Товари з низькими залишками (< min_stock_level)"""
    # Join with products to check min_stock_level
    low_stock_items = db.query(Inventory).join(Product).filter(
        Inventory.quantity < Product.min_stock_level,
        Product.min_stock_level > 0,
        Inventory.quantity > 0
    ).all()

    result = []
    for item in low_stock_items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        department = db.query(Department).filter(Department.id == item.department_id).first()

        result.append({
            "product_id": item.product_id,
            "product_name": product.name if product else "Unknown",
            "department_id": item.department_id,
            "department_name": department.name if department else "Unknown",
            "quantity": item.quantity,
            "min_stock_level": product.min_stock_level if product else 0
        })

    return result
