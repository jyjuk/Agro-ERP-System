from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date as date_type, datetime
from decimal import Decimal
from app.api.deps import get_db, get_current_user, get_current_admin_user, get_current_manager_or_admin
from app.schemas.purchase import PurchaseCreate, PurchaseUpdate, PurchaseResponse
from app.models.purchase import Purchase, PurchaseItem
from app.models.inventory import Inventory, InventoryTransaction
from app.models.user import User
from app.models.supplier import Supplier
from app.models.department import Department
from app.models.product import Product

router = APIRouter()


def generate_purchase_number(db: Session) -> str:
    """Генерувати номер закупівлі"""
    # Формат: PUR-YYYYMMDD-XXX
    today = datetime.now()
    prefix = f"PUR-{today.strftime('%Y%m%d')}"

    # Знайти останній номер за сьогодні
    last_purchase = db.query(Purchase).filter(
        Purchase.number.like(f"{prefix}%")
    ).order_by(Purchase.number.desc()).first()

    if last_purchase:
        last_num = int(last_purchase.number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}-{new_num:03d}"


@router.get("/", response_model=List[PurchaseResponse])
def list_purchases(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status"),
    supplier_id: Optional[int] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Список закупівель з фільтрами"""
    query = db.query(Purchase)

    if status:
        query = query.filter(Purchase.status == status)

    if supplier_id:
        query = query.filter(Purchase.supplier_id == supplier_id)

    if date_from:
        query = query.filter(Purchase.date >= date_from)

    if date_to:
        query = query.filter(Purchase.date <= date_to)

    purchases = query.order_by(Purchase.date.desc()).offset(skip).limit(limit).all()
    return purchases


@router.get("/{purchase_id}", response_model=PurchaseResponse)
def get_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Отримати закупівлю за ID"""
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )
    return purchase


@router.post("/", response_model=PurchaseResponse, status_code=status.HTTP_201_CREATED)
def create_purchase(
    purchase: PurchaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Створити нову закупівлю (draft)"""
    # Validate supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == purchase.supplier_id).first()
    if not supplier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Supplier not found"
        )

    # Validate department exists
    department = db.query(Department).filter(Department.id == purchase.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Calculate total amount
    total_amount = Decimal(0)
    for item in purchase.items:
        # Validate product exists
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found"
            )
        total_amount += item.quantity * item.unit_price

    # Generate purchase number
    purchase_number = generate_purchase_number(db)

    # Create purchase
    db_purchase = Purchase(
        number=purchase_number,
        date=purchase.date,
        supplier_id=purchase.supplier_id,
        department_id=purchase.department_id,
        total_amount=total_amount,
        status="draft",
        created_by=current_user.id,
        notes=purchase.notes
    )
    db.add(db_purchase)
    db.flush()  # Get purchase ID

    # Create purchase items
    for item in purchase.items:
        total_price = item.quantity * item.unit_price
        db_item = PurchaseItem(
            purchase_id=db_purchase.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
            total_price=total_price,
            notes=item.notes
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_purchase)
    return db_purchase


@router.post("/{purchase_id}/confirm", response_model=PurchaseResponse)
def confirm_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Підтвердити закупівлю та оприбуткувати на склад (Основний склад)"""
    purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    if purchase.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Purchase is already {purchase.status}"
        )

    # Оприбуткувати кожен товар на склад
    for item in purchase.items:
        # Знайти або створити запис inventory
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == purchase.department_id
        ).first()

        if not inventory:
            inventory = Inventory(
                product_id=item.product_id,
                department_id=purchase.department_id,
                quantity=Decimal(0),
                reserved_quantity=Decimal(0)
            )
            db.add(inventory)
            db.flush()

        # Збільшити кількість
        inventory.quantity += item.quantity

        # Створити транзакцію (КРИТИЧНО: з датою та вартістю)
        transaction = InventoryTransaction(
            transaction_type="receipt",  # Прихід
            product_id=item.product_id,
            to_department_id=purchase.department_id,
            quantity=item.quantity,
            unit_cost=item.unit_price,  # КРИТИЧНО: Собівартість = ціна закупівлі
            reference_id=purchase.id,
            reference_type="purchase",
            performed_by=current_user.id
        )
        db.add(transaction)

    # Змінити статус
    purchase.status = "confirmed"

    db.commit()
    db.refresh(purchase)
    return purchase


@router.put("/{purchase_id}", response_model=PurchaseResponse)
def update_purchase(
    purchase_id: int,
    purchase: PurchaseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Оновити закупівлю (тільки draft)"""
    db_purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    if db_purchase.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update draft purchases"
        )

    # Update fields
    for field, value in purchase.model_dump(exclude_unset=True).items():
        setattr(db_purchase, field, value)

    db.commit()
    db.refresh(db_purchase)
    return db_purchase


@router.delete("/{purchase_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_purchase(
    purchase_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_manager_or_admin)
):
    """Скасувати закупівлю (тільки draft)"""
    db_purchase = db.query(Purchase).filter(Purchase.id == purchase_id).first()
    if not db_purchase:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Purchase not found"
        )

    if db_purchase.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel draft purchases"
        )

    db_purchase.status = "cancelled"
    db.commit()
    return None
