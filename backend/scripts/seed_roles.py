"""
Seed script to create initial roles in the database
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.user import Role


def seed_roles():
    """Create initial roles"""
    db = SessionLocal()

    try:
        # Check if roles already exist
        existing_roles = db.query(Role).count()
        if existing_roles > 0:
            print(f"Roles already exist ({existing_roles} roles found). Skipping...")
            return

        # Create roles
        roles = [
            Role(
                name="admin",
                description="Адміністратор системи - повний доступ"
            ),
            Role(
                name="user",
                description="Звичайний користувач - може створювати документи"
            ),
            Role(
                name="viewer",
                description="Перегляд - тільки читання"
            ),
        ]

        for role in roles:
            db.add(role)

        db.commit()
        print(f"✅ Successfully created {len(roles)} roles:")

        for role in roles:
            db.refresh(role)
            print(f"  - {role.name} (ID: {role.id}) - {role.description}")

    except Exception as e:
        print(f"❌ Error creating roles: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Creating initial roles...")
    seed_roles()
