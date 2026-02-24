from pydantic import BaseModel, ConfigDict
from datetime import date, datetime
from typing import List, Optional
from decimal import Decimal


# Dashboard KPIs
class DashboardKPIs(BaseModel):
    total_inventory_value: Decimal
    purchases_this_month: Decimal
    purchases_count_this_month: int
    low_stock_items_count: int
    departments_count: int
    products_count: int


class MonthlyPurchaseData(BaseModel):
    month: str
    month_name: str
    total_amount: Decimal
    purchase_count: int


class TopSupplier(BaseModel):
    supplier_id: int
    supplier_name: str
    total_purchases: Decimal
    purchase_count: int


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    total_cost: Decimal
    quantity_used: Decimal


class RecentTransaction(BaseModel):
    id: int
    transaction_type: str
    product_name: str
    department_name: Optional[str] = None
    quantity: Decimal
    unit_cost: Optional[Decimal] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardResponse(BaseModel):
    kpis: DashboardKPIs
    monthly_purchases: List[MonthlyPurchaseData]
    top_suppliers: List[TopSupplier]
    top_products: List[TopProduct]
    recent_transactions: List[RecentTransaction]


# Purchase Reports
class PurchaseReportItem(BaseModel):
    purchase_number: str
    purchase_date: date
    supplier_name: str
    product_name: str
    product_code: str
    category_name: Optional[str] = None
    quantity: Decimal
    unit_price: Decimal
    total_price: Decimal


class PurchaseReportSummary(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    total_amount: Decimal
    total_purchases: int
    total_items: int
    items: List[PurchaseReportItem]


# Cost Analysis
class PeriodCostData(BaseModel):
    period: str
    period_name: str
    total_cost: Decimal
    purchase_count: int
    transfer_count: int


class CategoryCostData(BaseModel):
    category_id: Optional[int] = None
    category_name: str
    total_cost: Decimal
    percentage: Decimal


class ProductCostRow(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    category_name: Optional[str] = None
    unit_name: Optional[str] = None
    purchased_quantity: Decimal
    purchased_value: Decimal
    writeoff_quantity: Decimal
    writeoff_value: Decimal


class DepartmentCostData(BaseModel):
    department_id: int
    department_name: str
    inventory_value: Decimal
    transfers_received: Decimal
    transfers_sent: Decimal
    writeoffs_value: Decimal
    materials: List[ProductCostRow] = []


class CostAnalysisResponse(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    total_purchases: Decimal
    total_transfers: Decimal
    total_writeoffs: Decimal
    period_data: List[PeriodCostData]
    category_breakdown: List[CategoryCostData]
    product_breakdown: List[ProductCostRow]
    department_breakdown: List[DepartmentCostData]


# Supplier Report — per supplier, all products
class SupplierProductRow(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    category_name: Optional[str] = None
    unit_name: Optional[str] = None
    total_quantity: Decimal
    total_amount: Decimal
    purchase_count: int


class SupplierAnalytics(BaseModel):
    supplier_id: int
    supplier_name: str
    supplier_code: str
    total_purchases: Decimal
    purchase_count: int
    average_purchase_amount: Decimal
    last_purchase_date: Optional[date] = None
    products: List[SupplierProductRow]


class SupplierReportResponse(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    suppliers: List[SupplierAnalytics]


# Department Report — per department, all materials
class DepartmentMaterialRow(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    category_name: Optional[str] = None
    unit_name: Optional[str] = None
    received_quantity: Decimal   # purchases + transfers in
    received_value: Decimal
    writeoff_quantity: Decimal
    writeoff_value: Decimal
    transferred_quantity: Decimal  # transfers out
    transferred_value: Decimal
    current_stock: Decimal
    current_value: Decimal


class DepartmentReportData(BaseModel):
    department_id: int
    department_name: str
    total_received_value: Decimal
    total_writeoff_value: Decimal
    total_transferred_value: Decimal
    total_stock_value: Decimal
    materials: List[DepartmentMaterialRow]


class DepartmentReportResponse(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    departments: List[DepartmentReportData]


# Materials Report — per material, all departments
class MaterialLocation(BaseModel):
    department_id: int
    department_name: str
    quantity: Decimal
    value: Decimal


class MaterialReportData(BaseModel):
    product_id: int
    product_name: str
    product_code: str
    category_name: Optional[str] = None
    unit_name: str
    purchased_quantity: Decimal
    purchased_value: Decimal
    purchase_count: int
    writeoff_quantity: Decimal
    writeoff_value: Decimal
    writeoff_count: int
    current_stock_quantity: Decimal
    current_stock_value: Decimal
    locations: List[MaterialLocation]


class MaterialReportResponse(BaseModel):
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    materials: List[MaterialReportData]
