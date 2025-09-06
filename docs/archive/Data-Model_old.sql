-- Core tables (subset)
CREATE TABLE organizations (
  id UUID PRIMARY KEY, name TEXT NOT NULL, country_code TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE users (
  id UUID PRIMARY KEY, org_id UUID REFERENCES organizations(id), email CITEXT UNIQUE,
  passkey_id TEXT, rbac_role TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE wallets (
  id UUID PRIMARY KEY, user_id UUID REFERENCES users(id),
  address TEXT NOT NULL, chain TEXT NOT NULL, custody_type TEXT NOT NULL CHECK (custody_type IN ('self','qualified')),
  verified BOOLEAN DEFAULT false, created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE policies (
  id UUID PRIMARY KEY, name TEXT, version TEXT, fingerprint TEXT UNIQUE, body JSONB,
  created_by UUID REFERENCES users(id), created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE products (
  id UUID PRIMARY KEY, issuer_org_id UUID REFERENCES organizations(id), name TEXT, symbol TEXT,
  policy_id UUID REFERENCES policies(id), venue_adapter TEXT, rwa_adapter TEXT,
  status TEXT CHECK (status IN ('draft','active','paused')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE decisions (
  id UUID PRIMARY KEY, subject_type TEXT, subject_id UUID, policy_fingerprint TEXT,
  input JSONB, outcome TEXT CHECK (outcome IN ('allow','deny','review')),
  evidence_cid TEXT, chain_anchor_tx TEXT, created_at TIMESTAMPTZ DEFAULT now()
);
