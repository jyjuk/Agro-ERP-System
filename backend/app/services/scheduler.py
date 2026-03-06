"""
Планувальник регулярних Telegram-звітів про залишки.

Розклад:
  - Щопонеділка о 9:00 (Europe/Kiev) — тижневий звіт залишків по підрозділах
  - Кожну п'ятницю о 9:00 — якщо остання п'ятниця місяця, надсилає місячний підсумок
"""
import logging
from datetime import date, timedelta

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone="Europe/Kiev")


def _get_db():
    from app.database import SessionLocal
    return SessionLocal()


def build_stock_report(db) -> str:
    """Формує текст звіту залишків по підрозділах."""
    from app.models.inventory import Inventory
    from app.models.product import Product
    from app.models.department import Department

    rows = (
        db.query(Inventory, Product, Department)
        .join(Product, Inventory.product_id == Product.id)
        .join(Department, Inventory.department_id == Department.id)
        .order_by(Department.name, Product.name)
        .all()
    )

    if not rows:
        return "\n\nДаних про залишки немає."

    # Групуємо по підрозділах
    by_dept: dict = {}
    low_stock = []
    for inv, prod, dept in rows:
        qty = float(inv.quantity)
        min_qty = float(prod.min_stock_level) if prod.min_stock_level else 0
        is_low = min_qty > 0 and qty < min_qty

        if dept.name not in by_dept:
            by_dept[dept.name] = []
        by_dept[dept.name].append({
            "name": prod.name,
            "qty": qty,
            "unit": prod.unit or "",
            "min": min_qty,
            "is_low": is_low,
        })
        if is_low:
            low_stock.append({"dept": dept.name, "name": prod.name, "qty": qty, "min": min_qty})

    lines = []
    for dept_name, items in by_dept.items():
        lines.append(f"\n<b>{dept_name}</b>")
        for item in items:
            icon = "[!]" if item["is_low"] else "ok"
            lines.append(f"  {icon} {item['name']}: {item['qty']:.2f} {item['unit']}")

    if low_stock:
        lines.append(f"\n<b>Низькі залишки — {len(low_stock)} поз.:</b>")
        for item in low_stock[:10]:
            lines.append(
                f"  • {item['name']} ({item['dept']}): {item['qty']:.2f} / мін {item['min']:.2f}"
            )
        if len(low_stock) > 10:
            lines.append(f"  ...та ще {len(low_stock) - 10}")

    return "\n".join(lines)


def job_weekly_report():
    """Щопонеділковий тижневий звіт."""
    logger.info("Scheduler: тижневий звіт залишків")
    db = _get_db()
    try:
        from app.services.notifications import send_telegram
        report = build_stock_report(db)
        today_str = date.today().strftime("%d.%m.%Y")
        text = f"Тижневий звіт залишків\n{today_str}{report}"
        send_telegram(text)
    except Exception as e:
        logger.error(f"Scheduler weekly report error: {e}")
    finally:
        db.close()


def job_friday_check():
    """Кожну п'ятницю перевіряє чи це остання п'ятниця місяця, і надсилає місячний підсумок."""
    today = date.today()
    if (today + timedelta(days=7)).month == today.month:
        return  # не остання п'ятниця місяця

    logger.info("Scheduler: місячний підсумок залишків (остання п'ятниця)")
    db = _get_db()
    try:
        from app.services.notifications import send_telegram
        report = build_stock_report(db)
        today_str = today.strftime("%d.%m.%Y")
        month_str = today.strftime("%m.%Y")
        text = f"Місячний підсумок залишків\n{month_str} | {today_str}{report}"
        send_telegram(text)
    except Exception as e:
        logger.error(f"Scheduler monthly report error: {e}")
    finally:
        db.close()


def start_scheduler():
    scheduler.add_job(
        job_weekly_report,
        CronTrigger(day_of_week="mon", hour=9, minute=0, timezone="Europe/Kiev"),
        id="weekly_stock_report",
        replace_existing=True,
    )
    scheduler.add_job(
        job_friday_check,
        CronTrigger(day_of_week="fri", hour=9, minute=0, timezone="Europe/Kiev"),
        id="monthly_friday_check",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started: weekly Mon 9:00 + last-Friday monthly 9:00 (Europe/Kiev)")


def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped")
