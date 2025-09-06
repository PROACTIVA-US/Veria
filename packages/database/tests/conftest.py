"""
Test configuration and fixtures for database tests
"""

import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from ..models import Base, Organization, User, Product, Transaction, Holding
from ..connection import DatabaseManager


@pytest.fixture(scope="session")
def test_engine():
    """Create test database engine"""
    # Use in-memory SQLite for tests
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    return engine


@pytest.fixture(scope="function")
def db_session(test_engine):
    """Create a new database session for each test"""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    session = SessionLocal()
    
    yield session
    
    # Cleanup
    session.rollback()
    session.close()


@pytest.fixture
def test_organization(db_session):
    """Create a test organization"""
    org = Organization(
        name="Test Issuer",
        legal_name="Test Issuer LLC",
        type="issuer",
        jurisdiction="US",
        kyb_status="approved",
        kyb_completed_at=datetime.utcnow(),
        kyb_expires_at=datetime.utcnow() + timedelta(days=365)
    )
    db_session.add(org)
    db_session.commit()
    return org


@pytest.fixture
def test_user(db_session, test_organization):
    """Create a test user"""
    user = User(
        organization_id=test_organization.id,
        email="test@veria.io",
        first_name="Test",
        last_name="User",
        wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb8",
        role="admin",
        kyc_status="approved",
        kyc_completed_at=datetime.utcnow(),
        kyc_expires_at=datetime.utcnow() + timedelta(days=365)
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_product(db_session, test_organization):
    """Create a test product"""
    product = Product(
        issuer_id=test_organization.id,
        token_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb9",
        chain_id=80001,  # Mumbai
        name="US Treasury Token",
        symbol="USTT",
        description="Tokenized US Treasury Bills",
        asset_type="treasury",
        currency="USD",
        min_investment=Decimal("1000.00"),
        max_investment=Decimal("10000000.00"),
        total_supply=Decimal("100000000.00"),
        available_supply=Decimal("50000000.00"),
        nav_per_token=Decimal("1.00"),
        apy=Decimal("5.25"),
        is_active=True
    )
    db_session.add(product)
    db_session.commit()
    return product


@pytest.fixture
def test_transaction(db_session, test_user, test_product):
    """Create a test transaction"""
    transaction = Transaction(
        transaction_hash="0x" + "a" * 64,
        chain_id=80001,
        block_number=12345678,
        type="subscription",
        status="completed",
        from_user_id=test_user.id,
        product_id=test_product.id,
        amount=Decimal("10000.00"),
        token_amount=Decimal("10000.00"),
        price_per_token=Decimal("1.00"),
        fee_amount=Decimal("10.00"),
        gas_fee=Decimal("0.50"),
        initiated_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow()
    )
    db_session.add(transaction)
    db_session.commit()
    return transaction


@pytest.fixture
def test_holding(db_session, test_user, test_product):
    """Create a test holding"""
    holding = Holding(
        user_id=test_user.id,
        product_id=test_product.id,
        balance=Decimal("10000.00"),
        locked_balance=Decimal("0.00"),
        average_cost_basis=Decimal("1.00"),
        first_purchase_date=datetime.utcnow(),
        last_activity_date=datetime.utcnow()
    )
    db_session.add(holding)
    db_session.commit()
    return holding
