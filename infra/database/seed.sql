-- Veria Platform Seed Data
-- Sprint 0: Test Data for Development

-- Insert test organizations
INSERT INTO organizations (id, name, type, status) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Veria Test Corp', 'enterprise', 'active'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Demo Investment Fund', 'fund', 'active'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Sample DAO', 'dao', 'active');

-- Insert test users
INSERT INTO users (id, email, username, password_hash, organization_id, first_name, last_name, status, kyc_status, accredited_investor, jurisdiction) VALUES
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'admin@veria.test', 'admin', '$2b$10$YKVBQDsK3XQJPz3Q4Zd5OeG3Q5JQ5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Admin', 'User', 'active', 'verified', true, 'United States'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'investor@veria.test', 'investor1', '$2b$10$YKVBQDsK3XQJPz3Q4Zd5OeG3Q5JQ5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'John', 'Investor', 'active', 'verified', true, 'United States'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'compliance@veria.test', 'compliance1', '$2b$10$YKVBQDsK3XQJPz3Q4Zd5OeG3Q5JQ5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Sarah', 'Compliance', 'active', 'verified', false, 'United States'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'pending@veria.test', 'pending1', '$2b$10$YKVBQDsK3XQJPz3Q4Zd5OeG3Q5JQ5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5', null, 'Pending', 'User', 'pending', 'pending', false, 'Canada'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'viewer@veria.test', 'viewer1', '$2b$10$YKVBQDsK3XQJPz3Q4Zd5OeG3Q5JQ5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5Z3Q5', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'View', 'Only', 'active', 'verified', false, 'United Kingdom');

-- Assign roles to users
INSERT INTO user_roles (user_id, role_id, granted_by) 
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', id, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' FROM roles WHERE name = 'super_admin';

INSERT INTO user_roles (user_id, role_id, granted_by) 
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', id, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' FROM roles WHERE name = 'investor';

INSERT INTO user_roles (user_id, role_id, granted_by) 
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', id, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' FROM roles WHERE name = 'compliance_officer';

INSERT INTO user_roles (user_id, role_id, granted_by) 
SELECT 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', id, 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11' FROM roles WHERE name = 'viewer';

-- Insert test products
INSERT INTO products (id, name, type, issuer, ticker, status, chain, min_investment, max_investment) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Treasury Yield Fund', 'tokenized_fund', 'Veria Finance', 'TYF', 'active', 'polygon', 1000, 1000000),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'Real Estate Token', 'rwa_token', 'Property Holdings Inc', 'RET', 'active', 'ethereum', 5000, 500000),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'Carbon Credits', 'environmental', 'Green Assets Ltd', 'CCT', 'active', 'polygon', 100, 100000),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', 'Gold Backed Token', 'commodity', 'Precious Metals Trust', 'GBT', 'pending', 'polygon', 500, 250000);

-- Insert test policies
INSERT INTO policies (id, name, description, version, status, rules, created_by, organization_id) VALUES
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 
   'Standard KYC Policy', 
   'Basic KYC requirements for all users', 
   '1.0.0', 
   'active',
   '{"kyc_required": true, "min_age": 18, "allowed_jurisdictions": ["United States", "Canada", "United Kingdom"], "document_requirements": ["government_id", "proof_of_address"]}',
   'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 
   'Accredited Investor Policy', 
   'Requirements for accredited investor verification', 
   '1.0.0', 
   'active',
   '{"accreditation_required": true, "min_investment": 10000, "max_investment": 5000000, "income_verification": true, "net_worth_verification": true}',
   'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  
  ('d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 
   'Anti-Money Laundering Policy', 
   'AML screening and transaction monitoring', 
   '2.0.0', 
   'active',
   '{"aml_screening": true, "sanctions_check": true, "pep_check": true, "transaction_monitoring": true, "suspicious_activity_threshold": 10000}',
   'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13',
   'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');

-- Insert test transactions
INSERT INTO transactions (id, user_id, product_id, type, status, amount, price, total_value, chain) VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'buy', 'completed', 100, 10.50, 1050.00, 'polygon'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'buy', 'pending', 50, 100.00, 5000.00, 'ethereum'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', 'buy', 'failed', 1000, 1.00, 1000.00, 'polygon');

-- Insert compliance checks
INSERT INTO compliance_checks (transaction_id, user_id, check_type, status, result) VALUES
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'kyc', 'passed', '{"verified": true, "level": "standard"}'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'aml', 'passed', '{"risk_score": 25, "risk_level": "low"}'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'sanctions', 'passed', '{"lists_checked": ["OFAC", "UN", "EU"], "match_found": false}'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'kyc', 'passed', '{"verified": true, "level": "standard"}'),
  ('e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'accreditation', 'manual_review', '{"status": "pending_verification"}');

-- Insert audit logs
INSERT INTO audit_logs (event_type, service_name, user_id, action, details) VALUES
  ('user_login', 'identity-service', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'login', '{"ip": "192.168.1.1", "method": "password"}'),
  ('policy_created', 'policy-service', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'create', '{"policy_id": "d0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11"}'),
  ('transaction_initiated', 'gateway', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'create', '{"transaction_id": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "amount": 1050}'),
  ('compliance_check', 'compliance-service', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'evaluate', '{"transaction_id": "e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", "result": "passed"}'),
  ('user_kyc_updated', 'identity-service', 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', 'update', '{"kyc_status": "verified", "kyc_level": "standard"}');

-- Output summary
SELECT 'Database seeded successfully!' as message;
SELECT 'Organizations:' as entity, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Users:', COUNT(*) FROM users
UNION ALL
SELECT 'Products:', COUNT(*) FROM products
UNION ALL
SELECT 'Policies:', COUNT(*) FROM policies
UNION ALL
SELECT 'Transactions:', COUNT(*) FROM transactions
UNION ALL
SELECT 'Compliance Checks:', COUNT(*) FROM compliance_checks
UNION ALL
SELECT 'Audit Logs:', COUNT(*) FROM audit_logs;