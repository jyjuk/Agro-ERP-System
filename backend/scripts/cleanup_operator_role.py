"""
Reassign 'operator' users to 'department_head', then remove operator role.
Run from C:\elev\backend:
    python scripts/cleanup_operator_role.py
"""
import sys, logging
logging.disable(logging.CRITICAL)
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database import SessionLocal
from app.models.user import User, Role


def main():
    db = SessionLocal()
    try:
        op_role = db.query(Role).filter(Role.name == "operator").first()
        if not op_role:
            print("operator role not found — nothing to do")
            return

        dept_head_role = db.query(Role).filter(Role.name == "department_head").first()
        if not dept_head_role:
            print("ERROR: department_head role not found")
            return

        # Reassign operator users to department_head
        op_users = db.query(User).filter(User.role_id == op_role.id).all()
        for u in op_users:
            print(f"  Reassigning '{u.username}': operator -> department_head")
            u.role_id = dept_head_role.id
        db.commit()

        # Delete operator role
        db.delete(op_role)
        db.commit()
        print("Deleted 'operator' role")

        print("\nFinal roles:")
        for r in db.query(Role).order_by(Role.id).all():
            print(f"  id={r.id}  name={r.name}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
