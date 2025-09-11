#!/usr/bin/env node
import pg from 'pg';
const { Client } = pg;

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'veria',
  password: 'veria123',
  database: 'veria'
});

const createTables = async () => {
  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        name VARCHAR(255),
        kyc_status VARCHAR(50) DEFAULT 'pending',
        kyc_verified_at TIMESTAMP,
        kyc_level VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created users table');

    // Create policies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policies (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        version VARCHAR(50) DEFAULT '1.0',
        rules JSONB DEFAULT '{}',
        status VARCHAR(50) DEFAULT 'draft',
        created_by UUID,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created policies table');

    // Create policy_evaluations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS policy_evaluations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        policy_id UUID REFERENCES policies(id),
        user_id UUID,
        decision VARCHAR(50),
        reasons JSONB,
        context JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created policy_evaluations table');

    // Create compliance_checks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_checks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        transaction_id VARCHAR(255),
        user_id VARCHAR(255),
        check_type VARCHAR(50),
        status VARCHAR(50),
        result JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created compliance_checks table');

    // Create audit_logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_type VARCHAR(100),
        service_name VARCHAR(100),
        user_id UUID,
        resource_id VARCHAR(255),
        action VARCHAR(100),
        details JSONB,
        ip_address VARCHAR(45),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created audit_logs table');

    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_transaction ON compliance_checks(transaction_id);
      CREATE INDEX IF NOT EXISTS idx_compliance_checks_user ON compliance_checks(user_id);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
    `);
    console.log('✅ Created indexes');

    console.log('🎉 Database initialization complete!');
  } catch (err) {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
};

createTables();