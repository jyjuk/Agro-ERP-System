"""
Add accountant role — read-only access to inventory and reports.
Run from C:\elev\backend:
    python scripts/add_accountant_role.py
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.user import Role


def main():
    db = SessionLocal()
    try:
        existing = db.query(Role).filter(Role.name == "accountant").first()
        if existing:
            print(f"Role 'accountant' already exists (id={existing.id})")
            return

        role = Role(
            name="accountant",
            description="Бухгалтерія — перегляд залишків і звітів"
        )
        db.add(role)
        db.commit()
        db.refresh(role)
        print(f"Created role 'accountant' (id={role.id})")

        # Show all roles
        print("\nAll roles:")
        for r in db.query(Role).order_by(Role.id).all():
            print(f"  id={r.id}  name={r.name}  desc={r.description}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
