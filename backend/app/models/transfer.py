from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Transfer(Base):
    """Переміщення товарів між підрозділами"""
    __tablename__ = "transfers"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True)  # TRF-YYYYMMDD-XXX
    date = Column(Date, nullable=False, index=True)  # КРИТИЧНО: Дата переміщення
    from_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=False, index=True)
    status = Column(String(20), default="draft", index=True)  # draft, confirmed, cancelled
    total_cost = Column(Numeric(12, 2), default=0)  # КРИТИЧНО: Загальна вартість переміщення
    created_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    from_department = relationship("Department", foreign_keys=[from_department_id])
    to_department = relationship("Department", foreign_keys=[to_department_id])
    creator = relationship("User", foreign_keys=[created_by])
    items = relationship("TransferItem", back_populates="transfer", cascade="all, delete-orphan")


class TransferItem(Base):
    """Позиції переміщення"""
    __tablename__ = "transfer_items"

    id = Column(Integer, primary_key=True, index=True)
    transfer_id = Column(Integer, ForeignKey("transfers.id"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False, index=True)
    quantity = Column(Numeric(12, 3), nullable=False)  # Кількість
    unit_cost = Column(Numeric(12, 2))  # КРИТИЧНО: Собівартість одиниці (з inventory)
    total_cost = Column(Numeric(12, 2))  # КРИТИЧНО: quantity * unit_cost
    notes = Column(Text)

    # Relationships
    transfer = relationship("Transfer", back_populates="items")
    product = relationship("Product")
