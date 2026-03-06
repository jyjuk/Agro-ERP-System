"""
Telegram сповіщення для ERP системи.

Налаштування:
  1. Створи бота через @BotFather -> /newbot -> скопіюй TOKEN
  2. Напиши боту будь-яке повідомлення
  3. Відкрий https://api.telegram.org/bot<TOKEN>/getUpdates -> знайди chat.id
  4. Заповни TELEGRAM_BOT_TOKEN і TELEGRAM_CHAT_ID в .env
"""
import logging
import httpx
from app.config import settings

logger = logging.getLogger(__name__)


_TG_LIMIT = 4000


def send_telegram(text: str) -> bool:
    """Надіслати повідомлення через Telegram Bot API. Довгі тексти розбиває на частини."""
    token = settings.TELEGRAM_BOT_TOKEN
    chat_id = settings.TELEGRAM_CHAT_ID

    if not token or not chat_id:
        logger.debug("Telegram не налаштований — пропускаємо сповіщення")
        return False

    # Розбиваємо по рядках щоб не розрізати слова
    chunks: list[str] = []
    current = ""
    for line in text.splitlines(keepends=True):
        if len(current) + len(line) > _TG_LIMIT:
            if current:
                chunks.append(current)
            current = line
        else:
            current += line
    if current:
        chunks.append(current)

    url = f"https://api.telegram.org/bot{token}/sendMessage"
    try:
        with httpx.Client(timeout=10.0) as client:
            for chunk in chunks:
                resp = client.post(url, json={
                    "chat_id": chat_id,
                    "text": chunk,
                    "parse_mode": "HTML",
                })
                if resp.status_code != 200:
                    logger.warning(f"Telegram API помилка {resp.status_code}: {resp.text}")
                    return False
        return True
    except Exception as e:
        logger.warning(f"Telegram: не вдалося надіслати — {e}")
        return False


def notify_writeoff_confirmed(
    number: str,
    department: str,
    items_count: int,
    total: float,
    date: str,
    confirmed_by: str,
) -> None:
    """Сповіщення про підтверджене списання."""
    send_telegram(
        f"🔴 <b>Списання підтверджено</b>\n"
        f"📋 Номер: <code>{number}</code>\n"
        f"🏭 Підрозділ: {department}\n"
        f"📦 Позицій: {items_count}\n"
        f"💰 Сума: {total:,.2f} ₴\n"
        f"📅 Дата: {date}\n"
        f"👤 Підтвердив: {confirmed_by}"
    )


def notify_low_stock(items: list) -> bool:
    """
    Сповіщення про низькі залишки.
    items: список dict з ключами product_name, department_name, quantity, min_stock_level
    """
    if not items:
        return False

    lines = [f"⚠️ <b>Низькі залишки!</b> Знайдено {len(items)} позицій:\n"]
    for item in items[:15]:
        lines.append(
            f"• {item['product_name']} ({item['department_name']}): "
            f"{item['quantity']:.2f} / мін {item['min_stock_level']:.2f}"
        )
    if len(items) > 15:
        lines.append(f"\n...та ще {len(items) - 15} позицій")

    return send_telegram("\n".join(lines))
