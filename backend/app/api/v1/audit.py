from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc
from typing import Optional
from datetime import date
from pydantic import BaseModel
from app.api.deps import get_db, get_current_admin_user
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()

ACTION_LABELS = {
    "login":            "Вхід",
    "logout":           "Вихід",
    "purchase_confirm": "Закупівля підтверджена",
    "transfer_confirm": "Переміщення підтверджено",
    "writeoff_confirm": "Списання підтверджено",
    "inventory_approve":"Інвентаризація підтверджена",
    "create":           "Створення",
    "update":           "Редагування",
    "delete":           "Видалення",
}

ENTITY_LABELS = {
    "purchase":         "Закупівля",
    "transfer":         "Переміщення",
    "writeoff":         "Списання",
    "inventory_count":  "Інвентаризація",
    "product":          "Товар",
    "supplier":         "Постачальник",
    "user":             "Користувач",
    "auth":             "Авторизація",
}


class AuditOut(BaseModel):
    id: int
    user_id: int
    username: str
    action: str
    action_label: str
    entity_type: str
    entity_label: str
    entity_id: Optional[int] = None
    changes: Optional[dict] = None
    ip_address: Optional[str] = None
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[AuditOut])
def get_audit_log(
    user_id: Optional[int] = Query(None),
    action: Optional[str] = Query(None),
    entity_type: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Журнал дій — тільки для адміна."""
    q = db.query(AuditLog).options(joinedload(AuditLog.user))

    if user_id:
        q = q.filter(AuditLog.user_id == user_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if date_from:
        q = q.filter(AuditLog.created_at >= date_from)
    if date_to:
        from datetime import timedelta
        q = q.filter(AuditLog.created_at < date_to + timedelta(days=1))

    records = q.order_by(desc(AuditLog.created_at)).offset(skip).limit(limit).all()

    return [
        AuditOut(
            id=r.id,
            user_id=r.user_id,
            username=r.user.username if r.user else "—",
            action=r.action,
            action_label=ACTION_LABELS.get(r.action, r.action),
            entity_type=r.entity_type,
            entity_label=ENTITY_LABELS.get(r.entity_type, r.entity_type),
            entity_id=r.entity_id,
            changes=r.changes,
            ip_address=r.ip_address,
            created_at=r.created_at.isoformat() if r.created_at else "",
        )
        for r in records
    ]


@router.get("/meta")
def get_audit_meta(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user),
):
    """Список доступних фільтрів: users, actions, entity_types."""
    from sqlalchemy import distinct
    users = (
        db.query(User.id, User.username)
        .join(AuditLog, AuditLog.user_id == User.id)
        .distinct()
        .all()
    )
    actions = db.query(distinct(AuditLog.action)).all()
    entity_types = db.query(distinct(AuditLog.entity_type)).all()

    return {
        "users": [{"id": u.id, "username": u.username} for u in users],
        "actions": [
            {"value": a[0], "label": ACTION_LABELS.get(a[0], a[0])}
            for a in actions
        ],
        "entity_types": [
            {"value": e[0], "label": ENTITY_LABELS.get(e[0], e[0])}
            for e in entity_types
        ],
    }
