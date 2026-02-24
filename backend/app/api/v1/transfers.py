from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date as date_type, datetime
from decimal import Decimal
from app.api.deps import get_db, get_current_user, get_current_admin_user, get_current_warehouse_or_above
from app.schemas.transfer import TransferCreate, TransferUpdate, TransferResponse
from app.models.transfer import Transfer, TransferItem
from app.models.inventory import Inventory, InventoryTransaction
from app.models.user import User
from app.models.department import Department
from app.models.product import Product

router = APIRouter()


def generate_transfer_number(db: Session) -> str:
    """Генерувати номер переміщення"""
    # Формат: TRF-YYYYMMDD-XXX
    today = datetime.now()
    prefix = f"TRF-{today.strftime('%Y%m%d')}"

    # Знайти останній номер за сьогодні
    last_transfer = db.query(Transfer).filter(
        Transfer.number.like(f"{prefix}%")
    ).order_by(Transfer.number.desc()).first()

    if last_transfer:
        last_num = int(last_transfer.number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}-{new_num:03d}"


@router.get("/", response_model=List[TransferResponse])
def list_transfers(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status"),
    from_department_id: Optional[int] = None,
    to_department_id: Optional[int] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_warehouse_or_above)
):
    """Список переміщень з фільтрами"""
    query = db.query(Transfer)

    if status:
        query = query.filter(Transfer.status == status)

    if from_department_id:
        query = query.filter(Transfer.from_department_id == from_department_id)

    if to_department_id:
        query = query.filter(Transfer.to_department_id == to_department_id)

    if date_from:
        query = query.filter(Transfer.date >= date_from)

    if date_to:
        query = query.filter(Transfer.date <= date_to)

    transfers = query.order_by(Transfer.date.desc()).offset(skip).limit(limit).all()
    return transfers


@router.get("/{transfer_id}", response_model=TransferResponse)
def get_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_warehouse_or_above)
):
    """Отримати переміщення за ID"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found"
        )
    return transfer


@router.post("/", response_model=TransferResponse, status_code=status.HTTP_201_CREATED)
def create_transfer(
    transfer: TransferCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_warehouse_or_above)
):
    """Створити нове переміщення (draft)"""
    # Validate departments exist
    from_dept = db.query(Department).filter(Department.id == transfer.from_department_id).first()
    if not from_dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source department not found"
        )

    to_dept = db.query(Department).filter(Department.id == transfer.to_department_id).first()
    if not to_dept:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Destination department not found"
        )

    # Can't transfer to the same department
    if transfer.from_department_id == transfer.to_department_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot transfer to the same department"
        )

    # Validate products exist and calculate total (will calculate cost on confirm)
    for item in transfer.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product with ID {item.product_id} not found"
            )

    # Generate transfer number
    transfer_number = generate_transfer_number(db)

    # Create transfer
    db_transfer = Transfer(
        number=transfer_number,
        date=transfer.date,
        from_department_id=transfer.from_department_id,
        to_department_id=transfer.to_department_id,
        total_cost=Decimal(0),  # Will be calculated on confirm
        status="draft",
        created_by=current_user.id,
        notes=transfer.notes
    )
    db.add(db_transfer)
    db.flush()  # Get transfer ID

    # Create transfer items
    for item in transfer.items:
        db_item = TransferItem(
            transfer_id=db_transfer.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=None,  # Will be set on confirm
            total_cost=None,  # Will be set on confirm
            notes=item.notes
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_transfer)
    return db_transfer


@router.post("/{transfer_id}/confirm", response_model=TransferResponse)
def confirm_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Підтвердити переміщення та оновити залишки (КРИТИЧНО: з вартістю) - тільки адмін"""
    transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found"
        )

    if transfer.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Transfer is already {transfer.status}"
        )

    total_cost = Decimal(0)

    # Process each item
    for item in transfer.items:
        # Check if source department has enough stock
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == transfer.from_department_id
        ).first()

        if not inventory or inventory.quantity < item.quantity:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.name}' in source department"
            )

        # Calculate average cost from source department (КРИТИЧНО для аналітики)
        avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.to_department_id == transfer.from_department_id,
            InventoryTransaction.unit_cost.isnot(None)
        ).scalar()

        if not avg_cost:
            avg_cost = Decimal(0)
        else:
            avg_cost = Decimal(str(avg_cost))

        # Calculate item cost
        item.unit_cost = avg_cost
        item.total_cost = item.quantity * avg_cost
        total_cost += item.total_cost

        # Decrease source inventory
        inventory.quantity -= item.quantity

        # Increase destination inventory (or create if doesn't exist)
        dest_inventory = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == transfer.to_department_id
        ).first()

        if not dest_inventory:
            dest_inventory = Inventory(
                product_id=item.product_id,
                department_id=transfer.to_department_id,
                quantity=Decimal(0),
                reserved_quantity=Decimal(0)
            )
            db.add(dest_inventory)
            db.flush()

        dest_inventory.quantity += item.quantity

        # Create transaction for issue from source (КРИТИЧНО: з вартістю)
        issue_transaction = InventoryTransaction(
            transaction_type="issue",  # Видача (списання)
            product_id=item.product_id,
            from_department_id=transfer.from_department_id,
            quantity=item.quantity,
            unit_cost=avg_cost,  # КРИТИЧНО: Собівартість
            reference_id=transfer.id,
            reference_type="transfer",
            performed_by=current_user.id,
            notes=f"Transfer to {transfer.to_department.name}"
        )
        db.add(issue_transaction)

        # Create transaction for receipt to destination (КРИТИЧНО: з вартістю)
        receipt_transaction = InventoryTransaction(
            transaction_type="transfer",  # Переміщення (прихід)
            product_id=item.product_id,
            to_department_id=transfer.to_department_id,
            from_department_id=transfer.from_department_id,
            quantity=item.quantity,
            unit_cost=avg_cost,  # КРИТИЧНО: Собівартість зберігається
            reference_id=transfer.id,
            reference_type="transfer",
            performed_by=current_user.id,
            notes=f"Transfer from {transfer.from_department.name}"
        )
        db.add(receipt_transaction)

    # Update transfer status and total cost
    transfer.status = "confirmed"
    transfer.total_cost = total_cost

    db.commit()
    db.refresh(transfer)
    return transfer


@router.put("/{transfer_id}", response_model=TransferResponse)
def update_transfer(
    transfer_id: int,
    transfer: TransferUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_warehouse_or_above)
):
    """Оновити переміщення (тільки draft)"""
    db_transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not db_transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found"
        )

    if db_transfer.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update draft transfers"
        )

    # Update fields
    for field, value in transfer.model_dump(exclude_unset=True).items():
        setattr(db_transfer, field, value)

    db.commit()
    db.refresh(db_transfer)
    return db_transfer


@router.delete("/{transfer_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_transfer(
    transfer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_warehouse_or_above)
):
    """Скасувати переміщення (тільки draft)"""
    db_transfer = db.query(Transfer).filter(Transfer.id == transfer_id).first()
    if not db_transfer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transfer not found"
        )

    if db_transfer.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel draft transfers"
        )

    db_transfer.status = "cancelled"
    db.commit()
    return None
