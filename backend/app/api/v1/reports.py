from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, extract, and_, or_
from typing import Optional
from datetime import date as date_type, datetime, timedelta
from decimal import Decimal
from app.api.deps import get_db, get_current_user, get_current_warehouse_or_above, get_current_report_reader
from app.schemas.report import (
    DashboardResponse,
    DashboardKPIs,
    MonthlyPurchaseData,
    TopSupplier,
    TopProduct,
    RecentTransaction,
    PurchaseReportSummary,
    PurchaseReportItem,
    CostAnalysisResponse,
    PeriodCostData,
    CategoryCostData,
    ProductCostRow,
    DepartmentCostData,
    SupplierReportResponse,
    SupplierAnalytics,
    SupplierProductRow,
    DepartmentReportResponse,
    DepartmentReportData,
    DepartmentMaterialRow,
    MaterialReportResponse,
    MaterialReportData,
    MaterialLocation
)
from app.models.user import User
from app.models.purchase import Purchase, PurchaseItem
from app.models.inventory import Inventory, InventoryTransaction
from app.models.transfer import Transfer, TransferItem
from app.models.supplier import Supplier
from app.models.product import Product, ProductCategory, Unit
from app.models.department import Department
from app.models.writeoff import WriteOff, WriteOffItem

router = APIRouter()


def get_month_name_uk(month_num: int) -> str:
    months_uk = [
        "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
        "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
    ]
    return months_uk[month_num - 1] if 1 <= month_num <= 12 else str(month_num)


@router.get("/dashboard", response_model=DashboardResponse)
def get_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    # === KPIs ===
    inventory_items = db.query(Inventory).filter(Inventory.quantity > 0).all()
    total_inventory_value = Decimal(0)
    for item in inventory_items:
        avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
            InventoryTransaction.product_id == item.product_id,
            InventoryTransaction.to_department_id == item.department_id,
            InventoryTransaction.unit_cost.isnot(None)
        ).scalar()
        if avg_cost:
            total_inventory_value += item.quantity * Decimal(str(avg_cost))

    today = datetime.now().date()
    first_day_of_month = today.replace(day=1)

    purchases_this_month = db.query(func.sum(Purchase.total_amount)).filter(
        Purchase.date >= first_day_of_month,
        Purchase.date <= today,
        Purchase.status == "confirmed"
    ).scalar() or Decimal(0)

    purchases_count_this_month = db.query(func.count(Purchase.id)).filter(
        Purchase.date >= first_day_of_month,
        Purchase.date <= today,
        Purchase.status == "confirmed"
    ).scalar() or 0

    low_stock_count = db.query(func.count(Inventory.id)).join(Product).filter(
        Inventory.quantity < Product.min_stock_level,
        Product.min_stock_level > 0,
        Inventory.quantity > 0
    ).scalar() or 0

    departments_count = db.query(func.count(Department.id)).filter(
        Department.is_active == True
    ).scalar() or 0

    products_count = db.query(func.count(Product.id)).filter(
        Product.is_active == True
    ).scalar() or 0

    kpis = DashboardKPIs(
        total_inventory_value=total_inventory_value,
        purchases_this_month=purchases_this_month,
        purchases_count_this_month=purchases_count_this_month,
        low_stock_items_count=low_stock_count,
        departments_count=departments_count,
        products_count=products_count
    )

    # === Monthly Purchases (last 6 months) ===
    monthly_purchases = []
    for i in range(5, -1, -1):
        month_date = today - timedelta(days=30 * i)
        first_day = month_date.replace(day=1)
        if month_date.month == 12:
            last_day = month_date.replace(year=month_date.year + 1, month=1, day=1) - timedelta(days=1)
        else:
            last_day = month_date.replace(month=month_date.month + 1, day=1) - timedelta(days=1)

        total = db.query(func.sum(Purchase.total_amount)).filter(
            Purchase.date >= first_day,
            Purchase.date <= last_day,
            Purchase.status == "confirmed"
        ).scalar() or Decimal(0)

        count = db.query(func.count(Purchase.id)).filter(
            Purchase.date >= first_day,
            Purchase.date <= last_day,
            Purchase.status == "confirmed"
        ).scalar() or 0

        monthly_purchases.append(MonthlyPurchaseData(
            month=first_day.strftime("%Y-%m"),
            month_name=f"{get_month_name_uk(first_day.month)} {first_day.year}",
            total_amount=total,
            purchase_count=count
        ))

    # === Top Suppliers ===
    top_suppliers_data = db.query(
        Supplier.id,
        Supplier.name,
        func.sum(Purchase.total_amount).label("total"),
        func.count(Purchase.id).label("count")
    ).join(Purchase).filter(
        Purchase.status == "confirmed"
    ).group_by(Supplier.id, Supplier.name).order_by(
        func.sum(Purchase.total_amount).desc()
    ).limit(5).all()

    top_suppliers = [
        TopSupplier(
            supplier_id=s.id,
            supplier_name=s.name,
            total_purchases=s.total or Decimal(0),
            purchase_count=s.count or 0
        )
        for s in top_suppliers_data
    ]

    # === Top Products by purchase amount ===
    top_products_data = db.query(
        Product.id,
        Product.name,
        Product.code,
        func.sum(PurchaseItem.total_price).label("total_cost"),
        func.sum(PurchaseItem.quantity).label("total_quantity")
    ).join(PurchaseItem, PurchaseItem.product_id == Product.id
    ).join(Purchase, PurchaseItem.purchase_id == Purchase.id
    ).filter(
        Purchase.status == "confirmed"
    ).group_by(Product.id, Product.name, Product.code).order_by(
        func.sum(PurchaseItem.total_price).desc()
    ).limit(5).all()

    top_products = [
        TopProduct(
            product_id=p.id,
            product_name=p.name,
            product_code=p.code,
            total_cost=Decimal(str(p.total_cost)) if p.total_cost else Decimal(0),
            quantity_used=Decimal(str(p.total_quantity)) if p.total_quantity else Decimal(0)
        )
        for p in top_products_data
    ]

    # === Recent Transactions ===
    recent_trans = db.query(InventoryTransaction).order_by(
        InventoryTransaction.created_at.desc()
    ).limit(10).all()

    recent_transactions = []
    for trans in recent_trans:
        product = db.query(Product).filter(Product.id == trans.product_id).first()
        department = None
        if trans.to_department_id:
            department = db.query(Department).filter(Department.id == trans.to_department_id).first()
        elif trans.from_department_id:
            department = db.query(Department).filter(Department.id == trans.from_department_id).first()

        recent_transactions.append(RecentTransaction(
            id=trans.id,
            transaction_type=trans.transaction_type,
            product_name=product.name if product else "Unknown",
            department_name=department.name if department else None,
            quantity=trans.quantity,
            unit_cost=trans.unit_cost,
            created_at=trans.created_at
        ))

    return DashboardResponse(
        kpis=kpis,
        monthly_purchases=monthly_purchases,
        top_suppliers=top_suppliers,
        top_products=top_products,
        recent_transactions=recent_transactions
    )


@router.get("/purchases", response_model=PurchaseReportSummary)
def get_purchase_report(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    supplier_id: Optional[int] = None,
    category_id: Optional[int] = None,
    product_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    query = db.query(
        Purchase.number,
        Purchase.date,
        Supplier.name.label("supplier_name"),
        Product.name.label("product_name"),
        Product.code.label("product_code"),
        ProductCategory.name.label("category_name"),
        PurchaseItem.quantity,
        PurchaseItem.unit_price,
        PurchaseItem.total_price
    ).join(
        PurchaseItem, Purchase.id == PurchaseItem.purchase_id
    ).join(
        Supplier, Purchase.supplier_id == Supplier.id
    ).join(
        Product, PurchaseItem.product_id == Product.id
    ).outerjoin(
        ProductCategory, Product.category_id == ProductCategory.id
    ).filter(Purchase.status == "confirmed")

    if date_from:
        query = query.filter(Purchase.date >= date_from)
    if date_to:
        query = query.filter(Purchase.date <= date_to)
    if supplier_id:
        query = query.filter(Purchase.supplier_id == supplier_id)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    if product_id:
        query = query.filter(PurchaseItem.product_id == product_id)

    results = query.order_by(Purchase.date.desc(), Purchase.number).all()

    items = [
        PurchaseReportItem(
            purchase_number=r.number,
            purchase_date=r.date,
            supplier_name=r.supplier_name,
            product_name=r.product_name,
            product_code=r.product_code,
            category_name=r.category_name,
            quantity=r.quantity,
            unit_price=r.unit_price,
            total_price=r.total_price
        )
        for r in results
    ]

    total_amount = sum(item.total_price for item in items)
    total_purchases = len(set(item.purchase_number for item in items))

    return PurchaseReportSummary(
        date_from=date_from,
        date_to=date_to,
        total_amount=total_amount,
        total_purchases=total_purchases,
        total_items=len(items),
        items=items
    )


@router.get("/cost-analysis", response_model=CostAnalysisResponse)
def get_cost_analysis(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    group_by: str = Query("month", regex="^(day|month)$"),
    department_id: Optional[int] = None,
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    if not date_to:
        date_to = datetime.now().date()
    if not date_from:
        date_from = date_to - timedelta(days=180)

    # Total purchases in period
    purchase_total_q = db.query(func.sum(PurchaseItem.total_price)).join(
        Purchase, PurchaseItem.purchase_id == Purchase.id
    ).join(
        Product, PurchaseItem.product_id == Product.id
    ).filter(
        Purchase.date >= date_from,
        Purchase.date <= date_to,
        Purchase.status == "confirmed"
    )
    if category_id:
        purchase_total_q = purchase_total_q.filter(Product.category_id == category_id)
    total_purchases = purchase_total_q.scalar() or Decimal(0)

    total_transfers = db.query(func.sum(Transfer.total_cost)).filter(
        Transfer.date >= date_from,
        Transfer.date <= date_to,
        Transfer.status == "confirmed"
    ).scalar() or Decimal(0)

    # Total writeoffs in period
    writeoff_total_q = db.query(func.sum(WriteOffItem.total_cost)).join(
        WriteOff, WriteOffItem.writeoff_id == WriteOff.id
    ).join(
        Product, WriteOffItem.product_id == Product.id
    ).filter(
        WriteOff.date >= date_from,
        WriteOff.date <= date_to,
        WriteOff.status == "confirmed"
    )
    if category_id:
        writeoff_total_q = writeoff_total_q.filter(Product.category_id == category_id)
    if department_id:
        writeoff_total_q = writeoff_total_q.filter(WriteOff.department_id == department_id)
    total_writeoffs = writeoff_total_q.scalar() or Decimal(0)

    # Period data
    period_data = []
    if group_by == "month":
        period_q = db.query(
            extract('year', Purchase.date).label('year'),
            extract('month', Purchase.date).label('month'),
            func.sum(PurchaseItem.total_price).label('total'),
            func.count(func.distinct(Purchase.id)).label('count')
        ).join(
            PurchaseItem, Purchase.id == PurchaseItem.purchase_id
        ).join(
            Product, PurchaseItem.product_id == Product.id
        ).filter(
            Purchase.date >= date_from,
            Purchase.date <= date_to,
            Purchase.status == "confirmed"
        )
        if category_id:
            period_q = period_q.filter(Product.category_id == category_id)
        monthly_data = period_q.group_by('year', 'month').order_by('year', 'month').all()

        for data in monthly_data:
            year = int(data.year)
            month = int(data.month)
            transfer_count = db.query(func.count(Transfer.id)).filter(
                extract('year', Transfer.date) == year,
                extract('month', Transfer.date) == month,
                Transfer.status == "confirmed"
            ).scalar() or 0

            period_data.append(PeriodCostData(
                period=f"{year}-{month:02d}",
                period_name=f"{get_month_name_uk(month)} {year}",
                total_cost=data.total or Decimal(0),
                purchase_count=data.count or 0,
                transfer_count=transfer_count
            ))

    # Category breakdown — fixed JOIN order
    category_q = db.query(
        ProductCategory.id,
        ProductCategory.name,
        func.sum(PurchaseItem.total_price).label('total')
    ).join(
        Product, Product.category_id == ProductCategory.id
    ).join(
        PurchaseItem, PurchaseItem.product_id == Product.id
    ).join(
        Purchase, PurchaseItem.purchase_id == Purchase.id
    ).filter(
        Purchase.date >= date_from,
        Purchase.date <= date_to,
        Purchase.status == "confirmed"
    )
    if category_id:
        category_q = category_q.filter(ProductCategory.id == category_id)
    category_totals = category_q.group_by(ProductCategory.id, ProductCategory.name).all()

    total_for_percentage = sum(c.total for c in category_totals if c.total) or Decimal(1)
    category_breakdown = [
        CategoryCostData(
            category_id=cat.id,
            category_name=cat.name,
            total_cost=cat.total or Decimal(0),
            percentage=(cat.total or Decimal(0)) / total_for_percentage * 100
        )
        for cat in category_totals
    ]

    # Product breakdown — purchases per product
    prod_purchase_q = db.query(
        Product.id,
        Product.name,
        Product.code,
        ProductCategory.name.label('category_name'),
        Unit.short_name.label('unit_name'),
        func.sum(PurchaseItem.quantity).label('qty'),
        func.sum(PurchaseItem.total_price).label('val'),
    ).join(PurchaseItem, PurchaseItem.product_id == Product.id
    ).join(Purchase, PurchaseItem.purchase_id == Purchase.id
    ).outerjoin(ProductCategory, Product.category_id == ProductCategory.id
    ).outerjoin(Unit, Product.unit_id == Unit.id
    ).filter(
        Purchase.date >= date_from,
        Purchase.date <= date_to,
        Purchase.status == "confirmed"
    )
    if category_id:
        prod_purchase_q = prod_purchase_q.filter(Product.category_id == category_id)
    if department_id:
        prod_purchase_q = prod_purchase_q.filter(Purchase.department_id == department_id)
    prod_purchases = {
        r.id: r for r in prod_purchase_q.group_by(
            Product.id, Product.name, Product.code,
            ProductCategory.name, Unit.short_name
        ).all()
    }

    # writeoffs per product
    prod_writeoff_q = db.query(
        Product.id,
        func.sum(WriteOffItem.quantity).label('qty'),
        func.sum(WriteOffItem.total_cost).label('val'),
    ).join(WriteOffItem, WriteOffItem.product_id == Product.id
    ).join(WriteOff, WriteOffItem.writeoff_id == WriteOff.id
    ).filter(
        WriteOff.date >= date_from,
        WriteOff.date <= date_to,
        WriteOff.status == "confirmed"
    )
    if category_id:
        prod_writeoff_q = prod_writeoff_q.filter(Product.category_id == category_id)
    if department_id:
        prod_writeoff_q = prod_writeoff_q.filter(WriteOff.department_id == department_id)
    prod_writeoffs = {
        r.id: r for r in prod_writeoff_q.group_by(Product.id).all()
    }

    # merge purchases + writeoffs per product
    all_pids = set(prod_purchases.keys()) | set(prod_writeoffs.keys())
    product_breakdown = []
    for pid in all_pids:
        pr = prod_purchases.get(pid)
        wo = prod_writeoffs.get(pid)
        # get product meta if only in writeoffs
        if pr:
            name, code, cat_name, unit_name = pr.name, pr.code, pr.category_name, pr.unit_name
        else:
            p = db.query(Product).filter(Product.id == pid).first()
            cat = db.query(ProductCategory).filter(ProductCategory.id == p.category_id).first() if p else None
            u = db.query(Unit).filter(Unit.id == p.unit_id).first() if p else None
            name = p.name if p else ''
            code = p.code if p else ''
            cat_name = cat.name if cat else None
            unit_name = u.short_name if u else None

        product_breakdown.append(ProductCostRow(
            product_id=pid,
            product_name=name,
            product_code=code,
            category_name=cat_name,
            unit_name=unit_name,
            purchased_quantity=Decimal(str(pr.qty)) if pr and pr.qty else Decimal(0),
            purchased_value=Decimal(str(pr.val)) if pr and pr.val else Decimal(0),
            writeoff_quantity=Decimal(str(wo.qty)) if wo and wo.qty else Decimal(0),
            writeoff_value=Decimal(str(wo.val)) if wo and wo.val else Decimal(0),
        ))
    product_breakdown.sort(key=lambda x: x.purchased_value + x.writeoff_value, reverse=True)

    # Department breakdown
    dept_q = db.query(Department).filter(Department.is_active == True)
    if department_id:
        dept_q = dept_q.filter(Department.id == department_id)
    departments = dept_q.all()
    department_breakdown = []

    for dept in departments:
        inventory_items = db.query(Inventory).filter(
            Inventory.department_id == dept.id,
            Inventory.quantity > 0
        ).all()
        inventory_value = Decimal(0)
        for item in inventory_items:
            avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
                InventoryTransaction.product_id == item.product_id,
                InventoryTransaction.to_department_id == dept.id,
                InventoryTransaction.unit_cost.isnot(None)
            ).scalar()
            if avg_cost:
                inventory_value += item.quantity * Decimal(str(avg_cost))

        transfers_received = db.query(func.sum(Transfer.total_cost)).filter(
            Transfer.to_department_id == dept.id,
            Transfer.date >= date_from,
            Transfer.date <= date_to,
            Transfer.status == "confirmed"
        ).scalar() or Decimal(0)

        transfers_sent = db.query(func.sum(Transfer.total_cost)).filter(
            Transfer.from_department_id == dept.id,
            Transfer.date >= date_from,
            Transfer.date <= date_to,
            Transfer.status == "confirmed"
        ).scalar() or Decimal(0)

        dept_writeoffs_total = db.query(func.sum(WriteOffItem.total_cost)).join(
            WriteOff, WriteOffItem.writeoff_id == WriteOff.id
        ).filter(
            WriteOff.department_id == dept.id,
            WriteOff.date >= date_from,
            WriteOff.date <= date_to,
            WriteOff.status == "confirmed"
        ).scalar() or Decimal(0)

        # Per-product breakdown for this department
        dp_purchases = {
            r.id: r for r in db.query(
                Product.id,
                Product.name,
                Product.code,
                ProductCategory.name.label('category_name'),
                Unit.short_name.label('unit_name'),
                func.sum(PurchaseItem.quantity).label('qty'),
                func.sum(PurchaseItem.total_price).label('val'),
            ).join(PurchaseItem, PurchaseItem.product_id == Product.id
            ).join(Purchase, PurchaseItem.purchase_id == Purchase.id
            ).outerjoin(ProductCategory, Product.category_id == ProductCategory.id
            ).outerjoin(Unit, Product.unit_id == Unit.id
            ).filter(
                Purchase.department_id == dept.id,
                Purchase.date >= date_from,
                Purchase.date <= date_to,
                Purchase.status == "confirmed"
            ).group_by(
                Product.id, Product.name, Product.code,
                ProductCategory.name, Unit.short_name
            ).all()
        }

        dp_writeoffs = {
            r.id: r for r in db.query(
                Product.id,
                func.sum(WriteOffItem.quantity).label('qty'),
                func.sum(WriteOffItem.total_cost).label('val'),
            ).join(WriteOffItem, WriteOffItem.product_id == Product.id
            ).join(WriteOff, WriteOffItem.writeoff_id == WriteOff.id
            ).filter(
                WriteOff.department_id == dept.id,
                WriteOff.date >= date_from,
                WriteOff.date <= date_to,
                WriteOff.status == "confirmed"
            ).group_by(Product.id).all()
        }

        dept_pids = set(dp_purchases.keys()) | set(dp_writeoffs.keys())
        dept_materials = []
        for pid in dept_pids:
            pr = dp_purchases.get(pid)
            wo = dp_writeoffs.get(pid)
            if pr:
                pname, pcode, cat_name, unit_name = pr.name, pr.code, pr.category_name, pr.unit_name
            else:
                p_obj = db.query(Product).filter(Product.id == pid).first()
                cat_obj = db.query(ProductCategory).filter(ProductCategory.id == p_obj.category_id).first() if p_obj else None
                u_obj = db.query(Unit).filter(Unit.id == p_obj.unit_id).first() if p_obj else None
                pname = p_obj.name if p_obj else ''
                pcode = p_obj.code if p_obj else ''
                cat_name = cat_obj.name if cat_obj else None
                unit_name = u_obj.short_name if u_obj else None
            dept_materials.append(ProductCostRow(
                product_id=pid,
                product_name=pname,
                product_code=pcode,
                category_name=cat_name,
                unit_name=unit_name,
                purchased_quantity=Decimal(str(pr.qty)) if pr and pr.qty else Decimal(0),
                purchased_value=Decimal(str(pr.val)) if pr and pr.val else Decimal(0),
                writeoff_quantity=Decimal(str(wo.qty)) if wo and wo.qty else Decimal(0),
                writeoff_value=Decimal(str(wo.val)) if wo and wo.val else Decimal(0),
            ))
        dept_materials.sort(key=lambda x: x.purchased_value + x.writeoff_value, reverse=True)

        department_breakdown.append(DepartmentCostData(
            department_id=dept.id,
            department_name=dept.name,
            inventory_value=inventory_value,
            transfers_received=transfers_received,
            transfers_sent=transfers_sent,
            writeoffs_value=dept_writeoffs_total,
            materials=dept_materials
        ))

    return CostAnalysisResponse(
        date_from=date_from,
        date_to=date_to,
        total_purchases=total_purchases,
        total_transfers=total_transfers,
        total_writeoffs=total_writeoffs,
        period_data=period_data,
        category_breakdown=category_breakdown,
        product_breakdown=product_breakdown,
        department_breakdown=department_breakdown
    )


@router.get("/suppliers", response_model=SupplierReportResponse)
def get_supplier_report(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    supplier_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    """
    По постачальнику — всі товари за період.
    Фільтри: дата, постачальник.
    """
    # Per supplier+product rows
    detail_q = db.query(
        Supplier.id.label('supplier_id'),
        Supplier.name.label('supplier_name'),
        Supplier.code.label('supplier_code'),
        Product.id.label('product_id'),
        Product.name.label('product_name'),
        Product.code.label('product_code'),
        ProductCategory.name.label('category_name'),
        Unit.short_name.label('unit_name'),
        func.sum(PurchaseItem.quantity).label('total_quantity'),
        func.sum(PurchaseItem.total_price).label('total_amount'),
        func.count(func.distinct(Purchase.id)).label('purchase_count'),
    ).join(
        Purchase, Supplier.id == Purchase.supplier_id
    ).join(
        PurchaseItem, Purchase.id == PurchaseItem.purchase_id
    ).join(
        Product, PurchaseItem.product_id == Product.id
    ).outerjoin(
        ProductCategory, Product.category_id == ProductCategory.id
    ).outerjoin(
        Unit, Product.unit_id == Unit.id
    ).filter(Purchase.status == "confirmed")

    if date_from:
        detail_q = detail_q.filter(Purchase.date >= date_from)
    if date_to:
        detail_q = detail_q.filter(Purchase.date <= date_to)
    if supplier_id:
        detail_q = detail_q.filter(Supplier.id == supplier_id)

    detail_rows = detail_q.group_by(
        Supplier.id, Supplier.name, Supplier.code,
        Product.id, Product.name, Product.code,
        ProductCategory.name, Unit.short_name
    ).order_by(Supplier.name, func.sum(PurchaseItem.total_price).desc()).all()

    # Supplier summaries (total purchase count and last date)
    summary_q = db.query(
        Purchase.supplier_id,
        func.count(Purchase.id).label('count'),
        func.max(Purchase.date).label('last_date')
    ).filter(Purchase.status == "confirmed")
    if date_from:
        summary_q = summary_q.filter(Purchase.date >= date_from)
    if date_to:
        summary_q = summary_q.filter(Purchase.date <= date_to)
    if supplier_id:
        summary_q = summary_q.filter(Purchase.supplier_id == supplier_id)
    summaries = {s.supplier_id: s for s in summary_q.group_by(Purchase.supplier_id).all()}

    # Group by supplier in Python
    suppliers_dict: dict = {}
    for row in detail_rows:
        sid = row.supplier_id
        if sid not in suppliers_dict:
            summary = summaries.get(sid)
            suppliers_dict[sid] = {
                'supplier_id': sid,
                'supplier_name': row.supplier_name,
                'supplier_code': row.supplier_code or '',
                'total_purchases': Decimal(0),
                'purchase_count': summary.count if summary else 0,
                'last_purchase_date': summary.last_date if summary else None,
                'products': []
            }
        amount = Decimal(str(row.total_amount)) if row.total_amount else Decimal(0)
        suppliers_dict[sid]['total_purchases'] += amount
        suppliers_dict[sid]['products'].append(SupplierProductRow(
            product_id=row.product_id,
            product_name=row.product_name,
            product_code=row.product_code,
            category_name=row.category_name,
            unit_name=row.unit_name,
            total_quantity=Decimal(str(row.total_quantity)) if row.total_quantity else Decimal(0),
            total_amount=amount,
            purchase_count=row.purchase_count or 0
        ))

    suppliers = []
    for s in suppliers_dict.values():
        avg = s['total_purchases'] / s['purchase_count'] if s['purchase_count'] > 0 else Decimal(0)
        suppliers.append(SupplierAnalytics(
            supplier_id=s['supplier_id'],
            supplier_name=s['supplier_name'],
            supplier_code=s['supplier_code'],
            total_purchases=s['total_purchases'],
            purchase_count=s['purchase_count'],
            average_purchase_amount=avg,
            last_purchase_date=s['last_purchase_date'],
            products=s['products']
        ))

    return SupplierReportResponse(date_from=date_from, date_to=date_to, suppliers=suppliers)


@router.get("/departments", response_model=DepartmentReportResponse)
def get_department_report(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    """
    По підрозділу — всі матеріали за період.
    Показує: отримано (закупівлі + переміщення), списано, поточний залишок.
    Фільтри: дата, підрозділ.
    """
    dept_q = db.query(Department).filter(Department.is_active == True)
    if department_id:
        dept_q = dept_q.filter(Department.id == department_id)
    departments = dept_q.all()

    # Preload product/category/unit info
    all_products = {p.id: p for p in db.query(Product).all()}
    all_categories = {c.id: c for c in db.query(ProductCategory).all()}
    all_units = {u.id: u for u in db.query(Unit).all()}

    department_data = []

    for dept in departments:
        # 1. Received via purchases to this dept
        purchase_q = db.query(
            PurchaseItem.product_id,
            func.sum(PurchaseItem.quantity).label('qty'),
            func.sum(PurchaseItem.total_price).label('val')
        ).join(Purchase).filter(
            Purchase.department_id == dept.id,
            Purchase.status == "confirmed"
        )
        if date_from:
            purchase_q = purchase_q.filter(Purchase.date >= date_from)
        if date_to:
            purchase_q = purchase_q.filter(Purchase.date <= date_to)
        purchase_by_product = {
            r.product_id: r for r in purchase_q.group_by(PurchaseItem.product_id).all()
        }

        # 2. Received via transfers to this dept
        transfer_in_q = db.query(
            TransferItem.product_id,
            func.sum(TransferItem.quantity).label('qty'),
            func.sum(TransferItem.total_cost).label('val')
        ).join(Transfer).filter(
            Transfer.to_department_id == dept.id,
            Transfer.status == "confirmed"
        )
        if date_from:
            transfer_in_q = transfer_in_q.filter(Transfer.date >= date_from)
        if date_to:
            transfer_in_q = transfer_in_q.filter(Transfer.date <= date_to)
        transfer_in_by_product = {
            r.product_id: r for r in transfer_in_q.group_by(TransferItem.product_id).all()
        }

        # 3. Written off from this dept
        writeoff_q = db.query(
            WriteOffItem.product_id,
            func.sum(WriteOffItem.quantity).label('qty'),
            func.sum(WriteOffItem.total_cost).label('val')
        ).join(WriteOff).filter(
            WriteOff.department_id == dept.id,
            WriteOff.status == "confirmed"
        )
        if date_from:
            writeoff_q = writeoff_q.filter(WriteOff.date >= date_from)
        if date_to:
            writeoff_q = writeoff_q.filter(WriteOff.date <= date_to)
        writeoff_by_product = {
            r.product_id: r for r in writeoff_q.group_by(WriteOffItem.product_id).all()
        }

        # 3b. Transferred out from this dept
        transfer_out_q = db.query(
            TransferItem.product_id,
            func.sum(TransferItem.quantity).label('qty'),
            func.sum(TransferItem.total_cost).label('val')
        ).join(Transfer).filter(
            Transfer.from_department_id == dept.id,
            Transfer.status == "confirmed"
        )
        if date_from:
            transfer_out_q = transfer_out_q.filter(Transfer.date >= date_from)
        if date_to:
            transfer_out_q = transfer_out_q.filter(Transfer.date <= date_to)
        transfer_out_by_product = {
            r.product_id: r for r in transfer_out_q.group_by(TransferItem.product_id).all()
        }

        # 4. Current inventory in this dept
        inv_by_product = {
            r.product_id: r.quantity
            for r in db.query(Inventory.product_id, Inventory.quantity).filter(
                Inventory.department_id == dept.id
            ).all()
        }

        # 5. Avg cost per product in this dept
        avg_cost_by_product = {}
        for r in db.query(
            InventoryTransaction.product_id,
            func.avg(InventoryTransaction.unit_cost).label('avg_cost')
        ).filter(
            InventoryTransaction.to_department_id == dept.id,
            InventoryTransaction.unit_cost.isnot(None)
        ).group_by(InventoryTransaction.product_id).all():
            if r.avg_cost:
                avg_cost_by_product[r.product_id] = Decimal(str(r.avg_cost))

        # Collect all product IDs with any activity in this dept
        all_pids = (
            set(purchase_by_product.keys()) |
            set(transfer_in_by_product.keys()) |
            set(writeoff_by_product.keys()) |
            set(transfer_out_by_product.keys()) |
            set(inv_by_product.keys())
        )

        materials = []
        total_received_value = Decimal(0)
        total_writeoff_value = Decimal(0)
        total_transferred_value = Decimal(0)
        total_stock_value = Decimal(0)

        for pid in all_pids:
            product = all_products.get(pid)
            if not product:
                continue

            pr = purchase_by_product.get(pid)
            tr = transfer_in_by_product.get(pid)
            wr = writeoff_by_product.get(pid)
            to = transfer_out_by_product.get(pid)

            recv_qty = (
                (Decimal(str(pr.qty)) if pr and pr.qty else Decimal(0)) +
                (Decimal(str(tr.qty)) if tr and tr.qty else Decimal(0))
            )
            recv_val = (
                (Decimal(str(pr.val)) if pr and pr.val else Decimal(0)) +
                (Decimal(str(tr.val)) if tr and tr.val else Decimal(0))
            )
            wo_qty = Decimal(str(wr.qty)) if wr and wr.qty else Decimal(0)
            wo_val = Decimal(str(wr.val)) if wr and wr.val else Decimal(0)
            trout_qty = Decimal(str(to.qty)) if to and to.qty else Decimal(0)
            trout_val = Decimal(str(to.val)) if to and to.val else Decimal(0)

            current_qty = inv_by_product.get(pid, Decimal(0))
            avg_cost = avg_cost_by_product.get(pid, Decimal(0))
            current_val = current_qty * avg_cost

            total_received_value += recv_val
            total_writeoff_value += wo_val
            total_transferred_value += trout_val
            total_stock_value += current_val

            category = all_categories.get(product.category_id)
            unit = all_units.get(product.unit_id)

            materials.append(DepartmentMaterialRow(
                product_id=pid,
                product_name=product.name,
                product_code=product.code,
                category_name=category.name if category else None,
                unit_name=unit.short_name if unit else "од",
                received_quantity=recv_qty,
                received_value=recv_val,
                writeoff_quantity=wo_qty,
                writeoff_value=wo_val,
                transferred_quantity=trout_qty,
                transferred_value=trout_val,
                current_stock=current_qty,
                current_value=current_val
            ))

        materials.sort(key=lambda m: m.current_stock, reverse=True)

        department_data.append(DepartmentReportData(
            department_id=dept.id,
            department_name=dept.name,
            total_received_value=total_received_value,
            total_writeoff_value=total_writeoff_value,
            total_transferred_value=total_transferred_value,
            total_stock_value=total_stock_value,
            materials=materials
        ))

    return DepartmentReportResponse(date_from=date_from, date_to=date_to, departments=department_data)


@router.get("/materials", response_model=MaterialReportResponse)
def get_material_report(
    date_from: Optional[date_type] = None,
    date_to: Optional[date_type] = None,
    product_type: Optional[str] = None,
    category_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_report_reader)
):
    """
    По матеріалу — всі підрозділи за період.
    Фільтри: дата, категорія, підрозділ.
    """
    query = db.query(Product).filter(Product.is_active == True)
    if product_type:
        query = query.filter(Product.product_type == product_type)
    if category_id:
        query = query.filter(Product.category_id == category_id)
    products = query.all()

    materials_data = []

    for product in products:
        category = db.query(ProductCategory).filter(ProductCategory.id == product.category_id).first()
        unit = db.query(Unit).filter(Unit.id == product.unit_id).first()

        # Purchases in period
        purchase_q = db.query(
            func.coalesce(func.sum(PurchaseItem.quantity), 0).label('quantity'),
            func.coalesce(func.sum(PurchaseItem.total_price), 0).label('value'),
            func.count(func.distinct(PurchaseItem.purchase_id)).label('count')
        ).join(Purchase).filter(
            PurchaseItem.product_id == product.id,
            Purchase.status == "confirmed"
        )
        if date_from:
            purchase_q = purchase_q.filter(Purchase.date >= date_from)
        if date_to:
            purchase_q = purchase_q.filter(Purchase.date <= date_to)
        pd = purchase_q.first()
        purchased_quantity = Decimal(str(pd.quantity)) if pd.quantity else Decimal(0)
        purchased_value = Decimal(str(pd.value)) if pd.value else Decimal(0)
        purchase_count = pd.count or 0

        # Writeoffs in period
        writeoff_q = db.query(
            func.coalesce(func.sum(WriteOffItem.quantity), 0).label('quantity'),
            func.coalesce(func.sum(WriteOffItem.total_cost), 0).label('value'),
            func.count(func.distinct(WriteOffItem.writeoff_id)).label('count')
        ).join(WriteOff).filter(
            WriteOffItem.product_id == product.id,
            WriteOff.status == "confirmed"
        )
        if department_id:
            writeoff_q = writeoff_q.filter(WriteOff.department_id == department_id)
        if date_from:
            writeoff_q = writeoff_q.filter(WriteOff.date >= date_from)
        if date_to:
            writeoff_q = writeoff_q.filter(WriteOff.date <= date_to)
        wd = writeoff_q.first()
        writeoff_quantity = Decimal(str(wd.quantity)) if wd.quantity else Decimal(0)
        writeoff_value = Decimal(str(wd.value)) if wd.value else Decimal(0)
        writeoff_count = wd.count or 0

        # Current stock per department
        inv_q = db.query(Inventory).filter(
            Inventory.product_id == product.id,
            Inventory.quantity > 0
        )
        if department_id:
            inv_q = inv_q.filter(Inventory.department_id == department_id)
        inventory_items = inv_q.all()

        current_stock_quantity = Decimal(0)
        current_stock_value = Decimal(0)
        locations = []

        for inv in inventory_items:
            dept = db.query(Department).filter(Department.id == inv.department_id).first()
            avg_cost = db.query(func.avg(InventoryTransaction.unit_cost)).filter(
                InventoryTransaction.product_id == product.id,
                InventoryTransaction.to_department_id == inv.department_id,
                InventoryTransaction.unit_cost.isnot(None)
            ).scalar()

            value = inv.quantity * Decimal(str(avg_cost)) if avg_cost else Decimal(0)
            current_stock_quantity += inv.quantity
            current_stock_value += value

            locations.append(MaterialLocation(
                department_id=inv.department_id,
                department_name=dept.name if dept else "Unknown",
                quantity=inv.quantity,
                value=value
            ))

        if purchased_quantity > 0 or writeoff_quantity > 0 or current_stock_quantity > 0:
            materials_data.append(MaterialReportData(
                product_id=product.id,
                product_name=product.name,
                product_code=product.code,
                category_name=category.name if category else None,
                unit_name=unit.short_name if unit else "од",
                purchased_quantity=purchased_quantity,
                purchased_value=purchased_value,
                purchase_count=purchase_count,
                writeoff_quantity=writeoff_quantity,
                writeoff_value=writeoff_value,
                writeoff_count=writeoff_count,
                current_stock_quantity=current_stock_quantity,
                current_stock_value=current_stock_value,
                locations=locations
            ))

    return MaterialReportResponse(date_from=date_from, date_to=date_to, materials=materials_data)
