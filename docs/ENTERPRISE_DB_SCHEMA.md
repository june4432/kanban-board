# Enterprise Kanban DB Schema Design

## 1. 개요

엔터프라이즈급 멀티테넌시를 지원하는 칸반보드 시스템의 데이터베이스 스키마 설계 문서입니다.

### 설계 원칙
- **멀티테넌시**: 회사(Company) 단위 완전 격리
- **유연한 조직 구조**: 부서/팀 계층 지원
- **확장성**: SaaS 및 On-premise 배포 가능
- **감사 추적**: 모든 변경 이력 추적

---

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            COMPANY (TENANT)                              │
│  - 최상위 격리 단위 (SaaS 고객사)                                         │
│  - 결제/구독, 도메인, 전체 설정 관리                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ 1:N
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            ORGANIZATIONS                                 │
│  - 회사 내 부서/팀 단위                                                   │
│  - 자체 설정, 멤버 관리                                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────────┐
              │  USERS   │   │ PROJECTS │   │ ORG_LABELS   │
              │(멤버십)   │   │          │   │ORG_MILESTONES│
              └──────────┘   └──────────┘   └──────────────┘
                                    │
                                    │ 1:1
                                    ▼
                             ┌──────────┐
                             │  BOARDS  │
                             └──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
              ┌──────────┐   ┌──────────┐   ┌──────────────┐
              │ COLUMNS  │   │  LABELS  │   │  MILESTONES  │
              └──────────┘   │(프로젝트) │   │  (프로젝트)   │
                    │        └──────────┘   └──────────────┘
                    ▼
              ┌──────────┐
              │  CARDS   │
              └──────────┘
                    │
        ┌───────────┼───────────┬───────────┬───────────┐
        ▼           ▼           ▼           ▼           ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
   │COMMENTS │ │CHECKLIST│ │ATTACHMT │ │CARD_    │ │CARD_    │
   │         │ │         │ │         │ │LABELS   │ │ASSIGNEES│
   └─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘
```

---

## 3. 테이블 상세 설계

### 3.1 Company (회사/테넌트)

최상위 멀티테넌시 단위. SaaS에서 각 고객사를 나타냅니다.

```sql
CREATE TABLE companies (
  id              VARCHAR(36) PRIMARY KEY,  -- UUID
  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,  -- URL-friendly identifier
  domain          VARCHAR(255) UNIQUE,           -- 커스텀 도메인 (선택)

  -- 구독/결제 정보
  plan            VARCHAR(20) NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'starter', 'business', 'enterprise')),
  subscription_status VARCHAR(20) DEFAULT 'active'
                  CHECK (subscription_status IN ('active', 'trial', 'suspended', 'cancelled')),
  trial_ends_at   TIMESTAMP,

  -- 제한 설정
  max_users       INTEGER DEFAULT 5,
  max_projects    INTEGER DEFAULT 10,
  max_storage_gb  INTEGER DEFAULT 5,

  -- 설정
  settings        JSONB DEFAULT '{}',
  features        JSONB DEFAULT '{}',  -- 활성화된 기능 플래그

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP  -- Soft delete
);

CREATE INDEX idx_companies_slug ON companies(slug);
CREATE INDEX idx_companies_domain ON companies(domain);
CREATE INDEX idx_companies_plan ON companies(plan);
```

### 3.2 Organizations (조직/부서)

회사 내 부서 또는 팀 단위입니다.

```sql
CREATE TABLE organizations (
  id              VARCHAR(36) PRIMARY KEY,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,

  -- 계층 구조 지원 (선택적)
  parent_org_id   VARCHAR(36) REFERENCES organizations(id) ON DELETE SET NULL,

  -- 설정
  settings        JSONB DEFAULT '{}',

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(company_id, slug)
);

CREATE INDEX idx_organizations_company ON organizations(company_id);
CREATE INDEX idx_organizations_parent ON organizations(parent_org_id);
```

### 3.3 Users (사용자)

사용자는 회사에 속하며, 여러 조직의 멤버가 될 수 있습니다.

```sql
CREATE TABLE users (
  id              VARCHAR(36) PRIMARY KEY,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 인증 정보
  email           VARCHAR(255) NOT NULL,
  password_hash   VARCHAR(255),  -- NULL if SSO only

  -- 프로필
  name            VARCHAR(255) NOT NULL,
  avatar_url      VARCHAR(500),
  timezone        VARCHAR(50) DEFAULT 'Asia/Seoul',
  locale          VARCHAR(10) DEFAULT 'ko',

  -- 회사 내 역할
  company_role    VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (company_role IN ('owner', 'admin', 'member')),

  -- 상태
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'invited', 'suspended', 'deleted')),
  email_verified  BOOLEAN DEFAULT FALSE,
  last_login_at   TIMESTAMP,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(company_id, email)
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(company_id, status);
```

### 3.4 Organization Members (조직 멤버십)

사용자와 조직 간의 N:M 관계를 관리합니다.

```sql
CREATE TABLE organization_members (
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role            VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'member', 'viewer')),

  joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by      VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (organization_id, user_id)
);

CREATE INDEX idx_org_members_user ON organization_members(user_id);
```

### 3.5 Projects (프로젝트)

프로젝트는 반드시 조직에 속합니다.

```sql
CREATE TABLE projects (
  id              VARCHAR(36) PRIMARY KEY,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL,
  slug            VARCHAR(100) NOT NULL,
  description     TEXT,

  -- 설정
  color           VARCHAR(20) DEFAULT '#3b82f6',
  icon            VARCHAR(50),
  visibility      VARCHAR(20) DEFAULT 'private'
                  CHECK (visibility IN ('private', 'organization', 'company', 'public')),

  -- 상태
  status          VARCHAR(20) DEFAULT 'active'
                  CHECK (status IN ('active', 'archived', 'deleted')),
  archived_at     TIMESTAMP,

  -- 소유자
  owner_id        VARCHAR(36) NOT NULL REFERENCES users(id),

  -- 설정
  settings        JSONB DEFAULT '{}',

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP,

  UNIQUE(organization_id, slug)
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_status ON projects(status);
```

### 3.6 Project Members (프로젝트 멤버)

```sql
CREATE TABLE project_members (
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  role            VARCHAR(20) NOT NULL DEFAULT 'member'
                  CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),

  joined_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  invited_by      VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX idx_project_members_user ON project_members(user_id);
```

### 3.7 Boards (보드)

프로젝트당 1개의 메인 보드 (추후 멀티보드 확장 가능)

```sql
CREATE TABLE boards (
  id              VARCHAR(36) PRIMARY KEY,
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(255) NOT NULL DEFAULT 'Main Board',
  type            VARCHAR(20) DEFAULT 'kanban'
                  CHECK (type IN ('kanban', 'scrum', 'custom')),

  -- 설정
  settings        JSONB DEFAULT '{}',

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(project_id)  -- 현재는 1 프로젝트 = 1 보드
);

CREATE INDEX idx_boards_project ON boards(project_id);
```

### 3.8 Columns (컬럼)

```sql
CREATE TABLE columns (
  id              VARCHAR(36) PRIMARY KEY,
  board_id        VARCHAR(36) NOT NULL REFERENCES boards(id) ON DELETE CASCADE,

  title           VARCHAR(255) NOT NULL,
  position        INTEGER NOT NULL,

  -- WIP 제한
  wip_limit       INTEGER DEFAULT 0,  -- 0 = 무제한

  -- 설정
  color           VARCHAR(20),
  is_done_column  BOOLEAN DEFAULT FALSE,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(board_id, position);
```

### 3.9 Labels (라벨) - 계층적 스코프

```sql
CREATE TABLE labels (
  id              VARCHAR(36) PRIMARY KEY,

  -- 스코프 (company > organization > project)
  scope           VARCHAR(20) NOT NULL DEFAULT 'project'
                  CHECK (scope IN ('company', 'organization', 'project')),
  company_id      VARCHAR(36) REFERENCES companies(id) ON DELETE CASCADE,
  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  name            VARCHAR(100) NOT NULL,
  color           VARCHAR(20) NOT NULL,
  description     TEXT,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  -- 스코프별 유니크 제약
  CONSTRAINT labels_scope_check CHECK (
    (scope = 'company' AND company_id IS NOT NULL AND organization_id IS NULL AND project_id IS NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (scope = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX idx_labels_company ON labels(company_id) WHERE scope = 'company';
CREATE INDEX idx_labels_organization ON labels(organization_id) WHERE scope = 'organization';
CREATE INDEX idx_labels_project ON labels(project_id) WHERE scope = 'project';
```

### 3.10 Milestones (마일스톤) - 계층적 스코프

```sql
CREATE TABLE milestones (
  id              VARCHAR(36) PRIMARY KEY,

  -- 스코프 (company > organization > project)
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

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT milestones_scope_check CHECK (
    (scope = 'company' AND company_id IS NOT NULL AND organization_id IS NULL AND project_id IS NULL) OR
    (scope = 'organization' AND organization_id IS NOT NULL AND project_id IS NULL) OR
    (scope = 'project' AND project_id IS NOT NULL)
  )
);

CREATE INDEX idx_milestones_company ON milestones(company_id) WHERE scope = 'company';
CREATE INDEX idx_milestones_organization ON milestones(organization_id) WHERE scope = 'organization';
CREATE INDEX idx_milestones_project ON milestones(project_id) WHERE scope = 'project';
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
```

### 3.11 Cards (카드)

```sql
CREATE TABLE cards (
  id              VARCHAR(36) PRIMARY KEY,
  column_id       VARCHAR(36) NOT NULL REFERENCES columns(id) ON DELETE CASCADE,

  -- 비정규화 (쿼리 성능)
  board_id        VARCHAR(36) NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- 기본 정보
  title           VARCHAR(500) NOT NULL,
  description     TEXT,

  -- 상태
  position        INTEGER NOT NULL,
  priority        VARCHAR(20) DEFAULT 'medium'
                  CHECK (priority IN ('lowest', 'low', 'medium', 'high', 'highest', 'urgent')),

  -- 일정
  start_date      DATE,
  due_date        DATE,
  completed_at    TIMESTAMP,

  -- 추정/실제 시간 (시간 단위)
  estimated_hours DECIMAL(10,2),
  actual_hours    DECIMAL(10,2),

  -- 스토리 포인트 (애자일)
  story_points    INTEGER,

  -- 마일스톤 연결
  milestone_id    VARCHAR(36) REFERENCES milestones(id) ON DELETE SET NULL,

  -- 생성자
  created_by      VARCHAR(36) NOT NULL REFERENCES users(id),

  -- 전문 검색
  search_vector   TSVECTOR,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX idx_cards_column ON cards(column_id);
CREATE INDEX idx_cards_board ON cards(board_id);
CREATE INDEX idx_cards_project ON cards(project_id);
CREATE INDEX idx_cards_position ON cards(column_id, position);
CREATE INDEX idx_cards_milestone ON cards(milestone_id);
CREATE INDEX idx_cards_due_date ON cards(due_date);
CREATE INDEX idx_cards_priority ON cards(priority);
CREATE INDEX idx_cards_search ON cards USING GIN(search_vector);

-- 전문 검색 트리거
CREATE OR REPLACE FUNCTION cards_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

CREATE TRIGGER cards_search_update BEFORE INSERT OR UPDATE
ON cards FOR EACH ROW EXECUTE FUNCTION cards_search_trigger();
```

### 3.12 Card Assignees (카드 담당자)

```sql
CREATE TABLE card_assignees (
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_by     VARCHAR(36) REFERENCES users(id),

  PRIMARY KEY (card_id, user_id)
);

CREATE INDEX idx_card_assignees_user ON card_assignees(user_id);
```

### 3.13 Card Labels (카드-라벨 연결)

```sql
CREATE TABLE card_labels (
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id        VARCHAR(36) NOT NULL REFERENCES labels(id) ON DELETE CASCADE,

  PRIMARY KEY (card_id, label_id)
);

CREATE INDEX idx_card_labels_label ON card_labels(label_id);
```

### 3.14 Comments (댓글)

```sql
CREATE TABLE comments (
  id              VARCHAR(36) PRIMARY KEY,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  content         TEXT NOT NULL,

  -- 답글 지원
  parent_id       VARCHAR(36) REFERENCES comments(id) ON DELETE CASCADE,

  -- 작성자
  author_id       VARCHAR(36) NOT NULL REFERENCES users(id),

  -- 수정 여부
  is_edited       BOOLEAN DEFAULT FALSE,
  edited_at       TIMESTAMP,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX idx_comments_card ON comments(card_id);
CREATE INDEX idx_comments_author ON comments(author_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
```

### 3.15 Checklists (체크리스트)

```sql
CREATE TABLE checklists (
  id              VARCHAR(36) PRIMARY KEY,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  title           VARCHAR(255) NOT NULL,
  position        INTEGER NOT NULL,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE checklist_items (
  id              VARCHAR(36) PRIMARY KEY,
  checklist_id    VARCHAR(36) NOT NULL REFERENCES checklists(id) ON DELETE CASCADE,

  content         VARCHAR(500) NOT NULL,
  is_completed    BOOLEAN DEFAULT FALSE,
  position        INTEGER NOT NULL,

  completed_at    TIMESTAMP,
  completed_by    VARCHAR(36) REFERENCES users(id),

  -- 담당자/마감일 (선택)
  assignee_id     VARCHAR(36) REFERENCES users(id),
  due_date        DATE,

  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checklists_card ON checklists(card_id);
CREATE INDEX idx_checklist_items_checklist ON checklist_items(checklist_id);
```

### 3.16 Attachments (첨부파일)

```sql
CREATE TABLE attachments (
  id              VARCHAR(36) PRIMARY KEY,
  card_id         VARCHAR(36) NOT NULL REFERENCES cards(id) ON DELETE CASCADE,

  filename        VARCHAR(255) NOT NULL,
  original_name   VARCHAR(255) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  size_bytes      BIGINT NOT NULL,

  -- 저장 위치
  storage_type    VARCHAR(20) DEFAULT 'local'
                  CHECK (storage_type IN ('local', 's3', 'gcs', 'azure')),
  storage_path    VARCHAR(500) NOT NULL,

  -- 업로더
  uploaded_by     VARCHAR(36) NOT NULL REFERENCES users(id),

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at      TIMESTAMP
);

CREATE INDEX idx_attachments_card ON attachments(card_id);
```

### 3.17 Audit Logs (감사 로그)

모든 중요 변경사항을 추적합니다.

```sql
CREATE TABLE audit_logs (
  id              VARCHAR(36) PRIMARY KEY,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 액터
  user_id         VARCHAR(36) REFERENCES users(id),
  user_name       VARCHAR(255),
  user_email      VARCHAR(255),

  -- 대상
  resource_type   VARCHAR(50) NOT NULL,  -- 'card', 'project', 'user', etc.
  resource_id     VARCHAR(36) NOT NULL,
  resource_name   VARCHAR(255),

  -- 컨텍스트 (선택적)
  organization_id VARCHAR(36) REFERENCES organizations(id),
  project_id      VARCHAR(36) REFERENCES projects(id),

  -- 액션
  action          VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'move', etc.

  -- 변경 내용
  changes         JSONB,  -- { field: { old: ..., new: ... } }
  metadata        JSONB,  -- 추가 컨텍스트

  -- 요청 정보
  ip_address      INET,
  user_agent      TEXT,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 파티셔닝 고려 (대용량 로그)
CREATE INDEX idx_audit_logs_company ON audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_project ON audit_logs(project_id, created_at DESC);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

### 3.18 Notifications (알림)

```sql
CREATE TABLE notifications (
  id              VARCHAR(36) PRIMARY KEY,
  user_id         VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 알림 타입
  type            VARCHAR(50) NOT NULL,  -- 'mention', 'assignment', 'due_date', etc.

  -- 내용
  title           VARCHAR(255) NOT NULL,
  message         TEXT,

  -- 링크
  resource_type   VARCHAR(50),
  resource_id     VARCHAR(36),
  url             VARCHAR(500),

  -- 상태
  is_read         BOOLEAN DEFAULT FALSE,
  read_at         TIMESTAMP,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_company ON notifications(company_id);
```

### 3.19 Invitations (초대)

```sql
CREATE TABLE invitations (
  id              VARCHAR(36) PRIMARY KEY,
  company_id      VARCHAR(36) NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- 초대 대상
  email           VARCHAR(255) NOT NULL,
  organization_id VARCHAR(36) REFERENCES organizations(id) ON DELETE CASCADE,
  project_id      VARCHAR(36) REFERENCES projects(id) ON DELETE CASCADE,

  -- 역할
  role            VARCHAR(20) NOT NULL DEFAULT 'member',

  -- 토큰
  token           VARCHAR(255) UNIQUE NOT NULL,

  -- 상태
  status          VARCHAR(20) DEFAULT 'pending'
                  CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),

  -- 초대자
  invited_by      VARCHAR(36) NOT NULL REFERENCES users(id),

  -- 만료
  expires_at      TIMESTAMP NOT NULL,
  accepted_at     TIMESTAMP,

  -- 메타데이터
  created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_company ON invitations(company_id);
```

---

## 4. Row Level Security (RLS)

PostgreSQL RLS를 활용한 멀티테넌시 격리:

```sql
-- RLS 활성화
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
-- ... 기타 테이블들

-- 정책 예시: organizations
CREATE POLICY company_isolation ON organizations
  USING (company_id = current_setting('app.current_company_id')::varchar);

-- 정책 예시: projects
CREATE POLICY company_isolation ON projects
  USING (company_id = current_setting('app.current_company_id')::varchar);
```

---

## 5. 데이터 접근 패턴

### 5.1 카드 조회 시 라벨/마일스톤 통합 조회

```sql
-- 프로젝트의 모든 사용 가능한 라벨 조회 (계층 통합)
SELECT * FROM labels
WHERE
  (scope = 'company' AND company_id = $1) OR
  (scope = 'organization' AND organization_id = $2) OR
  (scope = 'project' AND project_id = $3)
ORDER BY scope DESC, name;
```

### 5.2 사용자의 모든 프로젝트 조회

```sql
SELECT DISTINCT p.*
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN organization_members om ON p.organization_id = om.organization_id
WHERE
  p.company_id = $1 AND
  (p.owner_id = $2 OR pm.user_id = $2 OR om.user_id = $2)
  AND p.deleted_at IS NULL;
```

---

## 6. 마이그레이션 전략

### Phase 1: 스키마 생성
1. 새 테이블 생성 (companies 먼저)
2. 기존 데이터 마이그레이션
3. 기본 Company/Organization 생성

### Phase 2: 데이터 마이그레이션
1. 기존 users → 새 users (default company 할당)
2. 기존 projects → 새 projects (organization 연결)
3. labels/milestones scope 정리

### Phase 3: 코드 수정
1. Repository 레이어 수정
2. API 엔드포인트 수정
3. 프론트엔드 수정

---

## 7. 인덱스 전략 요약

- **company_id**: 모든 테넌트 관련 테이블에 인덱스
- **복합 인덱스**: (company_id, status), (organization_id, user_id) 등
- **부분 인덱스**: 특정 조건에서만 사용되는 인덱스
- **전문 검색**: cards.search_vector에 GIN 인덱스

---

## 8. 확장 고려사항

### 8.1 향후 추가 가능 테이블
- **Sprints**: 스크럼 스프린트 관리
- **Time Entries**: 시간 추적
- **Custom Fields**: 사용자 정의 필드
- **Webhooks**: 외부 연동
- **API Keys**: API 인증

### 8.2 성능 최적화
- 대용량 audit_logs 파티셔닝
- 읽기 복제본 활용
- 캐싱 레이어 (Redis)
