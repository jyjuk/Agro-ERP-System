from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from app.api.deps import get_db, get_current_user
from app.models.transport import TransportUnit
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

    model_config = ConfigDict(from_attributes=True)


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
    unit = TransportUnit(**data.model_dump())
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
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(unit, field, value)
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
    db.delete(unit)
    db.commit()
    return {"message": "Видалено"}
