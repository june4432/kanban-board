-- ==========================================
-- Users and Organizations Schema
-- Multi-tenant user and organization management
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. Users Table
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,  -- bcrypt hashed
  avatar TEXT,
  role VARCHAR(20) CHECK(role IN ('admin', 'user')) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Application users with authentication credentials';
COMMENT ON COLUMN users.password IS 'bcrypt hashed password';
COMMENT ON COLUMN users.role IS 'System role: admin or user';

-- ==========================================
-- 2. Organizations Table (Multi-tenancy)
-- ==========================================
CREATE TABLE IF NOT EXISTS organizations (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  plan VARCHAR(50) NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'pro', 'enterprise')),
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_plan ON organizations(plan);

COMMENT ON TABLE organizations IS 'Multi-tenant organizations for workspace isolation';
COMMENT ON COLUMN organizations.slug IS 'URL-safe unique identifier';
COMMENT ON COLUMN organizations.plan IS 'Subscription plan: free, pro, or enterprise';
COMMENT ON COLUMN organizations.settings IS 'JSON configuration for organization preferences';

-- ==========================================
-- 3. Organization Members (with Roles)
-- ==========================================
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK(role IN ('owner', 'admin', 'editor', 'viewer', 'member')),
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

COMMENT ON TABLE organization_members IS 'Organization membership with role-based access control';
COMMENT ON COLUMN organization_members.role IS 'Member role: owner (creator), admin (manage), editor (edit), viewer (read-only), member (default)';

-- ==========================================
-- 4. Organization Join Requests
-- ==========================================
CREATE TABLE IF NOT EXISTS organization_join_requests (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_join_requests_org ON organization_join_requests(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_user ON organization_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_org_join_requests_status ON organization_join_requests(status);

COMMENT ON TABLE organization_join_requests IS 'User requests to join organizations requiring approval';
COMMENT ON COLUMN organization_join_requests.status IS 'Request status: pending (awaiting approval), approved (accepted), rejected (denied)';
COMMENT ON COLUMN organization_join_requests.message IS 'Optional message from user requesting to join';

-- ==========================================
-- Triggers
-- ==========================================

-- Auto-update updated_at timestamp for organizations
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
