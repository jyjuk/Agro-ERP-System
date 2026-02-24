from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.api.deps import get_db, get_current_user
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, ProductCategoryResponse, UnitResponse
from app.models.product import Product, ProductCategory, Unit
from app.models.user import User

router = APIRouter()


def generate_product_code(db: Session) -> str:
    """Генерувати унікальний код товару: PROD-0001, PROD-0002, ..."""
    # Знайти останній код
    last_product = db.query(Product).order_by(Product.id.desc()).first()

    if last_product and last_product.code and last_product.code.startswith('PROD-'):
        try:
            last_num = int(last_product.code.split('-')[1])
            new_num = last_num + 1
        except (IndexError, ValueError):
            new_num = 1
    else:
        new_num = 1

    return f"PROD-{new_num:04d}"


@router.get("/categories", response_model=List[ProductCategoryResponse])
def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all product categories"""
    return db.query(ProductCategory).all()


@router.post("/categories", response_model=ProductCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(
    name: str,
    description: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new product category"""
    # Check if category already exists
    existing = db.query(ProductCategory).filter(ProductCategory.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Category '{name}' already exists"
        )

    category = ProductCategory(name=name, description=description)
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/units", response_model=List[UnitResponse])
def list_units(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all units"""
    return db.query(Unit).all()


@router.post("/units", response_model=UnitResponse, status_code=status.HTTP_201_CREATED)
def create_unit(
    name: str,
    short_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new unit"""
    # Check if unit already exists
    existing = db.query(Unit).filter(Unit.name == name).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unit '{name}' already exists"
        )

    unit = Unit(name=name, short_name=short_name)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit


@router.get("/", response_model=List[ProductResponse])
def list_products(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = True,
    product_type: Optional[str] = Query(None, description="Filter by product_type: consumable or spare_part"),
    category_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get list of products"""
    query = db.query(Product)

    if active_only:
        query = query.filter(Product.is_active == True)

    if product_type:
        query = query.filter(Product.product_type == product_type)

    if category_id:
        query = query.filter(Product.category_id == category_id)

    products = query.offset(skip).limit(limit).all()
    return products


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get product by ID"""
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )
    return product


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new product (код генерується автоматично)"""
    # Validate product_type
    if product.product_type not in ["consumable", "spare_part"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_type must be 'consumable' or 'spare_part'"
        )

    # Автогенерація коду
    code = generate_product_code(db)

    # Створити товар з автогенерованим кодом
    product_data = product.model_dump()
    product_data['code'] = code

    db_product = Product(**product_data)
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update product (код не можна змінити)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Validate product_type if updating
    if product.product_type and product.product_type not in ["consumable", "spare_part"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="product_type must be 'consumable' or 'spare_part'"
        )

    # Update fields (код автоматично виключається, оскільки його немає в ProductUpdate)
    for field, value in product.model_dump(exclude_unset=True).items():
        setattr(db_product, field, value)

    db.commit()
    db.refresh(db_product)
    return db_product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Soft delete product (set is_active=False)"""
    db_product = db.query(Product).filter(Product.id == product_id).first()
    if not db_product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    db_product.is_active = False
    db.commit()
    return None
