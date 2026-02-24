from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date as date_type, datetime
from decimal import Decimal
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.schemas.writeoff import WriteOffCreate, WriteOffUpdate, WriteOffResponse
from app.models.writeoff import WriteOff, WriteOffItem
from app.models.inventory import Inventory, InventoryTransaction
from app.models.user import User, Role
from app.models.department import Department
from app.models.product import Product

router = APIRouter()


def generate_writeoff_number(db: Session) -> str:
    """Генерувати номер списання"""
    # Формат: WRT-YYYYMMDD-XXX
    today = datetime.now()
    prefix = f"WRT-{today.strftime('%Y%m%d')}"

    # Знайти останній номер за сьогодні
    last_writeoff = db.query(WriteOff).filter(
        WriteOff.number.like(f"{prefix}%")
    ).order_by(WriteOff.number.desc()).first()

    if last_writeoff:
        last_num = int(last_writeoff.number.split('-')[-1])
        new_num = last_num + 1
    else:
        new_num = 1

    return f"{prefix}-{new_num:03d}"


@router.get("/", response_model=List[WriteOffResponse])
def list_writeoffs(
    skip: int = 0,
    limit: int = 100,
    status: Optional[str] = Query(None, description="Filter by status"),
    department_id: Optional[int] = None,
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Список списань з фільтрами"""
    query = db.query(WriteOff)

    # department_head бачить тільки списання свого підрозділу
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and role.name == "department_head":
        department_id = current_user.department_id

    if status:
        query = query.filter(WriteOff.status == status)

    if department_id:
        query = query.filter(WriteOff.department_id == department_id)

    if date_from:
        query = query.filter(WriteOff.date >= date_from)

    if date_to:
        query = query.filter(WriteOff.date <= date_to)

    writeoffs = query.order_by(WriteOff.date.desc()).offset(skip).limit(limit).all()
    return writeoffs


@router.get("/{writeoff_id}", response_model=WriteOffResponse)
def get_writeoff(
    writeoff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Отримати списання за ID"""
    writeoff = db.query(WriteOff).filter(WriteOff.id == writeoff_id).first()
    if not writeoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Write-off not found"
        )
    return writeoff


@router.post("/", response_model=WriteOffResponse, status_code=status.HTTP_201_CREATED)
def create_writeoff(
    writeoff: WriteOffCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Створити нове списання (draft) - будь-який користувач"""
    # department_head може подавати тільки для свого підрозділу
    role = db.query(Role).filter(Role.id == current_user.role_id).first()
    if role and role.name == "department_head":
        if writeoff.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Ви можете подавати списання тільки для свого підрозділу"
            )

    # Validate department exists
    department = db.query(Department).filter(Department.id == writeoff.department_id).first()
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    # Validate products exist and check inventory
    for item in writeoff.items:
        product = db.query(Product).filter(Product.id == item.product_id).first()
        if not product:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Товар з ID {item.product_id} не знайдено"
            )

        # Check if department has enough stock
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == writeoff.department_id
        ).first()

        if not inventory:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Товар '{product.name}' відсутній на складі '{department.name}'"
            )

        if inventory.quantity < item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Недостатньо товару '{product.name}' на складі '{department.name}'. Доступно: {inventory.quantity}, запитано: {item.quantity}"
            )

    # Generate writeoff number
    writeoff_number = generate_writeoff_number(db)

    # Create writeoff
    db_writeoff = WriteOff(
        number=writeoff_number,
        date=writeoff.date,
        department_id=writeoff.department_id,
        reason=writeoff.reason,
        total_cost=Decimal(0),  # Will be calculated on confirm
        status="draft",
        created_by=current_user.id,
        notes=writeoff.notes
    )
    db.add(db_writeoff)
    db.flush()  # Get writeoff ID

    # Create writeoff items
    for item in writeoff.items:
        db_item = WriteOffItem(
            writeoff_id=db_writeoff.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_cost=None,  # Will be set on confirm
            total_cost=None,  # Will be set on confirm
            notes=item.notes
        )
        db.add(db_item)

    db.commit()
    db.refresh(db_writeoff)
    return db_writeoff


@router.post("/{writeoff_id}/confirm", response_model=WriteOffResponse)
def confirm_writeoff(
    writeoff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Підтвердити списання та оновити залишки (КРИТИЧНО: з вартістю) - тільки адмін"""
    writeoff = db.query(WriteOff).filter(WriteOff.id == writeoff_id).first()
    if not writeoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Write-off not found"
        )

    if writeoff.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Write-off is already {writeoff.status}"
        )

    total_cost = Decimal(0)

    # Process each item
    for item in writeoff.items:
        # Check if department has enough stock
        inventory = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == writeoff.department_id
        ).first()

        if not inventory or inventory.quantity < item.quantity:
            product = db.query(Product).filter(Product.id == item.product_id).first()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Insufficient stock for product '{product.name}' in department"
            )

        # Calculate average cost from department (КРИТИЧНО для аналітики)
        avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.to_department_id == writeoff.department_id,
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

        # Decrease inventory
        inventory.quantity -= item.quantity

        # Create transaction for write-off (КРИТИЧНО: з вартістю)
        transaction = InventoryTransaction(
            transaction_type="writeoff",  # Списання
            product_id=item.product_id,
            from_department_id=writeoff.department_id,
            quantity=item.quantity,
            unit_cost=avg_cost,  # КРИТИЧНО: Собівартість
            reference_id=writeoff.id,
            reference_type="writeoff",
            performed_by=current_user.id,
            notes=f"Write-off: {writeoff.reason}"
        )
        db.add(transaction)

    # Update writeoff status and total cost
    writeoff.status = "confirmed"
    writeoff.total_cost = total_cost

    db.commit()
    db.refresh(writeoff)

    # Telegram сповіщення (не зупиняємо процес якщо Telegram недоступний)
    try:
        from app.services.notifications import notify_writeoff_confirmed, notify_low_stock
        dept = db.query(Department).filter(Department.id == writeoff.department_id).first()
        notify_writeoff_confirmed(
            number=writeoff.number,
            department=dept.name if dept else "—",
            items_count=len(writeoff.items),
            total=float(writeoff.total_cost),
            date=str(writeoff.date),
            confirmed_by=current_user.username,
        )
        # Перевіряємо чи якийсь товар тепер нижче мінімуму
        low_items = []
        for item in writeoff.items:
            inv = db.query(Inventory).filter(
                Inventory.product_id == item.product_id,
                Inventory.department_id == writeoff.department_id,
            ).first()
            prod = db.query(Product).filter(Product.id == item.product_id).first()
            if inv and prod and prod.min_stock_level > 0 and inv.quantity < prod.min_stock_level:
                low_items.append({
                    "product_name": prod.name,
                    "department_name": dept.name if dept else "—",
                    "quantity": float(inv.quantity),
                    "min_stock_level": float(prod.min_stock_level),
                })
        if low_items:
            notify_low_stock(low_items)
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"Telegram notification error: {e}")

    return writeoff


@router.put("/{writeoff_id}", response_model=WriteOffResponse)
def update_writeoff(
    writeoff_id: int,
    writeoff: WriteOffUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Оновити списання (тільки draft)"""
    db_writeoff = db.query(WriteOff).filter(WriteOff.id == writeoff_id).first()
    if not db_writeoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Write-off not found"
        )

    if db_writeoff.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only update draft write-offs"
        )

    # Update fields
    for field, value in writeoff.model_dump(exclude_unset=True).items():
        setattr(db_writeoff, field, value)

    db.commit()
    db.refresh(db_writeoff)
    return db_writeoff


@router.delete("/{writeoff_id}", status_code=status.HTTP_204_NO_CONTENT)
def cancel_writeoff(
    writeoff_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Скасувати списання (тільки draft)"""
    db_writeoff = db.query(WriteOff).filter(WriteOff.id == writeoff_id).first()
    if not db_writeoff:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Write-off not found"
        )

    if db_writeoff.status != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only cancel draft write-offs"
        )

    db_writeoff.status = "cancelled"
    db.commit()
    return None
