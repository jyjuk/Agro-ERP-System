from sqlalchemy import Column, Integer, String, Numeric, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ElectricityRecord(Base):
    """Облік електроенергії по місяцях"""
    __tablename__ = "electricity_records"

    id         = Column(Integer, primary_key=True, index=True)
    month      = Column(String(7), unique=True, nullable=False, index=True)  # "2026-02"

    # КТП (вводиться вже в кВт·год)
    ktp_old    = Column(Numeric(12, 2), default=0)
    ktp_new    = Column(Numeric(12, 2), default=0)

    # Млин — лічильник 1 (різниця × 100)
    mlyn1_start = Column(Numeric(12, 2), default=0)
    mlyn1_end   = Column(Numeric(12, 2), default=0)

    # Млин — лічильник 2 (різниця × 1)
    mlyn2_start = Column(Numeric(12, 2), default=0)
    mlyn2_end   = Column(Numeric(12, 2), default=0)

    # Пелетний цех — лічильник (різниця × 1000)
    palet_start = Column(Numeric(12, 4), default=0)
    palet_end   = Column(Numeric(12, 4), default=0)

    created_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at  = Column(DateTime, server_default=func.now())
    updated_at  = Column(DateTime, onupdate=func.now())

    creator = relationship("User", foreign_keys=[created_by])
