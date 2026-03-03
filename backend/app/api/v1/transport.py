from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.api.deps import get_db, get_current_user
from app.models.transport import TransportUnit
from app.models.department import Department
from app.models.user import User

router = APIRouter()

TRANSPORT_TYPES = ["авто", "трактор", "тягач", "спецтехніка", "бочка", "причіп", "інше"]


class TransportUnitCreate(BaseModel):
    name: str
    unit_type: str
    plate_number: Optional[str] = None
    notes: Optional[str] = None


class TransportUnitUpdate(BaseModel):
    name: Optional[str] = None
    unit_type: Optional[str] = None
    plate_number: Optional[str] = None
    notes: Optional[str] = None


class TransportUnitResponse(BaseModel):
    id: int
    name: str
    unit_type: str
    plate_number: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    department_id: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


def _dept_name(name: str, plate_number: Optional[str]) -> str:
    """Генерує назву підрозділу для транспортного засобу."""
    if plate_number:
        return f"{name} ({plate_number})"
    return name


def _get_or_create_department(db: Session, dept_name: str) -> Department:
    """Повертає існуючий або створює новий підрозділ для ТЗ."""
    existing = db.query(Department).filter(Department.name == dept_name).first()
    if existing:
        if not existing.is_active:
            existing.is_active = True
            db.flush()
        return existing
    dept = Department(name=dept_name, type='transport', is_active=True, is_main_warehouse=False)
    db.add(dept)
    db.flush()
    return dept


@router.get("/types")
def get_transport_types():
    return TRANSPORT_TYPES


@router.get("/", response_model=List[TransportUnitResponse])
def list_transport_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(TransportUnit).filter(TransportUnit.is_active == True).order_by(
        TransportUnit.unit_type, TransportUnit.name
    ).all()


@router.post("/", response_model=TransportUnitResponse)
def create_transport_unit(
    data: TransportUnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dept_name = _dept_name(data.name, data.plate_number)
    dept = _get_or_create_department(db, dept_name)

    unit = TransportUnit(**data.model_dump(), department_id=dept.id)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.put("/{unit_id}", response_model=TransportUnitResponse)
def update_transport_unit(
    unit_id: int,
    data: TransportUnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unit = db.query(TransportUnit).filter(TransportUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Одиницю транспорту не знайдено")

    updated = data.model_dump(exclude_unset=True)
    for field, value in updated.items():
        setattr(unit, field, value)

    # Оновлюємо назву підрозділу якщо змінилась назва або номер ТЗ
    if ('name' in updated or 'plate_number' in updated) and unit.department_id:
        new_dept_name = _dept_name(unit.name, unit.plate_number)
        dept = db.query(Department).filter(Department.id == unit.department_id).first()
        if dept and dept.name != new_dept_name:
            # Якщо новий підрозділ з такою назвою вже є — прив'язуємо до нього
            existing = db.query(Department).filter(Department.name == new_dept_name).first()
            if existing:
                unit.department_id = existing.id
                if not existing.is_active:
                    existing.is_active = True
            else:
                dept.name = new_dept_name

    # Якщо у ТЗ ще нема підрозділу (старі записи) — створюємо
    if not unit.department_id:
        dept_name = _dept_name(unit.name, unit.plate_number)
        dept = _get_or_create_department(db, dept_name)
        unit.department_id = dept.id

    db.commit()
    db.refresh(unit)
    return unit


@router.delete("/{unit_id}")
def delete_transport_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    unit = db.query(TransportUnit).filter(TransportUnit.id == unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Одиницю транспорту не знайдено")

    # Деактивуємо підрозділ щоб він зник зі списку переміщень
    if unit.department_id:
        dept = db.query(Department).filter(Department.id == unit.department_id).first()
        if dept:
            dept.is_active = False

    db.delete(unit)
    db.commit()
    return {"message": "Видалено"}
