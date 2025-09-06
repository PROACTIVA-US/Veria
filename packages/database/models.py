"""
Database models for Veria platform
Implements SQLAlchemy ORM models matching the PostgreSQL schema
"""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional, List
from enum import Enum as PyEnum

from sqlalchemy import (
    Column, String, Integer, Boolean, DateTime, Date, 
    DECIMAL, UUID, ForeignKey, JSON, Text, INET, 
    UniqueConstraint, CheckConstraint, Index, BigInteger
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship, backref
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

Base = declarative_base()


# =========================================
# ENUMS
# =========================================

class OrganizationType(PyEnum):
    ISSUER = "issuer"
    DISTRIBUTOR = "distributor"
    INVESTOR = "investor"
    SERVICE_PROVIDER = "service_provider"


class KYBStatus(PyEnum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class KYCStatus(PyEnum):
    PENDING = "pending"
    IN_REVIEW = "in_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"


class UserRole(PyEnum):
    ADMIN = "admin"
    COMPLIANCE_OFFICER = "compliance_officer"
    INVESTOR = "investor"
    OPERATOR = "operator"
    VIEWER = "viewer"


class AccreditationStatus(PyEnum):
    VERIFIED = "verified"
    PENDING = "pending"
    EXPIRED = "expired"
    NOT_REQUIRED = "not_required"


class AssetType(PyEnum):
    TREASURY = "treasury"
    MMF = "mmf"
    BOND = "bond"
    REIT = "reit"
    COMMODITY = "commodity"
    OTHER = "other"


class TransactionType(PyEnum):
    SUBSCRIPTION = "subscription"
    REDEMPTION = "redemption"
    TRANSFER = "transfer"
    DIVIDEND = "dividend"
    FEE = "fee"


class TransactionStatus(PyEnum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# =========================================
# MODELS
# =========================================

class Organization(Base):
    """Organizations participating in the platform"""
    __tablename__ = 'organizations'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    legal_name = Column(String(255))
    type = Column(String(50), nullable=False)
    jurisdiction = Column(String(100))
    tax_id = Column(String(100))
    kyb_status = Column(String(50), default='pending')
    kyb_completed_at = Column(DateTime)
    kyb_expires_at = Column(DateTime)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    products = relationship("Product", back_populates="issuer")
    
    def __repr__(self):
        return f"<Organization(name='{self.name}', type='{self.type}')>"


class User(Base):
    """Individual users within organizations"""
    __tablename__ = 'users'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    organization_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id', ondelete='CASCADE'))
    email = Column(String(255), unique=True, nullable=False)
    email_verified = Column(Boolean, default=False)
    phone = Column(String(50))
    phone_verified = Column(Boolean, default=False)
    first_name = Column(String(100))
    last_name = Column(String(100))
    wallet_address = Column(String(42), unique=True)
    role = Column(String(50), nullable=False)
    kyc_status = Column(String(50), default='pending')
    kyc_completed_at = Column(DateTime)
    kyc_expires_at = Column(DateTime)
    accreditation_status = Column(String(50))
    accreditation_expires_at = Column(DateTime)
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    organization = relationship("Organization", back_populates="users")
    compliance_verifications = relationship("ComplianceVerification", back_populates="user")
    from_transactions = relationship("Transaction", foreign_keys="Transaction.from_user_id", back_populates="from_user")
    to_transactions = relationship("Transaction", foreign_keys="Transaction.to_user_id", back_populates="to_user")
    holdings = relationship("Holding", back_populates="user")
    sessions = relationship("Session", back_populates="user")
    notifications = relationship("Notification", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")
    
    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}".strip()
    
    def __repr__(self):
        return f"<User(email='{self.email}', role='{self.role}')>"


class Product(Base):
    """Tokenized products (treasuries, MMFs, etc.)"""
    __tablename__ = 'products'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    issuer_id = Column(UUID(as_uuid=True), ForeignKey('organizations.id'))
    token_address = Column(String(42), unique=True)
    chain_id = Column(Integer, nullable=False)
    name = Column(String(255), nullable=False)
    symbol = Column(String(10), nullable=False)
    description = Column(Text)
    asset_type = Column(String(50), nullable=False)
    currency = Column(String(10), default='USD')
    min_investment = Column(DECIMAL(20, 2))
    max_investment = Column(DECIMAL(20, 2))
    total_supply = Column(DECIMAL(20, 8))
    available_supply = Column(DECIMAL(20, 8))
    nav_per_token = Column(DECIMAL(20, 8))
    apy = Column(DECIMAL(10, 4))
    maturity_date = Column(Date)
    is_active = Column(Boolean, default=True)
    compliance_rules = Column(JSONB, default={})
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    issuer = relationship("Organization", back_populates="products")
    documents = relationship("ProductDocument", back_populates="product")
    compliance_rules_list = relationship("ComplianceRule", back_populates="product")
    transactions = relationship("Transaction", back_populates="product")
    holdings = relationship("Holding", back_populates="product")
    
    def __repr__(self):
        return f"<Product(name='{self.name}', symbol='{self.symbol}')>"


class ProductDocument(Base):
    """Product documents and disclosures"""
    __tablename__ = 'product_documents'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'))
    document_type = Column(String(50), nullable=False)
    title = Column(String(255), nullable=False)
    file_url = Column(Text, nullable=False)
    file_hash = Column(String(64))
    version = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="documents")
    
    def __repr__(self):
        return f"<ProductDocument(title='{self.title}', type='{self.document_type}')>"


class ComplianceRule(Base):
    """Compliance rules and requirements"""
    __tablename__ = 'compliance_rules'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    rule_type = Column(String(50), nullable=False)
    jurisdiction = Column(String(100))
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'))
    conditions = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    product = relationship("Product", back_populates="compliance_rules_list")
    
    def __repr__(self):
        return f"<ComplianceRule(name='{self.name}', type='{self.rule_type}')>"


class ComplianceVerification(Base):
    """User compliance verifications"""
    __tablename__ = 'compliance_verifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    verification_type = Column(String(50), nullable=False)
    provider = Column(String(100))
    provider_reference = Column(String(255))
    status = Column(String(50), nullable=False)
    result = Column(JSONB)
    verified_at = Column(DateTime)
    expires_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="compliance_verifications")
    
    def __repr__(self):
        return f"<ComplianceVerification(type='{self.verification_type}', status='{self.status}')>"


class Transaction(Base):
    """Transaction records"""
    __tablename__ = 'transactions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_hash = Column(String(66), unique=True)
    chain_id = Column(Integer)
    block_number = Column(BigInteger)
    type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    from_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    to_user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id'))
    amount = Column(DECIMAL(20, 8), nullable=False)
    token_amount = Column(DECIMAL(20, 8))
    price_per_token = Column(DECIMAL(20, 8))
    fee_amount = Column(DECIMAL(20, 8))
    gas_fee = Column(DECIMAL(20, 8))
    metadata = Column(JSONB, default={})
    initiated_at = Column(DateTime, server_default=func.now())
    confirmed_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    from_user = relationship("User", foreign_keys=[from_user_id], back_populates="from_transactions")
    to_user = relationship("User", foreign_keys=[to_user_id], back_populates="to_transactions")
    product = relationship("Product", back_populates="transactions")
    approvals = relationship("TransactionApproval", back_populates="transaction")
    
    def __repr__(self):
        return f"<Transaction(type='{self.type}', status='{self.status}', amount={self.amount})>"


class TransactionApproval(Base):
    """Transaction approval workflow"""
    __tablename__ = 'transaction_approvals'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    transaction_id = Column(UUID(as_uuid=True), ForeignKey('transactions.id', ondelete='CASCADE'))
    approver_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    approval_type = Column(String(50), nullable=False)
    status = Column(String(50), nullable=False)
    comments = Column(Text)
    approved_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    transaction = relationship("Transaction", back_populates="approvals")
    approver = relationship("User")
    
    def __repr__(self):
        return f"<TransactionApproval(type='{self.approval_type}', status='{self.status}')>"


class Holding(Base):
    """User token holdings"""
    __tablename__ = 'holdings'
    __table_args__ = (
        UniqueConstraint('user_id', 'product_id'),
    )
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    product_id = Column(UUID(as_uuid=True), ForeignKey('products.id', ondelete='CASCADE'))
    balance = Column(DECIMAL(20, 8), nullable=False, default=0)
    locked_balance = Column(DECIMAL(20, 8), default=0)
    average_cost_basis = Column(DECIMAL(20, 8))
    first_purchase_date = Column(DateTime)
    last_activity_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="holdings")
    product = relationship("Product", back_populates="holdings")
    
    @property
    def available_balance(self):
        return self.balance - (self.locked_balance or 0)
    
    def __repr__(self):
        return f"<Holding(user_id='{self.user_id}', product='{self.product_id}', balance={self.balance})>"


class AuditLog(Base):
    """Immutable audit log"""
    __tablename__ = 'audit_logs'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    event_type = Column(String(100), nullable=False)
    entity_type = Column(String(50))
    entity_id = Column(UUID(as_uuid=True))
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id'))
    ip_address = Column(INET)
    user_agent = Column(Text)
    action = Column(String(50), nullable=False)
    changes = Column(JSONB)
    metadata = Column(JSONB, default={})
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="audit_logs")
    
    def __repr__(self):
        return f"<AuditLog(event='{self.event_type}', action='{self.action}')>"


class Session(Base):
    """User sessions"""
    __tablename__ = 'sessions'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    token_hash = Column(String(64), unique=True, nullable=False)
    refresh_token_hash = Column(String(64), unique=True)
    ip_address = Column(INET)
    user_agent = Column(Text)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="sessions")
    
    @property
    def is_valid(self):
        return (
            self.revoked_at is None and 
            self.expires_at > datetime.utcnow()
        )
    
    def __repr__(self):
        return f"<Session(user_id='{self.user_id}', valid={self.is_valid})>"


class Notification(Base):
    """Notification queue"""
    __tablename__ = 'notifications'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='CASCADE'))
    type = Column(String(50), nullable=False)
    category = Column(String(50), nullable=False)
    subject = Column(String(255))
    content = Column(Text)
    status = Column(String(50), default='pending')
    metadata = Column(JSONB, default={})
    sent_at = Column(DateTime)
    read_at = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    
    # Relationships
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(type='{self.type}', status='{self.status}')>"


# =========================================
# INDEXES (defined at model level)
# =========================================

Index('idx_organizations_type', Organization.type)
Index('idx_organizations_kyb_status', Organization.kyb_status)
Index('idx_users_email', User.email)
Index('idx_users_wallet_address', User.wallet_address)
Index('idx_products_token_address', Product.token_address)
Index('idx_transactions_hash', Transaction.transaction_hash)
Index('idx_holdings_user_product', Holding.user_id, Holding.product_id)
Index('idx_audit_logs_entity', AuditLog.entity_type, AuditLog.entity_id)
