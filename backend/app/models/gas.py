from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GasRecord(Base):
    """Облік газу по місяцях"""
    __tablename__ = "gas_records"

    id          = Column(Integer, primary_key=True, index=True)
    month       = Column(String(7), unique=True, nullable=False, index=True)  # "2026-02"

    # Фактичне споживання зерносушками (м³) — може бути відсутнє (літо, немає сушіння)
    consumption = Column(Numeric(12, 2), nullable=True)

    # ВТВ — власні технологічні витрати (м³), згідно методики газової служби (не завжди є)
    vtv         = Column(Numeric(10, 4), nullable=True)

    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by])
