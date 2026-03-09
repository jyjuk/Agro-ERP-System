from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from app.api.deps import get_db, get_current_user, get_current_admin_user
from app.models.gas import GasRecord
from app.models.user import User

router = APIRouter()


class GasIn(BaseModel):
    month: str
    consumption: Optional[float] = None
    vtv: Optional[float] = None


class GasOut(BaseModel):
    id: int
    month: str
    consumption: Optional[float] = None
    vtv: Optional[float] = None
    total: Optional[float] = None   # consumption + vtv (якщо є хоч щось)

    class Config:
        from_attributes = True


def _calc(rec: GasRecord) -> dict:
    consumption = float(rec.consumption) if rec.consumption is not None else None
    vtv         = float(rec.vtv)         if rec.vtv         is not None else None
    if consumption is not None or vtv is not None:
        total = (consumption or 0) + (vtv or 0)
    else:
        total = None
    return {
        "id":          rec.id,
        "month":       rec.month,
        "consumption": consumption,
        "vtv":         vtv,
        "total":       total,
    }


@router.get("/", response_model=list[GasOut])
def list_months(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    records = db.query(GasRecord).order_by(GasRecord.month.desc()).all()
    return [_calc(r) for r in records]


@router.get("/{month}", response_model=GasOut)
def get_month(
    month: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rec = db.query(GasRecord).filter(GasRecord.month == month).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Даних за цей місяць немає")
    return _calc(rec)


@router.post("/save", response_model=GasOut)
def save_month(
    data: GasIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    rec = db.query(GasRecord).filter(GasRecord.month == data.month).first()
    if rec:
        rec.consumption = data.consumption
        rec.vtv         = data.vtv
    else:
        rec = GasRecord(
            month       = data.month,
            consumption = data.consumption,
            vtv         = data.vtv,
            created_by  = current_user.id,
        )
        db.add(rec)
    db.commit()
    db.refresh(rec)
    return _calc(rec)


@router.delete("/{month}", status_code=204)
def delete_month(
    month: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    rec = db.query(GasRecord).filter(GasRecord.month == month).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Запис не знайдено")
    db.delete(rec)
    db.commit()
