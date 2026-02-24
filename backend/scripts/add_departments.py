"""
Скрипт для додавання нових підрозділів до існуючої БД.
Запуск: python scripts/add_departments.py
"""
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from app.database import SessionLocal, engine, Base
from app.models.department import Department
from app.models.transport import TransportUnit  # створить таблицю

# Імпортуємо всі моделі щоб Base.metadata був повний
import app.models


def main():
    print("=== Додавання нових підрозділів ===\n")

    # Створити нові таблиці (якщо ще не існують)
    Base.metadata.create_all(bind=engine)
    print("[OK] Таблиці оновлено (transport_units)\n")

    db = SessionLocal()
    try:
        new_departments = [
            Department(name="Вагова",        type="service",        is_main_warehouse=False, is_active=True),
            Department(name="Охорона",       type="service",        is_main_warehouse=False, is_active=True),
            Department(name="Лабораторія",   type="service",        is_main_warehouse=False, is_active=True),
            Department(name="Бухгалтерія",   type="administration", is_main_warehouse=False, is_active=True),
            Department(name="Прибирання",    type="service",        is_main_warehouse=False, is_active=True),
            Department(name="Офіс",          type="administration", is_main_warehouse=False, is_active=True),
            Department(name="Транспорт",     type="transport",      is_main_warehouse=False, is_active=True),
        ]

        added = 0
        for dept in new_departments:
            existing = db.query(Department).filter(Department.name == dept.name).first()
            if not existing:
                db.add(dept)
                print(f"[OK] Додано підрозділ: {dept.name}")
                added += 1
            else:
                print(f"[-] Вже існує: {dept.name}")

        db.commit()
        print(f"\nДодано {added} нових підрозділів.")
        print("=== Готово! ===")

    except Exception as e:
        print(f"\n[ERROR] {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
