from sqlalchemy import Column, Integer, String, ForeignKey, Date, Numeric, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Purchase(Base):
    __tablename__ = "purchases"

    id = Column(Integer, primary_key=True, index=True)
    number = Column(String(50), unique=True, nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)  # КРИТИЧНО: Дата закупівлі
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)  # Оприбуткування (Основний склад)
    total_amount = Column(Numeric(12, 2), nullable=False)  # КРИТИЧНО: Загальна вартість
    status = Column(String(20), default="draft")  # draft, confirmed, received, cancelled
    created_by = Column(Integer, ForeignKey("users.id"))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    supplier = relationship("Supplier", back_populates="purchases")
    department = relationship("Department", back_populates="purchases")
    created_by_user = relationship("User")
    items = relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")


class PurchaseItem(Base):
    __tablename__ = "purchase_items"

    id = Column(Integer, primary_key=True, index=True)
    purchase_id = Column(Integer, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Numeric(12, 3), nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)  # КРИТИЧНО: Ціна за одиницю
    total_price = Column(Numeric(12, 2), nullable=False)  # КРИТИЧНО: quantity * unit_price
    notes = Column(Text)

    # Relationships
    purchase = relationship("Purchase", back_populates="items")
    product = relationship("Product", back_populates="purchase_items")
