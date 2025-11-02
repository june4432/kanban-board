-- ==========================================
-- Kanban Board Database Schema
-- SQLite with better-sqlite3
-- ==========================================

-- Enable foreign key constraints
PRAGMA foreign_keys = ON;

-- ==========================================
-- 1. Users Table
-- ==========================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt hashed
  avatar TEXT,
  role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- ==========================================
-- 2. Projects Table
-- ==========================================
CREATE TABLE IF NOT EXISTS projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#3b82f6',
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_public ON projects(is_public);

-- ==========================================
-- 3. Project Members (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('owner', 'member')) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ==========================================
-- 4. Project Join Requests
-- ==========================================
CREATE TABLE IF NOT EXISTS project_join_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_join_requests_project ON project_join_requests(project_id);
CREATE INDEX IF NOT EXISTS idx_join_requests_status ON project_join_requests(status);

-- ==========================================
-- 5. Boards Table (1:1 with Projects)
-- ==========================================
CREATE TABLE IF NOT EXISTS boards (
  board_id TEXT PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

-- ==========================================
-- 6. Columns Table
-- ==========================================
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wip_limit INTEGER DEFAULT 10,
  position INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position);

-- ==========================================
-- 7. Milestones Table
-- ==========================================
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATETIME
);

CREATE INDEX IF NOT EXISTS idx_milestones_board ON milestones(board_id);

-- ==========================================
-- 8. Cards Table
-- ==========================================
CREATE TABLE IF NOT EXISTS cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  position INTEGER NOT NULL,
  due_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_milestone ON cards(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);

-- ==========================================
-- 9. Labels Table
-- ==========================================
CREATE TABLE IF NOT EXISTS labels (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_labels_board ON labels(board_id);

-- ==========================================
-- 10. Card Labels (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS card_labels (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_card_labels_card ON card_labels(card_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);

-- ==========================================
-- 11. Card Assignees (Many-to-Many)
-- ==========================================
CREATE TABLE IF NOT EXISTS card_assignees (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignees_card ON card_assignees(card_id);
CREATE INDEX IF NOT EXISTS idx_card_assignees_user ON card_assignees(user_id);

-- ==========================================
-- 12. Comments Table (Phase 2 - 댓글 시스템)
-- ==========================================
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  parent_id TEXT REFERENCES comments(id) ON DELETE CASCADE,  -- 대댓글 지원
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME  -- Soft delete 지원
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at);

-- ==========================================
-- 13. Audit Logs Table (Phase 2 - 감사 로그)
-- ==========================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL CHECK(action IN ('create', 'update', 'delete', 'move')),
  resource_type TEXT NOT NULL CHECK(resource_type IN ('card', 'project', 'member', 'comment')),
  resource_id TEXT NOT NULL,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,
  changes TEXT,  -- JSON 형식의 변경사항
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- ==========================================
-- 14. Attachments Table (Phase 2 - 파일 첨부)
-- ==========================================
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,  -- bytes
  storage_path TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);
CREATE INDEX IF NOT EXISTS idx_attachments_user ON attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created ON attachments(created_at);

-- ==========================================
-- 15. User Notification Settings (Phase 2 - 알림 설정)
-- ==========================================
CREATE TABLE IF NOT EXISTS user_notification_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id TEXT REFERENCES projects(project_id) ON DELETE CASCADE,

  -- 알림 타입별 설정
  card_created BOOLEAN DEFAULT 1,
  card_updated BOOLEAN DEFAULT 1,
  card_deleted BOOLEAN DEFAULT 1,
  card_assigned BOOLEAN DEFAULT 1,
  card_due_soon BOOLEAN DEFAULT 1,

  comment_created BOOLEAN DEFAULT 1,
  comment_mentioned BOOLEAN DEFAULT 1,

  project_invited BOOLEAN DEFAULT 1,
  project_updated BOOLEAN DEFAULT 0,

  -- 전체 알림 음소거
  muted BOOLEAN DEFAULT 0,

  -- 알림 전송 방법
  email_enabled BOOLEAN DEFAULT 1,
  in_app_enabled BOOLEAN DEFAULT 1,

  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON user_notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_project ON user_notification_settings(project_id);

-- 전역 알림 설정 (project_id가 NULL인 경우)
CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_settings_global
  ON user_notification_settings(user_id)
  WHERE project_id IS NULL;

-- ==========================================
-- 16. Project Invitations (프로젝트 초대 링크)
-- ==========================================
CREATE TABLE IF NOT EXISTS project_invitations (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  invite_token TEXT UNIQUE NOT NULL,  -- 초대 링크 토큰 (UUID)
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at DATETIME,  -- NULL이면 무제한
  max_uses INTEGER,  -- NULL이면 무제한
  current_uses INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_project ON project_invitations(project_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token ON project_invitations(invite_token);
CREATE INDEX IF NOT EXISTS idx_invitations_active ON project_invitations(is_active, expires_at);
