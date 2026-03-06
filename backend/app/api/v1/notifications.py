from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.inventory import Inventory
from app.models.product import Product
from app.models.department import Department
from app.models.user import User
from app.services.notifications import send_telegram, notify_low_stock
from app.services.scheduler import build_low_stock_report

router = APIRouter()


@router.get("/low-stock")
def check_low_stock(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Перевірити низькі залишки і надіслати сповіщення в Telegram."""
    rows = (
        db.query(Inventory, Product, Department)
        .join(Product, Inventory.product_id == Product.id)
        .join(Department, Inventory.department_id == Department.id)
        .filter(
            Product.min_stock_level > 0,
            Inventory.quantity < Product.min_stock_level,
        )
        .order_by(Inventory.quantity)
        .all()
    )

    items = [
        {
            "product_name": product.name,
            "department_name": department.name,
            "quantity": float(inventory.quantity),
            "min_stock_level": float(product.min_stock_level),
        }
        for inventory, product, department in rows
    ]

    notified = notify_low_stock(items)
    return {
        "count": len(items),
        "notified": notified,
        "items": items,
    }


@router.post("/test")
def test_notification(
    current_user: User = Depends(get_current_user),
):
    """Тестове повідомлення — перевірити що Telegram налаштований."""
    success = send_telegram(
        "<b>Telegram підключено!</b>\n"
        "ERP система агробізнесу працює."
    )
    return {"success": success, "message": "OK" if success else "Telegram не налаштований (перевір TOKEN і CHAT_ID в .env)"}


@router.post("/send-stock-report")
def send_stock_report_now(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Надіслати low-stock звіт зараз (ручний тест scheduler)."""
    from datetime import date
    report = build_low_stock_report(db)
    today_str = date.today().strftime("%d.%m.%Y")
    if report:
        text = f"Low-stock звіт (ручний запуск)\n{today_str}\n\n{report}"
    else:
        text = f"Залишки в нормі (ручний запуск)\n{today_str}"
    success = send_telegram(text)
    return {"success": success}
