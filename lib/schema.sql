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
