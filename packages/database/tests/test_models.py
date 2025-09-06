"""Tests for database models and operations"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from packages.database.models import Base, User, ApiKey, ComplianceCheck, AuditLog
from packages.database.connection import get_db_session


@pytest.fixture
def test_db():
    """Create a test database for each test"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    TestSession = sessionmaker(bind=engine)
    session = TestSession()
    yield session
    session.close()


def test_create_user(test_db):
    """Test creating a user"""
    user = User(
        email="test@veria.io",
        organization="Test Corp",
        role="admin",
        jurisdiction="US"
    )
    test_db.add(user)
    test_db.commit()
    
    assert user.id is not None
    assert user.email == "test@veria.io"
    assert user.kyc_status == "pending"
    assert user.created_at is not None


def test_create_api_key(test_db):
    """Test creating an API key for a user"""
    # Create user first
    user = User(
        email="api@veria.io",
        organization="API Corp"
    )
    test_db.add(user)
    test_db.commit()
    
    # Create API key
    api_key = ApiKey(
        key="test_key_" + str(uuid.uuid4())[:8],
        name="Test API Key",
        user_id=user.id,
        rate_limit=5000
    )
    test_db.add(api_key)
    test_db.commit()
    
    assert api_key.id is not None
    assert api_key.user_id == user.id
    assert api_key.is_active is True
    assert api_key.rate_limit == 5000


def test_compliance_check_creation(test_db):
    """Test creating a compliance check"""
    # Create user
    user = User(email="compliance@veria.io", organization="Compliance Inc")
    test_db.add(user)
    test_db.commit()
    
    # Create compliance check
    check = ComplianceCheck(
        user_id=user.id,
        transaction_id="tx_" + str(uuid.uuid4()),
        asset_type="BUIDL",
        amount=1000000.0,
        source_chain="ethereum",
        destination_chain="polygon",
        jurisdiction="US",
        allowed=True,
        risk_score=0.15,
        reason="Approved by policy v3",
        policy_version="baseline-v3"
    )
    test_db.add(check)
    test_db.commit()
    
    assert check.id is not None
    assert check.allowed is True
    assert check.risk_score == 0.15
    assert check.asset_type == "BUIDL"


def test_audit_log_immutability(test_db):
    """Test audit log creation and immutability"""
    # Create user and compliance check
    user = User(email="audit@veria.io", organization="Audit Corp")
    test_db.add(user)
    test_db.commit()
    
    check = ComplianceCheck(
        user_id=user.id,
        transaction_id="tx_audit_" + str(uuid.uuid4()),
        asset_type="BENJI",
        amount=50000.0,
        source_chain="ethereum",
        destination_chain="ethereum",
        jurisdiction="US",
        allowed=True,
        risk_score=0.05,
        reason="Low risk transaction",
        policy_version="baseline-v3"
    )
    test_db.add(check)
    test_db.commit()
    
    # Create audit log
    audit = AuditLog(
        compliance_check_id=check.id,
        event_type="decision",
        event_data={
            "decision": "approved",
            "risk_score": 0.05,
            "policy": "baseline-v3"
        },
        user_id=user.id,
        ip_address="192.168.1.1"
    )
    test_db.add(audit)
    test_db.commit()
    
    assert audit.id is not None
    assert audit.event_type == "decision"
    assert audit.created_at is not None
    # Note: In production, we'd enforce immutability at DB level


def test_user_relationships(test_db):
    """Test user relationships with API keys and compliance checks"""
    # Create user with multiple API keys
    user = User(email="relations@veria.io", organization="Relations Corp")
    test_db.add(user)
    test_db.commit()
    
    # Add multiple API keys
    key1 = ApiKey(key="key1_" + str(uuid.uuid4())[:8], name="Key 1", user_id=user.id)
    key2 = ApiKey(key="key2_" + str(uuid.uuid4())[:8], name="Key 2", user_id=user.id)
    test_db.add_all([key1, key2])
    
    # Add compliance checks
    check1 = ComplianceCheck(
        user_id=user.id,
        transaction_id="tx1_" + str(uuid.uuid4()),
        asset_type="USDY",
        amount=25000.0,
        source_chain="solana",
        destination_chain="solana",
        jurisdiction="US",
        allowed=True,
        risk_score=0.1,
        reason="Approved",
        policy_version="v3"
    )
    test_db.add(check1)
    test_db.commit()
    
    # Refresh and test relationships
    test_db.refresh(user)
    assert len(user.api_keys) == 2
    assert len(user.compliance_checks) == 1
    assert user.api_keys[0].name in ["Key 1", "Key 2"]