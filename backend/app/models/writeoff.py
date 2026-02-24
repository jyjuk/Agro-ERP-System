from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
from decimal import Decimal


class WriteOff(Base):
    """Списання товарів"""
    __tablename__ = "writeoffs"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    reason = Column(String(255), nullable=False)  # Причина списання
    total_cost = Column(Numeric(15, 2), nullable=False, default=Decimal(0))
    status = Column(String(20), nullable=False, default="draft")  # draft, confirmed, cancelled
    notes = Column(Text, nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="writeoffs")
    items = relationship("WriteOffItem", back_populates="writeoff", cascade="all, delete-orphan")
    creator = relationship("User", foreign_keys=[created_by])


class WriteOffItem(Base):
    """Позиції списання"""
    __tablename__ = "writeoff_items"

    id = Column(Integer, primary_key=True, index=True)
    writeoff_id = Column(Integer, ForeignKey("writeoffs.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(15, 3), nullable=False)
    unit_cost = Column(Numeric(15, 2), nullable=True)  # Встановлюється при підтвердженні
    total_cost = Column(Numeric(15, 2), nullable=True)  # Встановлюється при підтвердженні
    notes = Column(Text, nullable=True)

    # Relationships
    writeoff = relationship("WriteOff", back_populates="items")
    product = relationship("Product")
