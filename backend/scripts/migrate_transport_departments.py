"""
Міграція: додає department_id до transport_units та створює підрозділи для існуючих ТЗ.
Запускається автоматично при старті (idempotent). Виконувати ПІСЛЯ seed_data.py.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from sqlalchemy import text, inspect
from sqlalchemy.exc import NoSuchTableError
from app.database import SessionLocal, engine
from app.models.transport import TransportUnit
from app.models.department import Department


def _dept_name(name: str, plate_number) -> str:
    if plate_number:
        return f"{name} ({plate_number})"
    return name


def migrate():
    print("[migrate_transport_departments] Запуск...")

    # 1. Перевіряємо чи таблиця транспорту існує
    try:
        inspector = inspect(engine)
        columns = [c['name'] for c in inspector.get_columns('transport_units')]
    except NoSuchTableError:
        print("[migrate_transport_departments] Таблиця transport_units не існує — пропускаємо.")
        return

    # 2. Додаємо колонку department_id якщо її нема
    if 'department_id' not in columns:
        try:
            with engine.connect() as conn:
                # PostgreSQL підтримує IF NOT EXISTS
                try:
                    conn.execute(text(
                        "ALTER TABLE transport_units ADD COLUMN IF NOT EXISTS "
                        "department_id INTEGER REFERENCES departments(id)"
                    ))
                except Exception:
                    # SQLite: без IF NOT EXISTS та без REFERENCES в ALTER TABLE
                    conn.execute(text(
                        "ALTER TABLE transport_units ADD COLUMN department_id INTEGER"
                    ))
                conn.commit()
            print("[migrate_transport_departments] Колонку department_id додано.")
        except Exception as e:
            print(f"[migrate_transport_departments] Помилка додавання колонки: {e}")
            return
    else:
        print("[migrate_transport_departments] Колонка department_id вже існує.")

    # 3. Створюємо підрозділи для ТЗ без department_id
    db = SessionLocal()
    try:
        units = db.query(TransportUnit).filter(
            TransportUnit.department_id == None,
            TransportUnit.is_active == True
        ).all()

        if not units:
            print("[migrate_transport_departments] Всі ТЗ вже мають підрозділи.")
            return

        for unit in units:
            dept_name = _dept_name(unit.name, unit.plate_number)

            existing = db.query(Department).filter(Department.name == dept_name).first()
            if existing:
                unit.department_id = existing.id
                if not existing.is_active:
                    existing.is_active = True
                print(f"  Прив'язано '{unit.name}' → підрозділ '{dept_name}'")
            else:
                dept = Department(
                    name=dept_name,
                    type='transport',
                    is_active=True,
                    is_main_warehouse=False
                )
                db.add(dept)
                db.flush()
                unit.department_id = dept.id
                print(f"  Створено підрозділ '{dept_name}' для '{unit.name}'")

        db.commit()
        print(f"[migrate_transport_departments] Оброблено {len(units)} ТЗ.")
    except Exception as e:
        db.rollback()
        print(f"[migrate_transport_departments] Помилка: {e}")
        raise
    finally:
        db.close()

    print("[migrate_transport_departments] Готово.")


if __name__ == "__main__":
    migrate()
