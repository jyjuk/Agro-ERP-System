from sqlalchemy import Column, Integer, String, ForeignKey, Date, DateTime, Text, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class InventoryCount(Base):
    """Акти інвентаризації"""
    __tablename__ = "inventory_counts"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    status = Column(String(20), default="in_progress")  # in_progress, completed, approved
    created_by = Column(Integer, ForeignKey("users.id"))
    approved_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    department = relationship("Department", back_populates="inventory_counts")
    created_by_user = relationship("User", foreign_keys=[created_by])
    approved_by_user = relationship("User", foreign_keys=[approved_by])
    items = relationship("InventoryCountItem", back_populates="inventory_count", cascade="all, delete-orphan")


class InventoryCountItem(Base):
    """Позиції інвентаризації"""
    __tablename__ = "inventory_count_items"

    id = Column(Integer, primary_key=True, index=True)
    inventory_count_id = Column(Integer, ForeignKey("inventory_counts.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    system_quantity = Column(Numeric(12, 3), nullable=False)  # Залишок з системи
    actual_quantity = Column(Numeric(12, 3), nullable=False)  # Фактично нараховано
    difference = Column(Numeric(12, 3), nullable=False)  # Різниця
    notes = Column(Text)

    # Relationships
    inventory_count = relationship("InventoryCount", back_populates="items")
    product = relationship("Product", back_populates="inventory_count_items")
