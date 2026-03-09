from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def write_audit(
    db: Session,
    user_id: int,
    action: str,
    entity_type: str,
    entity_id: int | None = None,
    changes: dict | None = None,
    ip_address: str | None = None,
):
    """Записати подію в журнал аудиту."""
    log = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        changes=changes,
        ip_address=ip_address,
    )
    db.add(log)
    # Не робимо commit тут — commit робить викликач після своїх змін
