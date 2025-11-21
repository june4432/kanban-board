-- ==========================================
-- Kanban Board Database Schema (PostgreSQL)
-- Converted from SQLite schema
-- ==========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_uuid()

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

-- ==========================================
-- 4. Projects Table
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
  project_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE,
  color VARCHAR(20) DEFAULT '#3b82f6',
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public);

-- ==========================================
-- 5. Project Members (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS project_members (
  id SERIAL PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) CHECK(role IN ('owner', 'member')) DEFAULT 'member',
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ==========================================
-- 6. Project Join Requests
-- ==========================================
CREATE TABLE IF NOT EXISTS project_join_requests (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status VARCHAR(20) CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_join_requests_project ON project_join_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON project_join_requests(status);

-- ==========================================
-- 6b. Organization Join Requests
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

-- ==========================================
-- 7. Boards Table (1:1 with Projects)
-- ==========================================
CREATE TABLE IF NOT EXISTS boards (
  board_id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) UNIQUE NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

-- ==========================================
-- 8. Columns Table
-- ==========================================
CREATE TABLE IF NOT EXISTS columns (
  id VARCHAR(255) PRIMARY KEY,
  board_id VARCHAR(255) NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  wip_limit INTEGER DEFAULT 10,
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position);

-- ==========================================
-- 9. Milestones Table
-- ==========================================
CREATE TABLE IF NOT EXISTS milestones (
  id VARCHAR(255) PRIMARY KEY,
  scope VARCHAR(20) NOT NULL CHECK(scope IN ('organization', 'project', 'board')),
  scope_id VARCHAR(255) NOT NULL,  -- organization_id, project_id, or board_id
  board_id VARCHAR(255) REFERENCES boards(board_id) ON DELETE CASCADE,  -- DEPRECATED: kept for backward compatibility
  name VARCHAR(255) NOT NULL,
  description TEXT,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_milestones_board ON milestones(board_id);
CREATE INDEX IF NOT EXISTS idx_milestones_scope ON milestones(scope, scope_id);

-- ==========================================
-- 10. Cards Table
-- ==========================================
CREATE TABLE IF NOT EXISTS cards (
  id VARCHAR(255) PRIMARY KEY,
  column_id VARCHAR(255) NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  position INTEGER NOT NULL,
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  milestone_id VARCHAR(255) REFERENCES milestones(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_milestone ON cards(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);

-- Full-text search index for cards
CREATE INDEX IF NOT EXISTS idx_cards_fulltext ON cards USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- ==========================================
-- 11. Labels Table
-- ==========================================
CREATE TABLE IF NOT EXISTS labels (
  id VARCHAR(255) PRIMARY KEY,
  scope VARCHAR(20) NOT NULL CHECK(scope IN ('organization', 'project', 'board')),
  scope_id VARCHAR(255) NOT NULL,  -- organization_id, project_id, or board_id
  board_id VARCHAR(255) REFERENCES boards(board_id) ON DELETE CASCADE,  -- DEPRECATED: kept for backward compatibility
  name VARCHAR(255) NOT NULL,
  color VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);
CREATE INDEX IF NOT EXISTS idx_labels_scope ON labels(scope, scope_id);

-- ==========================================
-- 12. Card Labels (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS card_labels (
  card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id VARCHAR(255) NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_card_labels_card ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);

-- ==========================================
-- 13. Card Assignees (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS card_assignees (
  card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignees_card ON card_assignees(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assignees_user ON card_assignees(user_id);

-- ==========================================
-- 14. Comments Table
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
  id VARCHAR(255) PRIMARY KEY,
  card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id VARCHAR(255) REFERENCES comments(id) ON DELETE CASCADE,  -- 대댓글 지원
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP  -- Soft delete 지원
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- ==========================================
-- 15. Audit Logs Table (Enhanced with Organization)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(255) PRIMARY KEY,
  organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id),
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK(action IN ('create', 'update', 'delete', 'move')),
  resource_type VARCHAR(50) NOT NULL CHECK(resource_type IN ('card', 'project', 'member', 'comment', 'organization')),
  resource_id VARCHAR(255) NOT NULL,
  project_id VARCHAR(255) REFERENCES projects(project_id) ON DELETE CASCADE,
  changes JSONB,  -- JSON 형식의 변경사항
  ip_address INET,  -- PostgreSQL의 INET 타입 사용
  user_agent TEXT,
  request_id VARCHAR(255),  -- API request tracking
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);

-- ==========================================
-- 16. Attachments Table
-- ==========================================
CREATE TABLE IF NOT EXISTS attachments (
  id VARCHAR(255) PRIMARY KEY,
  card_id VARCHAR(255) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  size BIGINT NOT NULL,  -- bytes (BIGINT for large files)
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created ON attachments(created_at);

-- ==========================================
-- 17. User Notification Settings
-- ==========================================
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id VARCHAR(255) REFERENCES projects(project_id) ON DELETE CASCADE,

  -- 알림 타입별 설정
  card_created BOOLEAN DEFAULT TRUE,
  card_updated BOOLEAN DEFAULT TRUE,
  card_deleted BOOLEAN DEFAULT TRUE,
  card_assigned BOOLEAN DEFAULT TRUE,
  card_due_soon BOOLEAN DEFAULT TRUE,

  comment_created BOOLEAN DEFAULT TRUE,
  comment_mentioned BOOLEAN DEFAULT TRUE,

  project_invited BOOLEAN DEFAULT TRUE,
  project_updated BOOLEAN DEFAULT FALSE,

  -- 전체 알림 음소거
  muted BOOLEAN DEFAULT FALSE,

  -- 알림 전송 방법
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_project ON user_notification_settings(project_id);

-- 전역 알림 설정 (project_id가 NULL인 경우)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_global
  ON user_notification_settings(user_id)
  WHERE project_id IS NULL;

-- ==========================================
-- 18. Project Invitations
-- ==========================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id VARCHAR(255) PRIMARY KEY,
  project_id VARCHAR(255) NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  invite_token VARCHAR(255) UNIQUE NOT NULL,  -- 초대 링크 토큰 (UUID)
  created_by VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMP,  -- NULL이면 무제한
  max_uses INTEGER,  -- NULL이면 무제한
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_project ON project_invitations(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON project_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_invitations_active ON project_invitations(is_active, expires_at);

-- ==========================================
-- Functions and Triggers
-- ==========================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply to relevant tables
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labels_updated_at BEFORE UPDATE ON labels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_milestones_updated_at BEFORE UPDATE ON milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- Row Level Security (RLS) Setup
-- ==========================================

-- Enable RLS on key tables (optional, for multi-tenant isolation)
-- ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Example policy for projects (commented out, implement when needed)
-- CREATE POLICY org_isolation ON projects
--   USING (organization_id = current_setting('app.current_org_id')::varchar);
