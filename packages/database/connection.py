"""
Database connection and session management
"""

import os
from contextlib import contextmanager
from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, QueuePool
from dotenv import load_dotenv

from models import Base

# Load environment variables
load_dotenv()

# Database configuration
DATABASE_URL = os.getenv(
    'DATABASE_URL',
    'postgresql://veria:veria123@localhost:5432/veria'
)

# Configure connection pool for production
engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,           # Number of connections to maintain
    max_overflow=10,        # Maximum overflow connections
    pool_pre_ping=True,     # Test connections before using
    pool_recycle=3600,      # Recycle connections after 1 hour
    echo=False              # Set to True for SQL debugging
)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


def init_db():
    """Initialize database with all tables"""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Drop all tables - USE WITH CAUTION"""
    Base.metadata.drop_all(bind=engine)


@contextmanager
def get_db() -> Generator[Session, None, None]:
    """
    Context manager for database sessions.
    Ensures proper cleanup even if an error occurs.
    
    Usage:
        with get_db() as db:
            user = db.query(User).first()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Session:
    """
    Get a database session for dependency injection.
    Used with FastAPI or other frameworks.
    
    Usage:
        def get_users(db: Session = Depends(get_db_session)):
            return db.query(User).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class DatabaseManager:
    """
    Database manager for advanced operations
    """
    
    def __init__(self, database_url: str = None):
        self.database_url = database_url or DATABASE_URL
        self.engine = create_engine(
            self.database_url,
            poolclass=QueuePool,
            pool_size=20,
            max_overflow=10,
            pool_pre_ping=True
        )
        self.SessionLocal = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )
    
    def create_all_tables(self):
        """Create all database tables"""
        Base.metadata.create_all(bind=self.engine)
    
    def drop_all_tables(self):
        """Drop all database tables - DANGEROUS"""
        Base.metadata.drop_all(bind=self.engine)
    
    def get_session(self) -> Session:
        """Get a new database session"""
        return self.SessionLocal()
    
    @contextmanager
    def session_scope(self) -> Generator[Session, None, None]:
        """Provide a transactional scope for database operations"""
        session = self.SessionLocal()
        try:
            yield session
            session.commit()
        except Exception:
            session.rollback()
            raise
        finally:
            session.close()
    
    def execute_raw_sql(self, sql: str, params: dict = None):
        """Execute raw SQL query"""
        with self.engine.connect() as conn:
            result = conn.execute(sql, params or {})
            conn.commit()
            return result
    
    def health_check(self) -> bool:
        """Check if database is accessible"""
        try:
            with self.engine.connect() as conn:
                conn.execute("SELECT 1")
            return True
        except Exception:
            return False


# Create global database manager instance
db_manager = DatabaseManager()


# Health check function
def check_database_health() -> dict:
    """
    Comprehensive database health check
    """
    try:
        with get_db() as db:
            # Check connection
            db.execute("SELECT 1")
            
            # Get table counts
            from .models import User, Organization, Product, Transaction
            
            stats = {
                "status": "healthy",
                "connected": True,
                "tables": {
                    "organizations": db.query(Organization).count(),
                    "users": db.query(User).count(),
                    "products": db.query(Product).count(),
                    "transactions": db.query(Transaction).count()
                },
                "pool_size": engine.pool.size(),
                "pool_checked_in": engine.pool.checkedin(),
                "pool_overflow": engine.pool.overflow(),
                "pool_total": engine.pool.total()
            }
            return stats
    except Exception as e:
        return {
            "status": "unhealthy",
            "connected": False,
            "error": str(e)
        }


if __name__ == "__main__":
    # Test database connection
    print("Testing database connection...")
    if db_manager.health_check():
        print("✅ Database connection successful!")
        print(f"Database URL: {DATABASE_URL}")
        
        # Get health stats
        health = check_database_health()
        print(f"Health check: {health}")
    else:
        print("❌ Database connection failed!")
        print("Please check your DATABASE_URL and ensure PostgreSQL is running.")
