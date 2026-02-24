"""
Скрипт для створення початкових даних в БД
Запуск: python scripts/seed_data.py
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models import Department, Role, User, Unit, ProductCategory
from app.core.security import get_password_hash


def create_departments(db: Session):
    """Створити підрозділи"""
    departments = [
        Department(name="Основний склад",         type="warehouse",      is_main_warehouse=True,  is_active=True),
        Department(name="Склад готової продукції", type="warehouse",      is_main_warehouse=False, is_active=True),
        Department(name="Млин",                   type="production",     is_main_warehouse=False, is_active=True),
        Department(name="Елеватор",               type="warehouse",      is_main_warehouse=False, is_active=True),
        Department(name="Цех паливної гранули",   type="production",     is_main_warehouse=False, is_active=True),
        Department(name="Адміністрація",          type="administration", is_main_warehouse=False, is_active=True),
        Department(name="Вагова",                 type="service",        is_main_warehouse=False, is_active=True),
        Department(name="Охорона",                type="service",        is_main_warehouse=False, is_active=True),
        Department(name="Лабораторія",            type="service",        is_main_warehouse=False, is_active=True),
        Department(name="Бухгалтерія",            type="administration", is_main_warehouse=False, is_active=True),
        Department(name="Прибирання",             type="service",        is_main_warehouse=False, is_active=True),
        Department(name="Офіс",                   type="administration", is_main_warehouse=False, is_active=True),
        Department(name="Транспорт",              type="transport",      is_main_warehouse=False, is_active=True),
    ]

    for dept in departments:
        existing = db.query(Department).filter(Department.name == dept.name).first()
        if not existing:
            db.add(dept)
            print(f"[OK] Створено підрозділ: {dept.name}")

    db.commit()


def create_roles(db: Session):
    """Створити ролі"""
    roles = [
        Role(
            name="admin",
            description="Адміністратор. Повний доступ, підтвердження списань.",
            permissions={"all": ["*"]}
        ),
        Role(
            name="manager",
            description="Керівник. Закупівлі, переміщення, списання, звіти, всі залишки.",
            permissions={
                "purchases": ["read", "create", "update"],
                "inventory": ["read"],
                "transfers": ["read", "create", "update"],
                "writeoffs": ["read", "create", "update"],
                "reports": ["read"],
            }
        ),
        Role(
            name="warehouse_manager",
            description="Зав. складу. Переміщення, списання, звіти, всі залишки. Без закупівель.",
            permissions={
                "inventory": ["read"],
                "transfers": ["read", "create", "update"],
                "writeoffs": ["read", "create", "update"],
                "reports": ["read"],
            }
        ),
        Role(
            name="department_head",
            description="Старший підрозділу. Тільки свій підрозділ: перегляд залишків та подача на списання.",
            permissions={
                "inventory": ["read"],
                "writeoffs": ["read", "create"],
            }
        ),
    ]

    for role in roles:
        existing = db.query(Role).filter(Role.name == role.name).first()
        if not existing:
            db.add(role)
            print(f"[OK] Створено роль: {role.name}")

    db.commit()


def create_admin_user(db: Session):
    """Створити адміністратора"""
    admin_role = db.query(Role).filter(Role.name == "admin").first()
    admin_dept = db.query(Department).filter(Department.name == "Адміністрація").first()

    existing_admin = db.query(User).filter(User.username == "admin").first()
    if not existing_admin:
        admin = User(
            username="admin",
            password_hash=get_password_hash("admin"),  # ЗМІНИТИ ПІСЛЯ ПЕРШОГО ВХОДУ!
            role_id=admin_role.id,
            department_id=admin_dept.id,
            is_active=True
        )
        db.add(admin)
        db.commit()
        print("[OK] Створено користувача admin (пароль: admin) - ОБОВ'ЯЗКОВО ЗМІНІТЬ ПАРОЛЬ!")
    else:
        print("- Користувач admin вже існує")


def create_units(db: Session):
    """Створити одиниці виміру"""
    units = [
        Unit(name="кілограм", short_name="кг"),
        Unit(name="тонна", short_name="т"),
        Unit(name="штука", short_name="шт"),
        Unit(name="літр", short_name="л"),
        Unit(name="метр", short_name="м"),
        Unit(name="упаковка", short_name="уп"),
    ]

    for unit in units:
        existing = db.query(Unit).filter(Unit.name == unit.name).first()
        if not existing:
            db.add(unit)
            print(f"[OK] Створено одиницю виміру: {unit.name}")

    db.commit()


def create_product_categories(db: Session):
    """Створити категорії продуктів"""
    categories = [
        ProductCategory(name="Витратні матеріали", description="Матеріали для поточної діяльності"),
        ProductCategory(name="Запчастини", description="Запчастини для обладнання та техніки"),
    ]

    for category in categories:
        existing = db.query(ProductCategory).filter(ProductCategory.name == category.name).first()
        if not existing:
            db.add(category)
            print(f"[OK] Створено категорію: {category.name}")

    db.commit()


def main():
    """Головна функція"""
    print("=== Створення початкових даних для Agro ERP ===\n")

    # Створити всі таблиці
    print("Створення таблиць БД...")
    Base.metadata.create_all(bind=engine)
    print("[OK] Таблиці створено\n")

    # Отримати сесію БД
    db = SessionLocal()

    try:
        create_departments(db)
        print()

        create_roles(db)
        print()

        create_admin_user(db)
        print()

        create_units(db)
        print()

        create_product_categories(db)
        print()

        print("=== Успішно! Початкові дані створено ===")
        print("\nТепер ви можете запустити backend:")
        print("cd C:\\elev\\backend")
        print("venv\\Scripts\\activate")
        print("uvicorn app.main:app --reload")
        print("\nЛогін: admin")
        print("Пароль: admin (ЗМІНІТЬ ПІСЛЯ ПЕРШОГО ВХОДУ!)")

    except Exception as e:
        print(f"\n[ERROR] Помилка: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
