from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ProductCategory(Base):
    __tablename__ = "product_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, index=True)
    parent_id = Column(Integer, ForeignKey("product_categories.id"), nullable=True)
    description = Column(Text)

    # Relationships
    parent = relationship("ProductCategory", remote_side=[id], backref="children")
    products = relationship("Product", back_populates="category")


class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), nullable=False, unique=True)
    short_name = Column(String(10))

    # Relationships
    products = relationship("Product", back_populates="unit")


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False, index=True)
    category_id = Column(Integer, ForeignKey("product_categories.id"))
    unit_id = Column(Integer, ForeignKey("units.id"))
    product_type = Column(String(50))  # consumable (витратні матеріали), spare_part (запчастини)
    description = Column(Text)
    min_stock_level = Column(Integer, default=0)  # Мінімальний залишок для алерта
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    category = relationship("ProductCategory", back_populates="products")
    unit = relationship("Unit", back_populates="products")
    purchase_items = relationship("PurchaseItem", back_populates="product")
    inventory_records = relationship("Inventory", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")
    transfer_items = relationship("TransferItem", back_populates="product")
    inventory_count_items = relationship("InventoryCountItem", back_populates="product")
