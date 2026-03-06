"""
Планувальник регулярних Telegram-сповіщень.

Розклад:
  - Щопонеділка о 9:00 (Europe/Kiev) — нагадування перевірити залишки
  - Остання п'ятниця місяця о 9:00 — звіт про низькі залишки
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


def build_low_stock_report(db) -> str | None:
    """Повертає текст про низькі залишки або None якщо таких немає."""
    from app.models.inventory import Inventory
    from app.models.product import Product
    from app.models.department import Department

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

    if not rows:
        return None

    lines = [f"<b>Низькі залишки — {len(rows)} поз.:</b>"]
    for inv, prod, dept in rows:
        qty = float(inv.quantity)
        min_qty = float(prod.min_stock_level)
        lines.append(f"  • {prod.name} ({dept.name}): {qty:.2f} / мін {min_qty:.2f} {prod.unit or ''}")

    return "\n".join(lines)


def job_weekly_reminder():
    """Щопонеділкове нагадування перевірити залишки."""
    logger.info("Scheduler: тижневе нагадування про залишки")
    from app.services.notifications import send_telegram
    today_str = date.today().strftime("%d.%m.%Y")
    send_telegram(f"Нагадування: перевір залишки на початок тижня\n{today_str}")


def job_friday_check():
    """Кожну п'ятницю: якщо остання п'ятниця місяця — надіслати low-stock звіт."""
    today = date.today()
    if (today + timedelta(days=7)).month == today.month:
        return  # не остання п'ятниця місяця

    logger.info("Scheduler: low-stock звіт (остання п'ятниця)")
    db = _get_db()
    try:
        from app.services.notifications import send_telegram
        report = build_low_stock_report(db)
        today_str = today.strftime("%d.%m.%Y")
        if report:
            text = f"Кінець місяця — низькі залишки\n{today_str}\n\n{report}"
        else:
            text = f"Кінець місяця — залишки в нормі\n{today_str}"
        send_telegram(text)
    except Exception as e:
        logger.error(f"Scheduler friday check error: {e}")
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
