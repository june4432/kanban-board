# Vercel Postgres 설정 가이드

## 🎯 핵심 답변

### Q: PostgreSQL은 어디에 호스팅하나요?
**A: Vercel이 직접 제공합니다!**

별도의 PostgreSQL 서비스에 가입할 필요가 없습니다. Vercel 대시보드에서 클릭 몇 번으로 PostgreSQL 데이터베이스를 생성하고 사용할 수 있습니다.

### Q: 별도 회원가입이나 API 키가 필요한가요?
**A: 아니요, 필요 없습니다!**

- Vercel 계정만 있으면 됩니다
- 환경변수가 자동으로 프로젝트에 주입됩니다
- API 키 관리 불필요 - Vercel이 자동 처리

---

## 🏗️ Vercel Postgres란?

**Vercel Postgres** = Vercel이 제공하는 **서버리스 PostgreSQL 데이터베이스**

### 내부 구조
- **기반 기술**: Neon (서버리스 PostgreSQL 플랫폼)
- **관리**: Vercel이 완전 관리형으로 제공
- **통합**: Vercel 프로젝트와 완벽하게 통합

### 다른 옵션과의 차이

| 서비스 | 회원가입 | 설정 복잡도 | Vercel 통합 |
|--------|----------|-------------|-------------|
| **Vercel Postgres** | ❌ 불필요 (Vercel 계정만) | ⭐ 매우 쉬움 | ✅ 완벽 |
| Supabase | ✅ 필요 | ⭐⭐ 보통 | ⚠️ 수동 설정 |
| Railway | ✅ 필요 | ⭐⭐ 보통 | ⚠️ 수동 설정 |
| AWS RDS | ✅ 필요 | ⭐⭐⭐⭐⭐ 복잡 | ⚠️ 수동 설정 |
| PlanetScale | ✅ 필요 | ⭐⭐⭐ 중간 | ⚠️ 수동 설정 |

---

## 🚀 설정 방법 (5분 완성)

### 방법 1: Vercel 대시보드 (가장 쉬움) ⭐ 추천

#### 1단계: Vercel 대시보드 접속
1. https://vercel.com 로그인
2. 프로젝트 선택
3. 상단 탭에서 **"Storage"** 클릭

#### 2단계: Postgres 데이터베이스 생성
```
Storage 탭 → Create Database → Postgres 선택
```

**설정 항목**:
- **Database Name**: `kanban-db` (원하는 이름)
- **Region**: `US East (Ohio)` 또는 가까운 리전 선택
- **Pricing Plan**:
  - **Hobby** (무료): 256 MB, 60 compute hours/월
  - **Pro** (유료): 512 MB, 100 compute hours/월

**클릭**: "Create"

#### 3단계: 프로젝트 연결
데이터베이스 생성 후:
```
Connect Project → 현재 프로젝트 선택 → Connect
```

**자동으로 다음 환경변수가 프로젝트에 추가됩니다**:
```bash
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
POSTGRES_USER="..."
POSTGRES_HOST="..."
POSTGRES_PASSWORD="..."
POSTGRES_DATABASE="..."
```

#### 4단계: 로컬 환경변수 가져오기
```bash
# Vercel CLI 설치 (처음 한 번만)
npm i -g vercel

# 로그인
vercel login

# 프로젝트 링크
vercel link

# 환경변수 가져오기 (.env.local에 자동 저장)
vercel env pull .env.local
```

**완료!** 이제 로컬과 프로덕션 모두에서 PostgreSQL 사용 가능합니다.

---

### 방법 2: Vercel CLI (터미널에서)

```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. 로그인
vercel login

# 3. 프로젝트 디렉토리에서
cd /Users/youngjunlee/Documents/project/kanban-board

# 4. Postgres 생성 (대화형)
vercel postgres create

# 입력 요구 사항:
# - Database name: kanban-db
# - Region: 선택 (예: us-east-1)

# 5. 프로젝트 연결
vercel link

# 6. 환경변수 다운로드
vercel env pull .env.local
```

**완료!** `.env.local` 파일에 자동으로 DB 접속 정보가 저장됩니다.

---

## 📂 생성된 환경변수 확인

`.env.local` 파일 내용 (자동 생성):
```bash
# Postgres 연결 URL (풀링 사용)
POSTGRES_URL="postgres://default:abc123@ep-cool-name.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"

# Prisma용 연결 URL
POSTGRES_PRISMA_URL="postgres://default:abc123@ep-cool-name.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require&pgbouncer=true&connect_timeout=15"

# 풀링 없는 직접 연결
POSTGRES_URL_NON_POOLING="postgres://default:abc123@ep-cool-name.us-east-1.postgres.vercel-storage.com:5432/verceldb?sslmode=require"

# 개별 정보
POSTGRES_USER="default"
POSTGRES_HOST="ep-cool-name.us-east-1.postgres.vercel-storage.com"
POSTGRES_PASSWORD="abc123..."
POSTGRES_DATABASE="verceldb"
```

**중요**: 이 값들은 Vercel이 자동으로 생성하고 관리합니다. 수동으로 입력할 필요가 전혀 없습니다!

---

## 💻 코드에서 사용하기

### 1. 패키지 설치
```bash
npm install @vercel/postgres
# 또는
npm install pg
```

### 2-A. Vercel SDK 사용 (추천)

**`lib/postgres.ts`**:
```typescript
import { sql } from '@vercel/postgres';

export async function getUsers() {
  const { rows } = await sql`SELECT * FROM users`;
  return rows;
}

export async function createUser(name: string, email: string) {
  await sql`
    INSERT INTO users (id, name, email, created_at)
    VALUES (${crypto.randomUUID()}, ${name}, ${email}, NOW())
  `;
}
```

**특징**:
- SQL 인젝션 자동 방지 (템플릿 리터럴)
- 커넥션 풀링 자동 관리
- Vercel에 최적화

---

### 2-B. node-postgres (pg) 사용

**`lib/postgres.ts`**:
```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// 사용 예시
export async function getUsers() {
  const result = await query('SELECT * FROM users');
  return result.rows;
}
```

---

## 🗄️ 데이터베이스 스키마 생성

### 방법 1: Vercel 대시보드에서 직접 실행

1. Vercel → Storage → 생성한 DB 선택
2. **"Query"** 탭 클릭
3. SQL 쿼리 입력 후 실행

**예시**:
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar TEXT,
  role TEXT DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL,
  color TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 방법 2: 마이그레이션 스크립트

**`scripts/init-postgres.ts`**:
```typescript
import { sql } from '@vercel/postgres';
import fs from 'fs';

async function initDatabase() {
  console.log('🚀 Initializing PostgreSQL database...');

  // SQLite 스키마를 PostgreSQL 스키마로 변환
  const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      role TEXT DEFAULT 'user',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      project_id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT NOT NULL,
      color TEXT,
      is_public BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS boards (
      board_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      wip_limit INTEGER DEFAULT 0,
      position INTEGER NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS cards (
      id TEXT PRIMARY KEY,
      column_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium',
      position INTEGER NOT NULL,
      due_date TIMESTAMP,
      milestone_id TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS labels (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      name TEXT NOT NULL,
      due_date TIMESTAMP NOT NULL,
      description TEXT,
      FOREIGN KEY (board_id) REFERENCES boards(board_id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS card_labels (
      card_id TEXT NOT NULL,
      label_id TEXT NOT NULL,
      PRIMARY KEY (card_id, label_id),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS card_assignees (
      card_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      PRIMARY KEY (card_id, user_id),
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_members (
      id SERIAL PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at TIMESTAMP DEFAULT NOW(),
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS project_join_requests (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      responded_at TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(project_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- 인덱스 생성 (성능 최적화)
    CREATE INDEX IF NOT EXISTS idx_cards_column_id ON cards(column_id);
    CREATE INDEX IF NOT EXISTS idx_cards_milestone_id ON cards(milestone_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
    CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
  `;

  // 각 SQL 문을 분리하여 실행
  const statements = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      await sql.query(statement);
      console.log('✅', statement.substring(0, 50) + '...');
    } catch (error: any) {
      console.error('❌ Error:', error.message);
    }
  }

  console.log('🎉 Database initialized successfully!');
}

initDatabase().catch(console.error);
```

**실행**:
```bash
npx tsx scripts/init-postgres.ts
```

---

## 📊 SQLite → PostgreSQL 마이그레이션

### 데이터 마이그레이션 스크립트

**`scripts/migrate-sqlite-to-postgres.ts`**:
```typescript
import Database from 'better-sqlite3';
import { sql } from '@vercel/postgres';

const sqliteDb = Database('./data/kanban.db');

async function migrateTable(tableName: string) {
  console.log(`📦 Migrating ${tableName}...`);

  const rows = sqliteDb.prepare(`SELECT * FROM ${tableName}`).all();

  if (rows.length === 0) {
    console.log(`⚠️  No data in ${tableName}`);
    return;
  }

  for (const row of rows) {
    const columns = Object.keys(row);
    const values = Object.values(row);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;

    try {
      await sql.query(query, values);
    } catch (error: any) {
      console.error(`❌ Error inserting into ${tableName}:`, error.message);
    }
  }

  console.log(`✅ Migrated ${rows.length} rows to ${tableName}`);
}

async function migrate() {
  const tables = [
    'users',
    'projects',
    'project_members',
    'boards',
    'columns',
    'cards',
    'labels',
    'milestones',
    'card_labels',
    'card_assignees',
    'project_join_requests'
  ];

  for (const table of tables) {
    await migrateTable(table);
  }

  console.log('🎉 Migration completed!');
  sqliteDb.close();
}

migrate().catch(console.error);
```

**실행**:
```bash
# 1. 스키마 생성
npx tsx scripts/init-postgres.ts

# 2. 데이터 마이그레이션
npx tsx scripts/migrate-sqlite-to-postgres.ts
```

---

## 🔧 코드 변경사항

### 기존 SQLite 코드
**`lib/database.ts`**:
```typescript
import Database from 'better-sqlite3';

const db = Database('./data/kanban.db');
export default db;
```

### 새로운 PostgreSQL 코드
**`lib/database.ts`**:
```typescript
import { sql } from '@vercel/postgres';

// 직접 sql 사용
export { sql };

// 또는 래퍼 함수 제공
export async function query(text: string, params: any[] = []) {
  const result = await sql.query(text, params);
  return result.rows;
}
```

### Repository 변경 예시

**기존 SQLite**:
```typescript
export class UserRepository {
  async getUserById(id: string): Promise<User | null> {
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const row = stmt.get(id);
    return row || null;
  }

  async createUser(user: User): Promise<User> {
    const stmt = db.prepare(`
      INSERT INTO users (id, name, email, password)
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(user.id, user.name, user.email, user.password);
    return user;
  }
}
```

**새로운 PostgreSQL**:
```typescript
import { sql } from '@vercel/postgres';

export class UserRepository {
  async getUserById(id: string): Promise<User | null> {
    const { rows } = await sql`SELECT * FROM users WHERE id = ${id}`;
    return rows[0] || null;
  }

  async createUser(user: User): Promise<User> {
    await sql`
      INSERT INTO users (id, name, email, password)
      VALUES (${user.id}, ${user.name}, ${user.email}, ${user.password})
    `;
    return user;
  }
}
```

**차이점**:
- `?` → `${}` (템플릿 리터럴)
- `stmt.get()` → `await sql``
- `stmt.run()` → `await sql``
- 동기 → 비동기 (`async/await`)

---

## 💰 비용 (무료 티어)

### Vercel Postgres Hobby Plan (무료)

**포함 사항**:
- 스토리지: **256 MB**
- Compute: **60 hours/월**
- 데이터베이스 개수: **1개**

**예상 사용량** (칸반보드 기준):
- 스토리지: ~10-50 MB (소규모 팀)
- Compute: ~20-40 hours/월 (활발한 사용)

**결론**: 소규모 팀(5-10명)은 **완전 무료**로 사용 가능!

### Compute Hours 설명
"Compute hour"는 데이터베이스가 활성 상태인 시간입니다.
- 쿼리 실행 중일 때만 카운트
- 유휴 상태는 자동으로 일시정지 (무료)
- 대부분의 소규모 프로젝트는 무료 범위 내

---

## 🔒 보안

### 자동 보안 기능
- ✅ SSL/TLS 암호화 (기본 활성화)
- ✅ 환경변수 자동 암호화
- ✅ IP 화이트리스트 (옵션)
- ✅ 자동 백업 (Pro 플랜)

### 환경변수 보안
Vercel이 자동으로 관리:
- 프로덕션/개발 환경 분리
- GitHub에 노출 안 됨 (`.env.local`은 `.gitignore`)
- Vercel 대시보드에서만 확인 가능

---

## 🎯 요약

### 핵심 포인트
1. **별도 회원가입 불필요** - Vercel 계정만 있으면 됨
2. **API 키 관리 불필요** - Vercel이 자동 처리
3. **설정 매우 간단** - 클릭 몇 번으로 완료
4. **소규모 무료** - 256MB, 60 compute hours

### 시작 방법 (5분)
```bash
# 1. Vercel CLI 설치
npm i -g vercel

# 2. Postgres 생성
vercel postgres create

# 3. 환경변수 다운로드
vercel env pull .env.local

# 4. 스키마 생성
npx tsx scripts/init-postgres.ts

# 5. 데이터 마이그레이션
npx tsx scripts/migrate-sqlite-to-postgres.ts

# 완료! 🎉
```

---

**문서 작성일**: 2025-11-02
**작성자**: Claude Code Analysis
