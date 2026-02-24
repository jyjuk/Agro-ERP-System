from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from app.database import Base


class Department(Base):
    __tablename__ = "departments"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True, index=True)
    type = Column(String(50))  # warehouse, production, administration
    is_main_warehouse = Column(Boolean, default=False)  # True для Основного складу
    is_active = Column(Boolean, default=True)

    # Relationships
    users = relationship("User", back_populates="department")
    inventory = relationship("Inventory", back_populates="department")
    purchases = relationship("Purchase", back_populates="department")
    transfers_from = relationship("Transfer", foreign_keys="Transfer.from_department_id", back_populates="from_department")
    transfers_to = relationship("Transfer", foreign_keys="Transfer.to_department_id", back_populates="to_department")
    inventory_counts = relationship("InventoryCount", back_populates="department")
    writeoffs = relationship("WriteOff", back_populates="department")
