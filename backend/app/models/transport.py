from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from app.database import Base


class TransportUnit(Base):
    __tablename__ = "transport_units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)          # назва: "КамАЗ 5511", "МТЗ-82"
    unit_type = Column(String(50), nullable=False)      # авто, трактор, тягач, бочка, спецтехніка, інше
    plate_number = Column(String(20), nullable=True)    # держ. номер (необов'язково)
    notes = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
