from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from decimal import Decimal
from datetime import date
from pydantic import BaseModel, ConfigDict

from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.inventory_count import InventoryCount, InventoryCountItem
from app.models.inventory import Inventory, InventoryTransaction
from app.models.department import Department
from app.models.product import Product, Unit
from app.models.user import User

router = APIRouter()


# ──────────────────────────── Schemas ────────────────────────────

class InventoryCountCreate(BaseModel):
    department_id: int
    date: date
    notes: Optional[str] = None


class InventoryCountItemUpdate(BaseModel):
    actual_quantity: Decimal
    notes: Optional[str] = None


class InventoryCountItemsUpdate(BaseModel):
    items: List[dict]   # [{id, actual_quantity, notes?}]


class InventoryCountItemResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    product_code: str
    unit_name: str
    system_quantity: Decimal
    actual_quantity: Decimal
    difference: Decimal
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class InventoryCountResponse(BaseModel):
    id: int
    number: str
    date: date
    department_id: int
    department_name: str
    status: str
    created_by_name: Optional[str] = None
    approved_by_name: Optional[str] = None
    notes: Optional[str] = None
    items_count: int
    discrepancy_count: int

    model_config = ConfigDict(from_attributes=True)


class InventoryCountDetailResponse(InventoryCountResponse):
    items: List[InventoryCountItemResponse] = []


# ──────────────────────────── Helpers ────────────────────────────

def _generate_count_number(db: Session) -> str:
    today = date.today()
    prefix = f"INV-{today.strftime('%Y%m%d')}"
    last = db.query(InventoryCount).filter(
        InventoryCount.number.like(f"{prefix}%")
    ).count()
    return f"{prefix}-{last + 1:03d}"


def _build_response(count: InventoryCount, db: Session) -> dict:
    dept = db.query(Department).filter(Department.id == count.department_id).first()
    creator = db.query(User).filter(User.id == count.created_by).first() if count.created_by else None
    approver = db.query(User).filter(User.id == count.approved_by).first() if count.approved_by else None
    discrepancy = sum(1 for i in count.items if abs(float(i.difference)) > 0.001)
    return {
        "id": count.id,
        "number": count.number,
        "date": count.date,
        "department_id": count.department_id,
        "department_name": dept.name if dept else "",
        "status": count.status,
        "created_by_name": creator.username if creator else None,
        "approved_by_name": approver.username if approver else None,
        "notes": count.notes,
        "items_count": len(count.items),
        "discrepancy_count": discrepancy,
    }


def _build_item_response(item: InventoryCountItem, db: Session) -> dict:
    product = db.query(Product).filter(Product.id == item.product_id).first()
    unit = db.query(Unit).filter(Unit.id == product.unit_id).first() if product else None
    return {
        "id": item.id,
        "product_id": item.product_id,
        "product_name": product.name if product else "",
        "product_code": product.code if product else "",
        "unit_name": unit.short_name if unit else "од",
        "system_quantity": item.system_quantity,
        "actual_quantity": item.actual_quantity,
        "difference": item.difference,
        "notes": item.notes,
    }


# ──────────────────────────── Endpoints ────────────────────────────

@router.get("/", response_model=List[InventoryCountResponse])
def list_inventory_counts(
    department_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    q = db.query(InventoryCount)
    if department_id:
        q = q.filter(InventoryCount.department_id == department_id)
    if status:
        q = q.filter(InventoryCount.status == status)
    counts = q.order_by(InventoryCount.date.desc(), InventoryCount.id.desc()).all()
    return [_build_response(c, db) for c in counts]


@router.get("/{count_id}", response_model=InventoryCountDetailResponse)
def get_inventory_count(
    count_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(InventoryCount).filter(InventoryCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Акт не знайдено")
    resp = _build_response(count, db)
    resp["items"] = [_build_item_response(i, db) for i in count.items]
    return resp


@router.post("/", response_model=InventoryCountDetailResponse)
def create_inventory_count(
    data: InventoryCountCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept = db.query(Department).filter(Department.id == data.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Підрозділ не знайдено")

    # Отримуємо поточні залишки цього підрозділу
    inv_records = db.query(Inventory).filter(
        Inventory.department_id == data.department_id,
        Inventory.quantity > 0
    ).all()

    if not inv_records:
        raise HTTPException(status_code=400, detail="На цьому підрозділі немає залишків для інвентаризації")

    # Середня собівартість по продукту (з усіх підрозділів, для довідки)
    count = InventoryCount(
        number=_generate_count_number(db),
        date=data.date,
        department_id=data.department_id,
        status="in_progress",
        created_by=current_user.id,
        notes=data.notes,
    )
    db.add(count)
    db.flush()

    for inv in inv_records:
        item = InventoryCountItem(
            inventory_count_id=count.id,
            product_id=inv.product_id,
            system_quantity=inv.quantity,
            actual_quantity=inv.quantity,   # За замовчуванням = системна
            difference=Decimal("0"),
        )
        db.add(item)

    db.commit()
    db.refresh(count)

    resp = _build_response(count, db)
    resp["items"] = [_build_item_response(i, db) for i in count.items]
    return resp


@router.put("/{count_id}/items")
def update_count_items(
    count_id: int,
    data: InventoryCountItemsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(InventoryCount).filter(InventoryCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Акт не знайдено")
    if count.status != "in_progress":
        raise HTTPException(status_code=400, detail="Редагувати можна тільки акти зі статусом 'В процесі'")

    for upd in data.items:
        item = db.query(InventoryCountItem).filter(
            InventoryCountItem.id == upd["id"],
            InventoryCountItem.inventory_count_id == count_id
        ).first()
        if item:
            item.actual_quantity = Decimal(str(upd["actual_quantity"]))
            item.difference = item.actual_quantity - item.system_quantity
            if "notes" in upd:
                item.notes = upd.get("notes")

    db.commit()
    db.refresh(count)
    resp = _build_response(count, db)
    resp["items"] = [_build_item_response(i, db) for i in count.items]
    return resp


@router.post("/{count_id}/approve")
def approve_inventory_count(
    count_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Підтвердити інвентаризацію — коригує залишки по різниці"""
    count = db.query(InventoryCount).filter(InventoryCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Акт не знайдено")
    if count.status != "in_progress":
        raise HTTPException(status_code=400, detail="Акт вже підтверджено або скасовано")

    adjusted = 0
    for item in count.items:
        diff = item.actual_quantity - item.system_quantity
        if abs(float(diff)) < 0.001:
            continue  # Різниці немає — нічого не робимо

        # Оновлюємо залишок
        inv = db.query(Inventory).filter(
            Inventory.product_id == item.product_id,
            Inventory.department_id == count.department_id
        ).first()
        if inv:
            inv.quantity = item.actual_quantity

        # Запис транзакції
        tx = InventoryTransaction(
            transaction_type="adjustment",
            product_id=item.product_id,
            to_department_id=count.department_id if diff > 0 else None,
            from_department_id=count.department_id if diff < 0 else None,
            quantity=abs(diff),
            reference_id=count.id,
            reference_type="inventory_count",
            performed_by=current_user.id,
            notes=f"Коригування по інвентаризації {count.number}"
        )
        db.add(tx)
        adjusted += 1

    count.status = "approved"
    count.approved_by = current_user.id
    db.commit()

    return {"message": f"Інвентаризацію підтверджено. Скориговано позицій: {adjusted}"}


@router.delete("/{count_id}")
def delete_inventory_count(
    count_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    count = db.query(InventoryCount).filter(InventoryCount.id == count_id).first()
    if not count:
        raise HTTPException(status_code=404, detail="Акт не знайдено")
    if count.status == "approved":
        raise HTTPException(status_code=400, detail="Неможливо видалити підтверджений акт")
    db.delete(count)
    db.commit()
    return {"message": "Видалено"}
