-- Compliance Rules Table
DROP TABLE IF EXISTS compliance_rules CASCADE;
CREATE TABLE compliance_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('kyc', 'aml', 'sanctions', 'transaction', 'jurisdiction', 'accreditation')),
    priority INTEGER DEFAULT 0,
    enabled BOOLEAN DEFAULT true,
    conditions JSONB NOT NULL DEFAULT '[]',
    actions JSONB NOT NULL DEFAULT '[]',
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_rules_type ON compliance_rules(type);
CREATE INDEX idx_compliance_rules_enabled ON compliance_rules(enabled);
CREATE INDEX idx_compliance_rules_priority ON compliance_rules(priority DESC);

-- Compliance Rule Evaluations Log
CREATE TABLE IF NOT EXISTS compliance_rule_evaluations (
    id SERIAL PRIMARY KEY,
    rule_id VARCHAR(255) NOT NULL,
    rule_name VARCHAR(255),
    passed BOOLEAN NOT NULL,
    context JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rule_evaluations_rule_id ON compliance_rule_evaluations(rule_id);
CREATE INDEX idx_rule_evaluations_created_at ON compliance_rule_evaluations(created_at DESC);

-- Sanctions Lists Table
CREATE TABLE IF NOT EXISTS sanctions_lists (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('OFAC', 'UN', 'EU', 'UK', 'CUSTOM')),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sanctions_lists_source ON sanctions_lists(source);
CREATE INDEX idx_sanctions_lists_active ON sanctions_lists(active);

-- Sanctions Entries Table
CREATE TABLE IF NOT EXISTS sanctions_entries (
    id VARCHAR(255) PRIMARY KEY,
    list_id VARCHAR(255) NOT NULL REFERENCES sanctions_lists(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('individual', 'entity', 'vessel', 'aircraft')),
    names JSONB NOT NULL DEFAULT '[]',
    aliases JSONB DEFAULT '[]',
    identifiers JSONB DEFAULT '[]',
    addresses JSONB DEFAULT '[]',
    date_of_birth VARCHAR(50),
    place_of_birth VARCHAR(255),
    nationality JSONB DEFAULT '[]',
    programs JSONB DEFAULT '[]',
    remarks TEXT,
    risk_score INTEGER DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_sanctions_entries_list_id ON sanctions_entries(list_id);
CREATE INDEX idx_sanctions_entries_type ON sanctions_entries(type);
CREATE INDEX idx_sanctions_entries_names_gin ON sanctions_entries USING gin(names);

-- Sanctions Screening Log
CREATE TABLE IF NOT EXISTS sanctions_screening_log (
    id SERIAL PRIMARY KEY,
    request_id VARCHAR(255) NOT NULL,
    request_data JSONB NOT NULL,
    result_status VARCHAR(50) NOT NULL,
    matches_count INTEGER DEFAULT 0,
    screening_time_ms INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_screening_log_request_id ON sanctions_screening_log(request_id);
CREATE INDEX idx_screening_log_status ON sanctions_screening_log(result_status);
CREATE INDEX idx_screening_log_created_at ON sanctions_screening_log(created_at DESC);

-- Monitoring Rules Table
CREATE TABLE IF NOT EXISTS monitoring_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL CHECK (type IN ('velocity', 'amount', 'pattern', 'behavior', 'aggregate')),
    enabled BOOLEAN DEFAULT true,
    parameters JSONB NOT NULL DEFAULT '{}',
    risk_weight DECIMAL(3,2) DEFAULT 1.0,
    actions JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_rules_type ON monitoring_rules(type);
CREATE INDEX idx_monitoring_rules_enabled ON monitoring_rules(enabled);

-- Monitoring Alerts Table
CREATE TABLE IF NOT EXISTS monitoring_alerts (
    id VARCHAR(255) PRIMARY KEY,
    rule_id VARCHAR(255) NOT NULL,
    rule_name VARCHAR(255),
    transaction_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    type VARCHAR(50) NOT NULL,
    description TEXT,
    risk_score DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'false_positive')),
    metadata JSONB,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_alerts_user_id ON monitoring_alerts(user_id);
CREATE INDEX idx_monitoring_alerts_transaction_id ON monitoring_alerts(transaction_id);
CREATE INDEX idx_monitoring_alerts_severity ON monitoring_alerts(severity);
CREATE INDEX idx_monitoring_alerts_status ON monitoring_alerts(status);
CREATE INDEX idx_monitoring_alerts_created_at ON monitoring_alerts(created_at DESC);

-- User Profiles Table for Transaction Monitoring
CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(255) PRIMARY KEY,
    average_transaction_amount DECIMAL(20,2),
    typical_transaction_frequency DECIMAL(10,2),
    common_counterparties JSONB DEFAULT '[]',
    risk_profile VARCHAR(20) CHECK (risk_profile IN ('low', 'medium', 'high')),
    historical_patterns JSONB DEFAULT '[]',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_user_profiles_risk ON user_profiles(risk_profile);

-- Transaction Monitoring Log
CREATE TABLE IF NOT EXISTS transaction_monitoring_log (
    id SERIAL PRIMARY KEY,
    transaction_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    risk_score DECIMAL(5,2),
    alerts_count INTEGER DEFAULT 0,
    processing_time INTEGER,
    blocked BOOLEAN DEFAULT false,
    requires_review BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_monitoring_log_transaction_id ON transaction_monitoring_log(transaction_id);
CREATE INDEX idx_monitoring_log_user_id ON transaction_monitoring_log(user_id);
CREATE INDEX idx_monitoring_log_created_at ON transaction_monitoring_log(created_at DESC);

-- Compliance Reports Table
CREATE TABLE IF NOT EXISTS compliance_reports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_reports_type ON compliance_reports(type);
CREATE INDEX idx_compliance_reports_created_at ON compliance_reports(created_at DESC);

-- Transactions Table
DROP TABLE IF EXISTS transactions CASCADE;
CREATE TABLE transactions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL,
    amount DECIMAL(20,2) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    from_account VARCHAR(255),
    to_account VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    risk_score DECIMAL(5,2),
    metadata JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_timestamp ON transactions(timestamp DESC);

-- Sample Compliance Rules
INSERT INTO compliance_rules (id, name, description, type, priority, conditions, actions) VALUES
    ('rule-kyc-required', 'KYC Verification Required', 'Ensures user has completed KYC', 'kyc', 100, 
     '[{"field": "user.kyc_status", "operator": "eq", "value": "verified"}]',
     '[{"type": "reject", "parameters": {"message": "KYC verification required"}}]'),
    
    ('rule-high-amount', 'High Transaction Amount', 'Flags transactions over $10,000', 'amount', 80,
     '[{"field": "transaction.amount", "operator": "gt", "value": 10000}]',
     '[{"type": "manual_review", "parameters": {"reason": "High value transaction"}}]'),
    
    ('rule-sanctions-check', 'Sanctions List Check', 'Requires sanctions screening', 'sanctions', 95,
     '[{"field": "user.sanctions_cleared", "operator": "eq", "value": true}]',
     '[{"type": "reject", "parameters": {"message": "Sanctions screening required"}}]'),
    
    ('rule-jurisdiction', 'Restricted Jurisdiction', 'Blocks restricted jurisdictions', 'jurisdiction', 90,
     '[{"field": "user.jurisdiction", "operator": "nin", "value": ["North Korea", "Iran", "Syria"]}]',
     '[{"type": "reject", "parameters": {"message": "Restricted jurisdiction"}}]')
ON CONFLICT (id) DO NOTHING;

-- Sample Monitoring Rules
INSERT INTO monitoring_rules (id, name, description, type, parameters, risk_weight, actions) VALUES
    ('monitor-velocity', 'High Velocity Detection', 'Detects rapid transaction velocity', 'velocity',
     '{"timeWindow": 3600, "maxTransactions": 10, "maxAmount": 50000}', 1.5,
     '[{"type": "alert", "threshold": 50}, {"type": "block", "threshold": 80}]'),
    
    ('monitor-amount-deviation', 'Unusual Amount Detection', 'Detects unusual transaction amounts', 'amount',
     '{"deviationThreshold": 3, "maxAmount": 100000}', 1.2,
     '[{"type": "review", "threshold": 40}]'),
    
    ('monitor-structuring', 'Structuring Detection', 'Detects potential structuring patterns', 'pattern',
     '{"patterns": [{"type": "structuring", "amount_threshold": 10000, "time_window": 86400, "min_transactions": 3}]}', 2.0,
     '[{"type": "alert", "threshold": 60}, {"type": "report", "threshold": 70}]')
ON CONFLICT (id) DO NOTHING;