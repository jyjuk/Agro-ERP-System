from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import all models to register them with Base
from app.models import user, supplier, product, purchase, inventory, transfer, writeoff, department, audit, transport, electricity, gas

# Create database tables
Base.metadata.create_all(bind=engine)


def _run_schema_migrations():
    """Додає нові колонки до існуючих таблиць (idempotent)."""
    try:
        from sqlalchemy import inspect as sa_inspect, text
        from sqlalchemy.exc import NoSuchTableError
        insp = sa_inspect(engine)
        try:
            cols = [c['name'] for c in insp.get_columns('transport_units')]
        except NoSuchTableError:
            return  # таблиця ще не існує — create_all вже її створить з новими колонками
        if 'department_id' not in cols:
            # engine.begin() auto-commit on success, auto-rollback on error
            with engine.begin() as conn:
                conn.execute(text(
                    "ALTER TABLE transport_units ADD COLUMN IF NOT EXISTS "
                    "department_id INTEGER REFERENCES departments(id)"
                ))
    except Exception:
        pass  # не валимо застосунок через міграцію

    # electricity_records — generator columns
    try:
        cols = [c['name'] for c in insp.get_columns('electricity_records')]
        with engine.begin() as conn:
            if 'gen_start' not in cols:
                conn.execute(text("ALTER TABLE electricity_records ADD COLUMN IF NOT EXISTS gen_start NUMERIC(12,2)"))
            if 'gen_end' not in cols:
                conn.execute(text("ALTER TABLE electricity_records ADD COLUMN IF NOT EXISTS gen_end NUMERIC(12,2)"))
    except Exception:
        pass


_run_schema_migrations()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.services.scheduler import start_scheduler, stop_scheduler
    start_scheduler()
    yield
    stop_scheduler()


# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG,
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "Agro ERP System API",
        "version": settings.VERSION,
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


# Include API routers
from app.api.v1 import auth, suppliers, products, purchases, inventory, transfers, reports, departments, writeoffs, users, notifications, transport, inventory_counts, electricity, audit, gas

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(users.router, prefix="/api/v1/users", tags=["Users"])
app.include_router(suppliers.router, prefix="/api/v1/suppliers", tags=["Suppliers"])
app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
app.include_router(departments.router, prefix="/api/v1/departments", tags=["Departments"])
app.include_router(purchases.router, prefix="/api/v1/purchases", tags=["Purchases"])
app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
app.include_router(writeoffs.router, prefix="/api/v1/writeoffs", tags=["Write-offs"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["Notifications"])
app.include_router(transport.router, prefix="/api/v1/transport", tags=["Transport"])
app.include_router(inventory_counts.router, prefix="/api/v1/inventory-counts", tags=["Inventory Counts"])
app.include_router(electricity.router, prefix="/api/v1/electricity", tags=["Electricity"])
app.include_router(audit.router, prefix="/api/v1/audit", tags=["Audit"])
app.include_router(gas.router,   prefix="/api/v1/gas",   tags=["Gas"])

# TODO: Add more routers
# from app.api.v1 import products, purchases, inventory, transfers, reports
# app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
# app.include_router(purchases.router, prefix="/api/v1/purchases", tags=["Purchases"])
# app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
# app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
# app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
