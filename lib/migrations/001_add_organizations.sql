-- Migration: Add Organizations for Multi-tenancy
-- Version: 001
-- Date: 2025-11-12

-- ============================================================================
-- Organizations Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  plan TEXT NOT NULL DEFAULT 'free', -- free, pro, enterprise
  settings TEXT DEFAULT '{}', -- JSON string for flexible settings
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_plan ON organizations(plan);

-- ============================================================================
-- Organization Members (with Roles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_members (
  organization_id TEXT NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, editor, viewer, member
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);
CREATE INDEX idx_org_members_role ON organization_members(organization_id, role);

-- ============================================================================
-- Add organization_id to Projects
-- ============================================================================

-- Add new column (nullable for now to allow existing data)
ALTER TABLE projects ADD COLUMN organization_id TEXT REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX idx_projects_organization ON projects(organization_id);

-- ============================================================================
-- Enhanced Audit Logs with Organization
-- ============================================================================

-- Skip audit_logs migration for now - will be handled separately
-- The existing audit_logs table will continue to work
-- Future: Create migration to add organization_id column to existing table

-- ============================================================================
-- Seed: Create default organization for existing users
-- ============================================================================

-- This will be run by migration script, not in SQL
-- See: scripts/migrate-add-organizations.ts
