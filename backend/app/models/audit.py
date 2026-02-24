from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class AuditLog(Base):
    """Журнал дій користувачів"""
    __tablename__ = "audit_log"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    action = Column(String(50), nullable=False, index=True)  # create, update, delete, login, logout
    entity_type = Column(String(50), nullable=False, index=True)  # purchase, transfer, product, etc.
    entity_id = Column(Integer)
    changes = Column(JSON)  # {field: {old: value, new: value}}
    ip_address = Column(String(50))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    user = relationship("User", back_populates="audit_logs")
