from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base

# Import all models to register them with Base
from app.models import user, supplier, product, purchase, inventory, transfer, writeoff, department, audit, transport

# Create database tables
Base.metadata.create_all(bind=engine)

# Create FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    debug=settings.DEBUG
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
from app.api.v1 import auth, suppliers, products, purchases, inventory, transfers, reports, departments, writeoffs, users, notifications, transport, inventory_counts

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

# TODO: Add more routers
# from app.api.v1 import products, purchases, inventory, transfers, reports
# app.include_router(products.router, prefix="/api/v1/products", tags=["Products"])
# app.include_router(purchases.router, prefix="/api/v1/purchases", tags=["Purchases"])
# app.include_router(inventory.router, prefix="/api/v1/inventory", tags=["Inventory"])
# app.include_router(transfers.router, prefix="/api/v1/transfers", tags=["Transfers"])
# app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
