from sqlalchemy import Column, Integer, ForeignKey, Numeric, DateTime, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Inventory(Base):
    """Поточні залишки товарів по підрозділах"""
    __tablename__ = "inventory"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    quantity = Column(Numeric(12, 3), default=0, nullable=False)
    reserved_quantity = Column(Numeric(12, 3), default=0, nullable=False)
    last_updated = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    product = relationship("Product", back_populates="inventory_records")
    department = relationship("Department", back_populates="inventory")


class InventoryTransaction(Base):
    """Історія всіх руху товарів з датами та вартістю"""
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, index=True)
    transaction_type = Column(String(50), nullable=False, index=True)  # receipt, issue, transfer, adjustment
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    from_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    to_department_id = Column(Integer, ForeignKey("departments.id"), nullable=True)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit_cost = Column(Numeric(12, 2))  # КРИТИЧНО: Собівартість за одиницю
    reference_id = Column(Integer)  # ID пов'язаного документа (purchase_id, transfer_id тощо)
    reference_type = Column(String(50))  # purchase, transfer, adjustment
    performed_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)  # КРИТИЧНО: Дата транзакції

    # Relationships
    product = relationship("Product", back_populates="inventory_transactions")
    from_department = relationship("Department", foreign_keys=[from_department_id])
    to_department = relationship("Department", foreign_keys=[to_department_id])
    performed_by_user = relationship("User")
