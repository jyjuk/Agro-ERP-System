from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.electricity import ElectricityRecord
from app.models.user import User

router = APIRouter()

COEFF_MLYN_1  = Decimal("100")
COEFF_MLYN_2  = Decimal("1")
COEFF_PALETKA = Decimal("1000")


class ElectricityIn(BaseModel):
    month: str          # "2026-02"
    ktp_old: float = 0
    ktp_new: float = 0
    mlyn1_start: float = 0
    mlyn1_end: float = 0
    mlyn2_start: float = 0
    mlyn2_end: float = 0
    palet_start: float = 0
    palet_end: float = 0


class ElectricityOut(BaseModel):
    id: int
    month: str
    ktp_old: float
    ktp_new: float
    mlyn1_start: float
    mlyn1_end: float
    mlyn2_start: float
    mlyn2_end: float
    palet_start: float
    palet_end: float
    # Розраховані поля
    ktp_total: float
    mlyn1_kwh: float
    mlyn2_kwh: float
    mlyn_total: float
    palet_kwh: float
    elevator_kwh: float

    class Config:
        from_attributes = True


def _calc(rec: ElectricityRecord) -> dict:
    ktp_old   = float(rec.ktp_old or 0)
    ktp_new   = float(rec.ktp_new or 0)
    mlyn1_s   = float(rec.mlyn1_start or 0)
    mlyn1_e   = float(rec.mlyn1_end or 0)
    mlyn2_s   = float(rec.mlyn2_start or 0)
    mlyn2_e   = float(rec.mlyn2_end or 0)
    palet_s   = float(rec.palet_start or 0)
    palet_e   = float(rec.palet_end or 0)

    ktp_total  = ktp_old + ktp_new
    mlyn1_kwh  = (mlyn1_e - mlyn1_s) * 100
    mlyn2_kwh  = (mlyn2_e - mlyn2_s) * 1
    mlyn_total = mlyn1_kwh + mlyn2_kwh
    palet_kwh  = (palet_e - palet_s) * 1000
    elevator   = ktp_total - mlyn_total - palet_kwh

    return {
        "id": rec.id,
        "month": rec.month,
        "ktp_old": ktp_old,
        "ktp_new": ktp_new,
        "mlyn1_start": mlyn1_s,
        "mlyn1_end": mlyn1_e,
        "mlyn2_start": mlyn2_s,
        "mlyn2_end": mlyn2_e,
        "palet_start": palet_s,
        "palet_end": palet_e,
        "ktp_total": ktp_total,
        "mlyn1_kwh": mlyn1_kwh,
        "mlyn2_kwh": mlyn2_kwh,
        "mlyn_total": mlyn_total,
        "palet_kwh": palet_kwh,
        "elevator_kwh": elevator,
    }


@router.get("/{month}", response_model=ElectricityOut)
def get_month(
    month: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Отримати дані за місяць (формат: 2026-02)."""
    rec = db.query(ElectricityRecord).filter(ElectricityRecord.month == month).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Даних за цей місяць немає")
    return _calc(rec)


@router.post("/save", response_model=ElectricityOut)
def save_month(
    data: ElectricityIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Зберегти або оновити дані за місяць."""
    rec = db.query(ElectricityRecord).filter(ElectricityRecord.month == data.month).first()
    if rec:
        rec.ktp_old     = data.ktp_old
        rec.ktp_new     = data.ktp_new
        rec.mlyn1_start = data.mlyn1_start
        rec.mlyn1_end   = data.mlyn1_end
        rec.mlyn2_start = data.mlyn2_start
        rec.mlyn2_end   = data.mlyn2_end
        rec.palet_start = data.palet_start
        rec.palet_end   = data.palet_end
    else:
        rec = ElectricityRecord(
            month       = data.month,
            ktp_old     = data.ktp_old,
            ktp_new     = data.ktp_new,
            mlyn1_start = data.mlyn1_start,
            mlyn1_end   = data.mlyn1_end,
            mlyn2_start = data.mlyn2_start,
            mlyn2_end   = data.mlyn2_end,
            palet_start = data.palet_start,
            palet_end   = data.palet_end,
            created_by  = current_user.id,
        )
        db.add(rec)
    db.commit()
    db.refresh(rec)
    return _calc(rec)


@router.get("/", response_model=list[ElectricityOut])
def list_months(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Список всіх збережених місяців."""
    records = db.query(ElectricityRecord).order_by(ElectricityRecord.month.desc()).all()
    return [_calc(r) for r in records]
