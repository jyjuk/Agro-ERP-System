from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Create database engine
is_sqlite = "sqlite" in settings.DATABASE_URL

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    # pool_pre_ping: перевіряє з'єднання перед кожним запитом.
    # Критично для Neon/PostgreSQL — вони скидають idle з'єднання.
    pool_pre_ping=not is_sqlite,
    # Для PostgreSQL на Render/Neon: не тримати більше 5 з'єднань
    pool_size=5 if not is_sqlite else 5,
    max_overflow=0 if not is_sqlite else 10,
    echo=settings.DEBUG
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
