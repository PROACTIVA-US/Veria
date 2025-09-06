-- Veria Platform Database Schema
-- Version: 1.0.0
-- Date: September 6, 2025
-- Description: Core database schema for tokenized RWA distribution platform

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================
-- ORGANIZATIONS & USERS
-- =========================================

-- Organizations (Issuers, Distributors, Investors)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    type VARCHAR(50) NOT NULL CHECK (type IN ('issuer', 'distributor', 'investor', 'service_provider')),
    jurisdiction VARCHAR(100),
    tax_id VARCHAR(100),
    kyb_status VARCHAR(50) DEFAULT 'pending' CHECK (kyb_status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
    kyb_completed_at TIMESTAMP,
    kyb_expires_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users within organizations
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    phone VARCHAR(50),
    phone_verified BOOLEAN DEFAULT FALSE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    wallet_address VARCHAR(42) UNIQUE,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'compliance_officer', 'investor', 'operator', 'viewer')),
    kyc_status VARCHAR(50) DEFAULT 'pending' CHECK (kyc_status IN ('pending', 'in_review', 'approved', 'rejected', 'expired')),
    kyc_completed_at TIMESTAMP,
    kyc_expires_at TIMESTAMP,
    accreditation_status VARCHAR(50) CHECK (accreditation_status IN ('verified', 'pending', 'expired', 'not_required')),
    accreditation_expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    last_login_at TIMESTAMP,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- PRODUCTS & ASSETS
-- =========================================

-- Tokenized products (treasuries, MMFs, etc.)
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issuer_id UUID REFERENCES organizations(id),
    token_address VARCHAR(42) UNIQUE,
    chain_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    symbol VARCHAR(10) NOT NULL,
    description TEXT,
    asset_type VARCHAR(50) NOT NULL CHECK (asset_type IN ('treasury', 'mmf', 'bond', 'reit', 'commodity', 'other')),
    currency VARCHAR(10) DEFAULT 'USD',
    min_investment DECIMAL(20, 2),
    max_investment DECIMAL(20, 2),
    total_supply DECIMAL(20, 8),
    available_supply DECIMAL(20, 8),
    nav_per_token DECIMAL(20, 8),
    apy DECIMAL(10, 4),
    maturity_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    compliance_rules JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Product documents and disclosures
CREATE TABLE product_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('prospectus', 'term_sheet', 'financial_report', 'legal_opinion', 'other')),
    title VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_hash VARCHAR(64),
    version VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- COMPLIANCE & RULES
-- =========================================

-- Compliance rules and requirements
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('kyc', 'kyb', 'accreditation', 'jurisdiction', 'sanction', 'transfer', 'holding')),
    jurisdiction VARCHAR(100),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    conditions JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User compliance verifications
CREATE TABLE compliance_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    verification_type VARCHAR(50) NOT NULL CHECK (verification_type IN ('identity', 'address', 'accreditation', 'source_of_funds', 'sanctions')),
    provider VARCHAR(100),
    provider_reference VARCHAR(255),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'passed', 'failed', 'expired')),
    result JSONB,
    verified_at TIMESTAMP,
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- TRANSACTIONS
-- =========================================

-- Transaction records
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash VARCHAR(66) UNIQUE,
    chain_id INTEGER,
    block_number BIGINT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('subscription', 'redemption', 'transfer', 'dividend', 'fee')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    from_user_id UUID REFERENCES users(id),
    to_user_id UUID REFERENCES users(id),
    product_id UUID REFERENCES products(id),
    amount DECIMAL(20, 8) NOT NULL,
    token_amount DECIMAL(20, 8),
    price_per_token DECIMAL(20, 8),
    fee_amount DECIMAL(20, 8),
    gas_fee DECIMAL(20, 8),
    metadata JSONB DEFAULT '{}',
    initiated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction approval workflow
CREATE TABLE transaction_approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    approver_id UUID REFERENCES users(id),
    approval_type VARCHAR(50) NOT NULL CHECK (approval_type IN ('compliance', 'risk', 'operations', 'final')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    comments TEXT,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- HOLDINGS & BALANCES
-- =========================================

-- User token holdings
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    balance DECIMAL(20, 8) NOT NULL DEFAULT 0,
    locked_balance DECIMAL(20, 8) DEFAULT 0,
    average_cost_basis DECIMAL(20, 8),
    first_purchase_date TIMESTAMP,
    last_activity_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, product_id)
);

-- =========================================
-- AUDIT & LOGGING
-- =========================================

-- Immutable audit log
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    user_id UUID REFERENCES users(id),
    ip_address INET,
    user_agent TEXT,
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'approve', 'reject', 'login', 'logout')),
    changes JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- SESSIONS & AUTHENTICATION
-- =========================================

-- User sessions
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    refresh_token_hash VARCHAR(64) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- NOTIFICATIONS
-- =========================================

-- Notification queue
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('email', 'sms', 'push', 'in_app')),
    category VARCHAR(50) NOT NULL,
    subject VARCHAR(255),
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'read')),
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================================
-- INDEXES
-- =========================================

-- Organizations
CREATE INDEX idx_organizations_type ON organizations(type);
CREATE INDEX idx_organizations_kyb_status ON organizations(kyb_status);
CREATE INDEX idx_organizations_created_at ON organizations(created_at);

-- Users
CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_kyc_status ON users(kyc_status);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Products
CREATE INDEX idx_products_issuer_id ON products(issuer_id);
CREATE INDEX idx_products_token_address ON products(token_address);
CREATE INDEX idx_products_asset_type ON products(asset_type);
CREATE INDEX idx_products_is_active ON products(is_active);

-- Transactions
CREATE INDEX idx_transactions_hash ON transactions(transaction_hash);
CREATE INDEX idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX idx_transactions_product ON transactions(product_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created_at ON transactions(created_at);

-- Holdings
CREATE INDEX idx_holdings_user_id ON holdings(user_id);
CREATE INDEX idx_holdings_product_id ON holdings(product_id);
CREATE INDEX idx_holdings_balance ON holdings(balance);

-- Audit logs
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Sessions
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- Notifications
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- =========================================
-- TRIGGERS
-- =========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to tables with updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at BEFORE UPDATE ON holdings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================
-- COMMENTS
-- =========================================

COMMENT ON TABLE organizations IS 'Organizations participating in the platform (issuers, distributors, investors)';
COMMENT ON TABLE users IS 'Individual users within organizations';
COMMENT ON TABLE products IS 'Tokenized RWA products available on the platform';
COMMENT ON TABLE transactions IS 'All blockchain and fiat transactions';
COMMENT ON TABLE holdings IS 'Current token balances for users';
COMMENT ON TABLE audit_logs IS 'Immutable audit trail for compliance';
COMMENT ON TABLE compliance_rules IS 'Configurable compliance rules per product/jurisdiction';
COMMENT ON TABLE compliance_verifications IS 'KYC/KYB verification records';

-- =========================================
-- INITIAL DATA (Development Only)
-- =========================================

-- Insert test organization
INSERT INTO organizations (name, legal_name, type, jurisdiction, kyb_status)
VALUES ('Veria Test Issuer', 'Veria Financial LLC', 'issuer', 'US', 'approved');

-- Insert test user
INSERT INTO users (organization_id, email, first_name, last_name, role, kyc_status)
SELECT id, 'admin@veria.io', 'Admin', 'User', 'admin', 'approved'
FROM organizations WHERE name = 'Veria Test Issuer';

-- End of schema
