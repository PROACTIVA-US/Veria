"""Database models for Veria RWA Distribution Middleware"""

from datetime import datetime
from typing import Optional
from sqlalchemy import String, Float, JSON, DateTime, Boolean, ForeignKey, Index, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
import uuid


class Base(DeclarativeBase):
    """Base class for all database models"""
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    organization: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(50), default="user")  # user, admin, compliance_officer
    kyc_status: Mapped[str] = mapped_column(String(50), default="pending")  # pending, verified, rejected
    jurisdiction: Mapped[str] = mapped_column(String(10), default="US")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), onupdate=func.now(), server_default=func.now())
    
    # Relationships
    api_keys: Mapped[list["ApiKey"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    compliance_checks: Mapped[list["ComplianceCheck"]] = relationship(back_populates="user")

    __table_args__ = (
        Index("idx_user_email", "email"),
        Index("idx_user_organization", "organization"),
    )


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    key: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    rate_limit: Mapped[int] = mapped_column(default=1000)  # requests per minute
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    last_used_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="api_keys")

    __table_args__ = (
        Index("idx_api_key", "key"),
        Index("idx_api_key_user", "user_id"),
    )


class ComplianceCheck(Base):
    __tablename__ = "compliance_checks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id"))
    transaction_id: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    asset_type: Mapped[str] = mapped_column(String(50))  # BUIDL, BENJI, USDY, etc.
    amount: Mapped[float] = mapped_column(Float)
    source_chain: Mapped[str] = mapped_column(String(50))  # ethereum, polygon, solana
    destination_chain: Mapped[str] = mapped_column(String(50))
    jurisdiction: Mapped[str] = mapped_column(String(10))
    
    # Decision fields
    allowed: Mapped[bool] = mapped_column(Boolean)
    risk_score: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(Text)
    policy_version: Mapped[str] = mapped_column(String(50))
    
    # Provider data
    kyc_provider: Mapped[Optional[str]] = mapped_column(String(50))  # chainalysis, quadrata, etc.
    kyc_result: Mapped[Optional[dict]] = mapped_column(JSON)
    
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="compliance_checks")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="compliance_check")

    __table_args__ = (
        Index("idx_compliance_user", "user_id"),
        Index("idx_compliance_transaction", "transaction_id"),
        Index("idx_compliance_created", "created_at"),
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    compliance_check_id: Mapped[Optional[str]] = mapped_column(ForeignKey("compliance_checks.id"))
    event_type: Mapped[str] = mapped_column(String(50))  # decision, override, review, alert
    event_data: Mapped[dict] = mapped_column(JSON)
    user_id: Mapped[Optional[str]] = mapped_column(String(36))
    ip_address: Mapped[Optional[str]] = mapped_column(String(45))
    user_agent: Mapped[Optional[str]] = mapped_column(Text)
    
    # Immutability - no updates allowed
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Blockchain anchoring (for future implementation)
    block_hash: Mapped[Optional[str]] = mapped_column(String(66))
    tx_hash: Mapped[Optional[str]] = mapped_column(String(66))
    
    # Relationships
    compliance_check: Mapped[Optional["ComplianceCheck"]] = relationship(back_populates="audit_logs")

    __table_args__ = (
        Index("idx_audit_compliance", "compliance_check_id"),
        Index("idx_audit_created", "created_at"),
        Index("idx_audit_event_type", "event_type"),
    )