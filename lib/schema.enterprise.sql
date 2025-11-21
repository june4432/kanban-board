-- ==========================================
-- Enterprise Kanban Board Schema
-- Version: 2.0.0
-- ==========================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ==========================================
-- 1. Companies (Tenants)
-- ==========================================
CREATE TABLE companies (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  domain          VARCHAR(255) UNIQUE,

  -- Subscription
  plan            VARCHAR(20) NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'starter', 'business', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'active'
                  CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at   TIMESTAMP,

  -- Limits
  max_users       INTEGER DEFAULT 5,
  max_projects    INTEGER DEFAULT 10,
  max_storage_gb  INTEGER DEFAULT 5,

  -- Settings
  settings        JSONB DEFAULT '{}',
  features        JSONB DEFAULT '{}',

  -- Metadata
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_companies_slug ON companies(slug);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON companies(domain) WHERE domain IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_plan ON companies(plan);

-- ==========================================
-- 2. Organizations (Teams/Departments)
-- ==========================================
CREATE TABLE organizations (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,

  parent_org_id   VARCHAR(36) REFERENCES organizations(id) ON DELETE SET NULL,

  settings        JSONB DEFAULT '{}',

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_organizations_company ON organizations(company_id);
CREATE INDEX IF NOT EXISTS idx_organizations_parent ON organizations(parent_org_id);

-- ==========================================
-- 3. Users
-- ==========================================
CREATE TABLE users (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),

  name            VARCHAR(255) NOT NULL,
  avatar_url      VARCHAR(500),
  timezone        VARCHAR(50) DEFAULT 'Asia/Seoul',
  locale          VARCHAR(10) DEFAULT 'ko',

  company_role    VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (company_role IN ('owner', 'admin', 'member')),

  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),
  email_verified  BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMP,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(company_id, status);

-- ==========================================
-- 4. Organization Members
-- ==========================================
CREATE TABLE organization_members (
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role            VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

  joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by      VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(organization_id, role);

-- ==========================================
-- 5. Projects
-- ==========================================
CREATE TABLE projects (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,

  color           VARCHAR(20) DEFAULT '#3b82f6',
  icon            VARCHAR(50),
  visibility      VARCHAR(20) DEFAULT 'private'
                  CHECK (visibility IN ('private', 'organization', 'company', 'public')),

  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'archived', 'deleted')),
  archived_at     TIMESTAMP,

  owner_id        VARCHAR(36) NOT NULL REFERENCES users(id),

  settings        JSONB DEFAULT '{}',

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(organization_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_projects_company ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_organization ON projects(organization_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(company_id, status);

-- ==========================================
-- 6. Project Members
-- ==========================================
CREATE TABLE project_members (
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role            VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by      VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- ==========================================
-- 7. Boards
-- ==========================================
CREATE TABLE boards (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL DEFAULT 'Main Board',
  type            VARCHAR(20) DEFAULT 'kanban'
                  CHECK (type IN ('kanban', 'scrum', 'custom')),

  settings        JSONB DEFAULT '{}',

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_boards_project ON boards(project_id);

-- ==========================================
-- 8. Columns
-- ==========================================
CREATE TABLE columns (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  board_id        VARCHAR(36) NOT NULL REFERENCES boards(id) ON DELETE CASCADE,

  title           VARCHAR(255) NOT NULL,
  position        INTEGER NOT NULL,

  wip_limit       INTEGER DEFAULT 0,
  color           VARCHAR(20),
  is_done_column  BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);
CREATE INDEX IF NOT EXISTS idx_columns_position ON columns(board_id, position);

-- ==========================================
-- 9. Labels (Hierarchical Scope)
-- ==========================================
CREATE TABLE labels (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,

  scope           VARCHAR(20) NOT NULL DEFAULT 'project'
                  CHECK (scope IN ('company', 'organization', 'project')),
  company_id      VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(20) NOT NULL,
  description     TEXT,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT labels_scope_hierarchy_check CHECK (
    (scope = 'company' AND company_id IS NOT NULL AND organization_id IS NULL AND project_id IS NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (scope = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_labels_company ON labels(company_id) WHERE scope = 'company';
CREATE INDEX IF NOT EXISTS idx_labels_organization ON labels(organization_id) WHERE scope = 'organization';
CREATE INDEX IF NOT EXISTS idx_labels_project ON labels(project_id) WHERE scope = 'project';

-- ==========================================
-- 10. Milestones (Hierarchical Scope)
-- ==========================================
CREATE TABLE milestones (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,

  scope           VARCHAR(20) NOT NULL DEFAULT 'project'
                  CHECK (scope IN ('company', 'organization', 'project')),
  company_id      VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  description     TEXT,

  start_date      DATE,
  due_date        DATE,

  status          VARCHAR(20) DEFAULT 'open'
                  CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT milestones_scope_hierarchy_check CHECK (
    (scope = 'company' AND company_id IS NOT NULL AND organization_id IS NULL AND project_id IS NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (scope = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_milestones_company ON milestones(company_id) WHERE scope = 'company';
CREATE INDEX IF NOT EXISTS idx_milestones_organization ON milestones(organization_id) WHERE scope = 'organization';
CREATE INDEX IF NOT EXISTS idx_milestones_project ON milestones(project_id) WHERE scope = 'project';
CREATE INDEX IF NOT EXISTS idx_milestones_due_date ON milestones(due_date);

-- ==========================================
-- 11. Cards
-- ==========================================
CREATE TABLE cards (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  column_id       VARCHAR(36) NOT NULL REFERENCES columns(id) ON DELETE CASCADE,

  board_id        VARCHAR(36) NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  title           VARCHAR(500) NOT NULL,
  description     TEXT,

  position        INTEGER NOT NULL,
  priority        VARCHAR(20) DEFAULT 'medium'
                  CHECK (priority IN ('lowest', 'low', 'medium', 'high', 'highest', 'urgent')),

  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMP,

  estimated_hours DECIMAL(10,2),
  actual_hours    DECIMAL(10,2),
  story_points    INTEGER,

  milestone_id    VARCHAR(36) REFERENCES milestones(id) ON DELETE SET NULL,

  created_by      VARCHAR(36) NOT NULL REFERENCES users(id),

  search_vector   TSVECTOR,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
CREATE INDEX IF NOT EXISTS idx_cards_board ON cards(board_id);
CREATE INDEX IF NOT EXISTS idx_cards_project ON cards(project_id);
CREATE INDEX IF NOT EXISTS idx_cards_position ON cards(column_id, position);
CREATE INDEX IF NOT EXISTS idx_cards_milestone ON cards(milestone_id);
CREATE INDEX IF NOT EXISTS idx_cards_due_date ON cards(due_date);
CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(priority);
CREATE INDEX IF NOT EXISTS idx_cards_search ON cards USING GIN(search_vector);

-- Full-text search trigger
CREATE OR REPLACE FUNCTION cards_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS cards_search_update ON cards;
CREATE TRIGGER cards_search_update BEFORE INSERT OR UPDATE
ON cards FOR EACH ROW EXECUTE FUNCTION cards_search_trigger();

-- ==========================================
-- 12. Card Assignees
-- ==========================================
CREATE TABLE card_assignees (
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by     VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_card_assignees_user ON card_assignees(user_id);

-- ==========================================
-- 13. Card Labels
-- ==========================================
CREATE TABLE card_labels (
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id        VARCHAR(36) NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_card_labels_label ON card_labels(label_id);

-- ==========================================
-- 14. Comments
-- ==========================================
CREATE TABLE comments (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  content         TEXT NOT NULL,

  parent_id       VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE,

  author_id       VARCHAR(36) NOT NULL REFERENCES users(id),

  is_edited       BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMP,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comments_card ON comments(card_id);
CREATE INDEX IF NOT EXISTS idx_comments_author ON comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);

-- ==========================================
-- 15. Checklists
-- ==========================================
CREATE TABLE checklists (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  title           VARCHAR(255) NOT NULL,
  position        INTEGER NOT NULL,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_items (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  checklist_id    VARCHAR(36) NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,

  content         VARCHAR(500) NOT NULL,
  is_completed    BOOLEAN DEFAULT FALSE,
  position        INTEGER NOT NULL,

  completed_at    TIMESTAMP,
  completed_by    VARCHAR(36) REFERENCES users(id),

  assignee_id     VARCHAR(36) REFERENCES users(id),
  due_date        DATE,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklists_card ON checklists(card_id);
CREATE INDEX IF NOT EXISTS idx_checklist_items_checklist ON checklist_items(checklist_id);

-- ==========================================
-- 16. Attachments
-- ==========================================
CREATE TABLE attachments (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  filename        VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      BIGINT NOT NULL,

  storage_type    VARCHAR(20) DEFAULT 'local'
                  CHECK (storage_type IN ('local', 's3', 'gcs', 'azure')),
  storage_path    VARCHAR(500) NOT NULL,

  uploaded_by     VARCHAR(36) NOT NULL REFERENCES users(id),

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_attachments_card ON attachments(card_id);

-- ==========================================
-- 17. Audit Logs
-- ==========================================
CREATE TABLE audit_logs (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  user_id         VARCHAR(36) REFERENCES users(id),
  user_name       VARCHAR(255),
  user_email      VARCHAR(255),

  resource_type   VARCHAR(50) NOT NULL,
  resource_id     VARCHAR(36) NOT NULL,
  resource_name   VARCHAR(255),

  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE SET NULL,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,

  action          VARCHAR(50) NOT NULL,

  changes         JSONB,
  metadata        JSONB,

  ip_address      INET,
  user_agent      TEXT,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project ON audit_logs(project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ==========================================
-- 18. Notifications
-- ==========================================
CREATE TABLE notifications (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  type            VARCHAR(50) NOT NULL,

  title           VARCHAR(255) NOT NULL,
  message         TEXT,

  resource_type   VARCHAR(50),
  resource_id     VARCHAR(36),
  url             VARCHAR(500),

  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMP,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_company ON notifications(company_id);

-- ==========================================
-- 19. Invitations
-- ==========================================
CREATE TABLE invitations (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  email           VARCHAR(255) NOT NULL,
  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  role            VARCHAR(20) NOT NULL DEFAULT 'member',

  token           VARCHAR(255) UNIQUE NOT NULL,

  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  invited_by      VARCHAR(36) NOT NULL REFERENCES users(id),

  expires_at      TIMESTAMP NOT NULL,
  accepted_at     TIMESTAMP,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_company ON invitations(company_id);

-- ==========================================
-- 20. Notification Settings
-- ==========================================
CREATE TABLE notification_settings (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  email_enabled   BOOLEAN DEFAULT TRUE,
  push_enabled    BOOLEAN DEFAULT TRUE,
  slack_enabled   BOOLEAN DEFAULT FALSE,

  notify_on_mention     BOOLEAN DEFAULT TRUE,
  notify_on_assignment  BOOLEAN DEFAULT TRUE,
  notify_on_due_date    BOOLEAN DEFAULT TRUE,
  notify_on_comment     BOOLEAN DEFAULT TRUE,
  notify_on_card_move   BOOLEAN DEFAULT FALSE,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);

-- ==========================================
-- 21. API Keys (for integrations)
-- ==========================================
CREATE TABLE api_keys (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  key_hash        VARCHAR(255) NOT NULL,
  key_prefix      VARCHAR(10) NOT NULL,

  scopes          JSONB DEFAULT '[]',

  last_used_at    TIMESTAMP,
  expires_at      TIMESTAMP,

  is_active       BOOLEAN DEFAULT TRUE,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_api_keys_company ON api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- ==========================================
-- 22. Webhooks
-- ==========================================
CREATE TABLE webhooks (
  id              VARCHAR(36) PRIMARY KEY DEFAULT uuid_generate_v4()::varchar,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  url             VARCHAR(500) NOT NULL,
  secret          VARCHAR(255),

  events          JSONB NOT NULL DEFAULT '[]',

  is_active       BOOLEAN DEFAULT TRUE,

  last_triggered_at TIMESTAMP,
  failure_count   INTEGER DEFAULT 0,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_webhooks_company ON webhooks(company_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_project ON webhooks(project_id);

-- ==========================================
-- Updated At Trigger Function
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['companies', 'organizations', 'users', 'projects', 'boards',
    'columns', 'labels', 'milestones', 'cards', 'comments', 'checklists',
    'checklist_items', 'notification_settings', 'webhooks']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS update_%s_updated_at ON %s', t, t);
    EXECUTE format('CREATE TRIGGER update_%s_updated_at BEFORE UPDATE ON %s
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t, t);
  END LOOP;
END
$$;

-- ==========================================
-- Initial Default Company (for migration)
-- ==========================================
-- This will be created by the migration script
