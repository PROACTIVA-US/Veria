"""
Tests for database models
"""

import pytest
import uuid
from datetime import datetime, timedelta
from decimal import Decimal

from ..models import (
    Organization, User, Product, Transaction, 
    Holding, ComplianceRule, ComplianceVerification,
    AuditLog, Session, Notification
)


class TestOrganization:
    """Test Organization model"""
    
    def test_create_organization(self, db_session):
        """Test creating an organization"""
        org = Organization(
            name="Test Organization",
            legal_name="Test Organization Inc.",
            type="investor",
            jurisdiction="US",
            tax_id="12-3456789",
            kyb_status="pending"
        )
        db_session.add(org)
        db_session.commit()
        
        assert org.id is not None
        assert org.name == "Test Organization"
        assert org.type == "investor"
        assert org.kyb_status == "pending"
        assert org.created_at is not None
        assert org.updated_at is not None
    
    def test_organization_relationships(self, db_session, test_organization):
        """Test organization relationships"""
        # Add users to organization
        user1 = User(
            organization_id=test_organization.id,
            email="user1@test.com",
            role="admin"
        )
        user2 = User(
            organization_id=test_organization.id,
            email="user2@test.com",
            role="investor"
        )
        db_session.add_all([user1, user2])
        db_session.commit()
        
        # Test relationship
        assert len(test_organization.users) == 2
        assert user1 in test_organization.users
        assert user2 in test_organization.users


class TestUser:
    """Test User model"""
    
    def test_create_user(self, db_session, test_organization):
        """Test creating a user"""
        user = User(
            organization_id=test_organization.id,
            email="newuser@test.com",
            first_name="John",
            last_name="Doe",
            wallet_address="0x" + "b" * 40,
            role="investor",
            kyc_status="pending"
        )
        db_session.add(user)
        db_session.commit()
        
        assert user.id is not None
        assert user.email == "newuser@test.com"
        assert user.full_name == "John Doe"
        assert user.is_active is True
    
    def test_user_unique_constraints(self, db_session, test_organization):
        """Test unique constraints on User model"""
        user1 = User(
            organization_id=test_organization.id,
            email="unique@test.com",
            role="investor"
        )
        db_session.add(user1)
        db_session.commit()
        
        # Try to create user with same email
        user2 = User(
            organization_id=test_organization.id,
            email="unique@test.com",
            role="admin"
        )
        db_session.add(user2)
        
        with pytest.raises(Exception):  # IntegrityError in PostgreSQL
            db_session.commit()


class TestProduct:
    """Test Product model"""
    
    def test_create_product(self, db_session, test_organization):
        """Test creating a product"""
        product = Product(
            issuer_id=test_organization.id,
            token_address="0x" + "c" * 40,
            chain_id=1,  # Ethereum mainnet
            name="Test Treasury",
            symbol="TTSY",
            description="Test Treasury Token",
            asset_type="treasury",
            min_investment=Decimal("100.00"),
            total_supply=Decimal("1000000.00"),
            nav_per_token=Decimal("1.00"),
            apy=Decimal("4.50")
        )
        db_session.add(product)
        db_session.commit()
        
        assert product.id is not None
        assert product.name == "Test Treasury"
        assert product.is_active is True
        assert product.currency == "USD"
    
    def test_product_compliance_rules(self, db_session, test_product):
        """Test product compliance rules"""
        rule = ComplianceRule(
            name="US Investor Only",
            rule_type="jurisdiction",
            jurisdiction="US",
            product_id=test_product.id,
            conditions={"allowed_jurisdictions": ["US"]},
            is_active=True
        )
        db_session.add(rule)
        db_session.commit()
        
        assert len(test_product.compliance_rules_list) == 1
        assert test_product.compliance_rules_list[0].name == "US Investor Only"


class TestTransaction:
    """Test Transaction model"""
    
    def test_create_transaction(self, db_session, test_user, test_product):
        """Test creating a transaction"""
        tx = Transaction(
            transaction_hash="0x" + "d" * 64,
            chain_id=1,
            block_number=1000000,
            type="subscription",
            status="pending",
            from_user_id=test_user.id,
            product_id=test_product.id,
            amount=Decimal("5000.00"),
            token_amount=Decimal("5000.00"),
            price_per_token=Decimal("1.00")
        )
        db_session.add(tx)
        db_session.commit()
        
        assert tx.id is not None
        assert tx.status == "pending"
        assert tx.amount == Decimal("5000.00")
        assert tx.from_user == test_user
        assert tx.product == test_product
    
    def test_transaction_approval_workflow(self, db_session, test_transaction, test_user):
        """Test transaction approval workflow"""
        from ..models import TransactionApproval
        
        approval = TransactionApproval(
            transaction_id=test_transaction.id,
            approver_id=test_user.id,
            approval_type="compliance",
            status="approved",
            comments="Compliance check passed",
            approved_at=datetime.utcnow()
        )
        db_session.add(approval)
        db_session.commit()
        
        assert len(test_transaction.approvals) == 1
        assert test_transaction.approvals[0].status == "approved"


class TestHolding:
    """Test Holding model"""
    
    def test_create_holding(self, db_session, test_user, test_product):
        """Test creating a holding"""
        holding = Holding(
            user_id=test_user.id,
            product_id=test_product.id,
            balance=Decimal("1000.00"),
            locked_balance=Decimal("100.00"),
            average_cost_basis=Decimal("1.00")
        )
        db_session.add(holding)
        db_session.commit()
        
        assert holding.id is not None
        assert holding.balance == Decimal("1000.00")
        assert holding.available_balance == Decimal("900.00")
    
    def test_holding_unique_constraint(self, db_session, test_user, test_product):
        """Test unique constraint on user_id + product_id"""
        holding1 = Holding(
            user_id=test_user.id,
            product_id=test_product.id,
            balance=Decimal("1000.00")
        )
        db_session.add(holding1)
        db_session.commit()
        
        # Try to create duplicate holding
        holding2 = Holding(
            user_id=test_user.id,
            product_id=test_product.id,
            balance=Decimal("2000.00")
        )
        db_session.add(holding2)
        
        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()


class TestComplianceVerification:
    """Test Compliance Verification model"""
    
    def test_create_verification(self, db_session, test_user):
        """Test creating a compliance verification"""
        verification = ComplianceVerification(
            user_id=test_user.id,
            verification_type="identity",
            provider="Jumio",
            provider_reference="JUMIO-123456",
            status="passed",
            result={"score": 95, "checks": ["document", "liveness"]},
            verified_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=365)
        )
        db_session.add(verification)
        db_session.commit()
        
        assert verification.id is not None
        assert verification.status == "passed"
        assert verification.provider == "Jumio"


class TestAuditLog:
    """Test Audit Log model"""
    
    def test_create_audit_log(self, db_session, test_user):
        """Test creating an audit log entry"""
        audit = AuditLog(
            event_type="user.login",
            entity_type="user",
            entity_id=test_user.id,
            user_id=test_user.id,
            action="login",
            changes={"previous_login": None},
            metadata={"ip": "192.168.1.1"}
        )
        db_session.add(audit)
        db_session.commit()
        
        assert audit.id is not None
        assert audit.event_type == "user.login"
        assert audit.created_at is not None


class TestSession:
    """Test Session model"""
    
    def test_create_session(self, db_session, test_user):
        """Test creating a user session"""
        session = Session(
            user_id=test_user.id,
            token_hash="hash123456",
            refresh_token_hash="refresh123456",
            expires_at=datetime.utcnow() + timedelta(hours=1)
        )
        db_session.add(session)
        db_session.commit()
        
        assert session.id is not None
        assert session.is_valid is True
    
    def test_session_expiry(self, db_session, test_user):
        """Test session expiry"""
        session = Session(
            user_id=test_user.id,
            token_hash="expired123",
            expires_at=datetime.utcnow() - timedelta(hours=1)
        )
        db_session.add(session)
        db_session.commit()
        
        assert session.is_valid is False


class TestNotification:
    """Test Notification model"""
    
    def test_create_notification(self, db_session, test_user):
        """Test creating a notification"""
        notification = Notification(
            user_id=test_user.id,
            type="email",
            category="transaction",
            subject="Transaction Completed",
            content="Your transaction has been completed successfully.",
            status="pending"
        )
        db_session.add(notification)
        db_session.commit()
        
        assert notification.id is not None
        assert notification.status == "pending"
        assert notification.sent_at is None
