#!/usr/bin/env python3
"""
Initialize the Veria database with schema and seed data
"""

import os
import sys
import logging
from pathlib import Path
from datetime import datetime, timedelta
from decimal import Decimal

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))

from models import *
from connection import db_manager, get_db


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_database():
    """Create all database tables"""
    logger.info("Creating database tables...")
    try:
        db_manager.create_all_tables()
        logger.info("✅ Database tables created successfully")
    except Exception as e:
        logger.error(f"❌ Failed to create tables: {e}")
        raise


def seed_development_data():
    """Seed database with development data"""
    logger.info("Seeding development data...")
    
    with get_db() as db:
        try:
            # Create organizations
            issuer = Organization(
                name="Veria Treasury Issuer",
                legal_name="Veria Treasury Management LLC",
                type="issuer",
                jurisdiction="US",
                tax_id="98-7654321",
                kyb_status="approved",
                kyb_completed_at=datetime.utcnow(),
                kyb_expires_at=datetime.utcnow() + timedelta(days=365),
                metadata={"aum": "1000000000", "established": "2020"}
            )
            
            investor_org = Organization(
                name="Test Investor Fund",
                legal_name="Test Investor Fund LP",
                type="investor",
                jurisdiction="US",
                tax_id="12-3456789",
                kyb_status="approved",
                kyb_completed_at=datetime.utcnow(),
                kyb_expires_at=datetime.utcnow() + timedelta(days=365)
            )
            
            db.add_all([issuer, investor_org])
            db.flush()  # Get IDs without committing
            
            # Create users
            admin_user = User(
                organization_id=issuer.id,
                email="admin@veria.io",
                email_verified=True,
                first_name="Admin",
                last_name="User",
                wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1",
                role="admin",
                kyc_status="approved",
                kyc_completed_at=datetime.utcnow(),
                kyc_expires_at=datetime.utcnow() + timedelta(days=365),
                is_active=True
            )
            
            compliance_officer = User(
                organization_id=issuer.id,
                email="compliance@veria.io",
                email_verified=True,
                first_name="Compliance",
                last_name="Officer",
                wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb2",
                role="compliance_officer",
                kyc_status="approved",
                kyc_completed_at=datetime.utcnow(),
                kyc_expires_at=datetime.utcnow() + timedelta(days=365),
                is_active=True
            )
            
            investor_user = User(
                organization_id=investor_org.id,
                email="investor@testfund.com",
                email_verified=True,
                first_name="Test",
                last_name="Investor",
                wallet_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb3",
                role="investor",
                kyc_status="approved",
                kyc_completed_at=datetime.utcnow(),
                kyc_expires_at=datetime.utcnow() + timedelta(days=365),
                accreditation_status="verified",
                accreditation_expires_at=datetime.utcnow() + timedelta(days=365),
                is_active=True
            )
            
            db.add_all([admin_user, compliance_officer, investor_user])
            db.flush()
            
            # Create products
            treasury_product = Product(
                issuer_id=issuer.id,
                token_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb4",
                chain_id=80001,  # Mumbai testnet
                name="US Treasury Token",
                symbol="USTT",
                description="Tokenized US Treasury Bills with 5.25% APY",
                asset_type="treasury",
                currency="USD",
                min_investment=Decimal("1000.00"),
                max_investment=Decimal("10000000.00"),
                total_supply=Decimal("100000000.00"),
                available_supply=Decimal("50000000.00"),
                nav_per_token=Decimal("1.00"),
                apy=Decimal("5.25"),
                is_active=True,
                compliance_rules={
                    "min_kyc_level": "approved",
                    "allowed_jurisdictions": ["US"],
                    "require_accreditation": True
                }
            )
            
            mmf_product = Product(
                issuer_id=issuer.id,
                token_address="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5",
                chain_id=80001,
                name="Money Market Fund Token",
                symbol="MMFT",
                description="Tokenized Money Market Fund with daily liquidity",
                asset_type="mmf",
                currency="USD",
                min_investment=Decimal("100.00"),
                max_investment=Decimal("5000000.00"),
                total_supply=Decimal("50000000.00"),
                available_supply=Decimal("30000000.00"),
                nav_per_token=Decimal("1.00"),
                apy=Decimal("4.75"),
                is_active=True,
                compliance_rules={
                    "min_kyc_level": "approved",
                    "allowed_jurisdictions": ["US", "UK", "EU"]
                }
            )
            
            db.add_all([treasury_product, mmf_product])
            db.flush()
            
            # Create compliance rules
            kyc_rule = ComplianceRule(
                name="KYC Required",
                rule_type="kyc",
                product_id=treasury_product.id,
                conditions={"min_level": "approved", "max_age_days": 365},
                is_active=True
            )
            
            jurisdiction_rule = ComplianceRule(
                name="US Only",
                rule_type="jurisdiction",
                jurisdiction="US",
                product_id=treasury_product.id,
                conditions={"allowed": ["US"], "blocked": []},
                is_active=True
            )
            
            accreditation_rule = ComplianceRule(
                name="Accredited Investor",
                rule_type="accreditation",
                product_id=treasury_product.id,
                conditions={"required": True, "min_net_worth": 1000000},
                is_active=True
            )
            
            db.add_all([kyc_rule, jurisdiction_rule, accreditation_rule])
            db.flush()
            
            # Create sample transaction
            transaction = Transaction(
                transaction_hash="0x" + "a" * 64,
                chain_id=80001,
                block_number=35000000,
                type="subscription",
                status="completed",
                from_user_id=investor_user.id,
                product_id=treasury_product.id,
                amount=Decimal("10000.00"),
                token_amount=Decimal("10000.00"),
                price_per_token=Decimal("1.00"),
                fee_amount=Decimal("10.00"),
                gas_fee=Decimal("0.50"),
                initiated_at=datetime.utcnow() - timedelta(hours=1),
                confirmed_at=datetime.utcnow()
            )
            
            db.add(transaction)
            db.flush()
            
            # Create holding
            holding = Holding(
                user_id=investor_user.id,
                product_id=treasury_product.id,
                balance=Decimal("10000.00"),
                locked_balance=Decimal("0.00"),
                average_cost_basis=Decimal("1.00"),
                first_purchase_date=datetime.utcnow(),
                last_activity_date=datetime.utcnow()
            )
            
            db.add(holding)
            db.flush()
            
            # Create compliance verifications
            kyc_verification = ComplianceVerification(
                user_id=investor_user.id,
                verification_type="identity",
                provider="Jumio",
                provider_reference="JUMIO-" + str(investor_user.id)[:8],
                status="passed",
                result={
                    "document_check": "passed",
                    "liveness_check": "passed",
                    "score": 98
                },
                verified_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=365)
            )
            
            accreditation_verification = ComplianceVerification(
                user_id=investor_user.id,
                verification_type="accreditation",
                provider="ParallelMarkets",
                provider_reference="PM-" + str(investor_user.id)[:8],
                status="passed",
                result={
                    "accredited": True,
                    "net_worth": 2500000,
                    "annual_income": 350000
                },
                verified_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(days=365)
            )
            
            db.add_all([kyc_verification, accreditation_verification])
            db.flush()
            
            # Create audit log
            audit_log = AuditLog(
                event_type="user.kyc.approved",
                entity_type="user",
                entity_id=investor_user.id,
                user_id=compliance_officer.id,
                action="approve",
                changes={
                    "kyc_status": {
                        "from": "pending",
                        "to": "approved"
                    }
                },
                metadata={"reason": "All checks passed"}
            )
            
            db.add(audit_log)
            
            # Commit all changes
            db.commit()
            logger.info("✅ Development data seeded successfully")
            
            # Print summary
            logger.info("\n=== Database Summary ===")
            logger.info(f"Organizations: {db.query(Organization).count()}")
            logger.info(f"Users: {db.query(User).count()}")
            logger.info(f"Products: {db.query(Product).count()}")
            logger.info(f"Transactions: {db.query(Transaction).count()}")
            logger.info(f"Holdings: {db.query(Holding).count()}")
            logger.info(f"Compliance Rules: {db.query(ComplianceRule).count()}")
            logger.info(f"Compliance Verifications: {db.query(ComplianceVerification).count()}")
            logger.info(f"Audit Logs: {db.query(AuditLog).count()}")
            
        except Exception as e:
            db.rollback()
            logger.error(f"❌ Failed to seed data: {e}")
            raise


def main():
    """Main initialization function"""
    logger.info("🚀 Initializing Veria Database...")
    
    # Check database connection
    if not db_manager.health_check():
        logger.error("❌ Cannot connect to database. Please check your DATABASE_URL and ensure PostgreSQL is running.")
        logger.info("Expected format: postgresql://user:password@localhost:5432/database")
        sys.exit(1)
    
    logger.info("✅ Database connection successful")
    
    # Create tables
    create_database()
    
    # Seed data (only in development)
    environment = os.getenv('ENVIRONMENT', 'development')
    if environment == 'development':
        seed_development_data()
    else:
        logger.info(f"Skipping seed data for {environment} environment")
    
    logger.info("\n🎉 Database initialization complete!")
    logger.info("\nTest credentials:")
    logger.info("  Admin: admin@veria.io")
    logger.info("  Compliance: compliance@veria.io")
    logger.info("  Investor: investor@testfund.com")


if __name__ == "__main__":
    main()
