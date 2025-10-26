# Kanban Board - SQLite 마이그레이션 계획서

## 📋 프로젝트 개요

### 목적
현재 JSON 파일 기반 데이터 저장소를 SQLite 데이터베이스로 마이그레이션하여 데이터 무결성, 성능, 보안을 개선합니다.

### 작성일
2025-10-26

### 대상 시스템
- 프로젝트: Kanban Board (Next.js 14.0.4)
- 현재 저장소: JSON 파일 (fs 모듈 사용)
- 목표 저장소: SQLite (better-sqlite3)

---

## 🔍 현재 상태 분석

### 데이터 구조
현재 시스템은 3개의 JSON 파일로 데이터를 관리합니다:

```
data/
├── users.json           # 사용자 정보
├── projects.json        # 프로젝트 및 멤버십
└── kanban-boards.json   # 보드, 컬럼, 카드
```

### 주요 문제점

1. **데이터 무결성 부족**
   - 외래키 제약 조건 없음
   - 트랜잭션 미지원
   - 동시성 제어 없음

2. **보안 취약점**
   - 비밀번호 평문 저장
   - SQL Injection 방지 불가 (Raw JSON)

3. **성능 이슈**
   - 전체 파일 읽기/쓰기 (O(n))
   - 인덱싱 없음
   - 동기 I/O로 블로킹 발생

4. **데이터 일관성 문제**
   - assignee(단수) vs assignees(복수) 혼재
   - members 구조 불일치 (일부는 User 객체, 일부는 { userId, role })

---

## 🎯 마이그레이션 목표

### 기능 목표
- ✅ 모든 기존 기능 100% 유지
- ✅ API 응답 포맷 호환성 유지
- ✅ WebSocket 실시간 동기화 유지

### 기술 목표
- ✅ 트랜잭션으로 데이터 일관성 보장
- ✅ 외래키 제약으로 참조 무결성 보장
- ✅ 비밀번호 해싱 (bcrypt) 적용
- ✅ 인덱스로 쿼리 성능 최적화
- ✅ Repository 패턴으로 비즈니스 로직 분리

### 성능 목표
- API 응답 시간: < 100ms (95 percentile)
- 대량 카드 조회: < 50ms (100개 기준)
- 동시 쓰기 지원: 10+ concurrent users

---

## 🛠 기술 스택 선정

### 선택: SQLite + better-sqlite3

#### 장점
- **설정 간단**: 서버리스, 파일 기반 DB
- **TypeScript 친화적**: 타입 안전성 보장
- **성능 우수**: 동기 API로 오버헤드 최소
- **트랜잭션 지원**: ACID 보장
- **표준 SQL**: 추후 PostgreSQL 마이그레이션 용이

#### 대안 비교

| 항목 | SQLite | LowDB | PostgreSQL |
|------|--------|-------|------------|
| 설정 복잡도 | ⭐ 낮음 | ⭐ 매우 낮음 | ⭐⭐⭐ 높음 |
| 성능 | ⭐⭐⭐ 우수 | ⭐⭐ 보통 | ⭐⭐⭐ 우수 |
| 트랜잭션 | ✅ 지원 | ❌ 미지원 | ✅ 지원 |
| 확장성 | ⭐⭐ 제한적 | ⭐ 낮음 | ⭐⭐⭐ 우수 |
| 로컬 개발 | ✅ 간편 | ✅ 간편 | ❌ Docker 필요 |

**결정**: SQLite가 현재 프로젝트 규모와 요구사항에 최적

---

## 🗄 데이터베이스 스키마

### ERD 개요

```
users ─┬─< project_members >─┬─ projects ─┬─< project_join_requests
       │                      │            │
       │                      │            └─< boards ─< columns ─< cards
       │                                                              │
       └──────────────────< card_assignees >─────────────────────────┤
                                                                      │
       labels ─────────────< card_labels >───────────────────────────┤
                                                                      │
       milestones ───────────────────────────────────────────────────┘
```

### 테이블 상세 설계

#### 1. users (사용자)
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,  -- bcrypt 해싱
  avatar TEXT,
  role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
```

#### 2. projects (프로젝트)
```sql
CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id),
  color TEXT DEFAULT '#3b82f6',
  is_public BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_owner ON projects(owner_id);
```

#### 3. project_members (프로젝트 멤버십)
```sql
CREATE TABLE project_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT CHECK(role IN ('owner', 'member')) DEFAULT 'member',
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_members_project ON project_members(project_id);
CREATE INDEX idx_project_members_user ON project_members(user_id);
```

#### 4. project_join_requests (가입 신청)
```sql
CREATE TABLE project_join_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_join_requests_project ON project_join_requests(project_id);
```

#### 5. boards (칸반 보드)
```sql
CREATE TABLE boards (
  board_id TEXT PRIMARY KEY,
  project_id TEXT UNIQUE NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE
);
```

#### 6. columns (컬럼)
```sql
CREATE TABLE columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wip_limit INTEGER DEFAULT 10,
  position INTEGER NOT NULL
);

CREATE INDEX idx_columns_board ON columns(board_id);
```

#### 7. cards (카드)
```sql
CREATE TABLE cards (
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

CREATE INDEX idx_cards_column ON cards(column_id);
CREATE INDEX idx_cards_milestone ON cards(milestone_id);
```

#### 8. labels (라벨)
```sql
CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);

CREATE INDEX idx_labels_board ON labels(board_id);
```

#### 9. card_labels (카드-라벨 다대다)
```sql
CREATE TABLE card_labels (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, label_id)
);
```

#### 10. card_assignees (카드-담당자 다대다)
```sql
CREATE TABLE card_assignees (
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (card_id, user_id)
);
```

#### 11. milestones (마일스톤)
```sql
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  due_date DATETIME
);

CREATE INDEX idx_milestones_board ON milestones(board_id);
```

---

## 🏗 Repository 패턴 설계

### 디렉토리 구조
```
lib/
├── database.ts              # DB 연결 및 초기화
├── schema.sql              # 테이블 생성 스크립트
└── repositories/
    ├── base.ts             # 공통 유틸리티
    ├── user.repository.ts
    ├── project.repository.ts
    ├── board.repository.ts
    └── card.repository.ts
```

### 예시: UserRepository

```typescript
// lib/repositories/user.repository.ts
import { Database } from 'better-sqlite3';
import { User } from '@/types';
import bcrypt from 'bcryptjs';

export class UserRepository {
  constructor(private db: Database) {}

  async create(data: { name: string; email: string; password: string }): Promise<User> {
    const hashedPassword = await bcrypt.hash(data.password, 10);
    const id = uuidv4();

    const stmt = this.db.prepare(`
      INSERT INTO users (id, name, email, password, avatar, role)
      VALUES (?, ?, ?, ?, ?, 'user')
    `);

    stmt.run(
      id,
      data.name,
      data.email,
      hashedPassword,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=3b82f6&color=fff`
    );

    return this.findById(id)!;
  }

  findById(id: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE id = ?');
    return stmt.get(id) as User | null;
  }

  findByEmail(email: string): User | null {
    const stmt = this.db.prepare('SELECT * FROM users WHERE email = ?');
    return stmt.get(email) as User | null;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = this.findByEmail(email);
    if (!user) return null;

    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }
}
```

### 트랜잭션 헬퍼

```typescript
// lib/database.ts
export function withTransaction<T>(fn: (db: Database) => T): T {
  const db = getDatabase();

  try {
    db.exec('BEGIN TRANSACTION');
    const result = fn(db);
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

// 사용 예시
withTransaction(db => {
  cardRepo.moveCard(cardId, newColumnId, position);
  cardRepo.updatePosition(affectedCards);
});
```

---

## 🚀 마이그레이션 전략

### 단계별 접근 (4 Phases)

#### Phase 1: 기반 데이터 (Week 1, Day 1-7)
1. **인프라 구축**
   - `npm install better-sqlite3 @types/better-sqlite3`
   - `lib/database.ts` 생성 (Singleton 패턴)
   - `schema.sql` 작성 및 실행
   - 환경 변수 설정 (`DATABASE_PATH`)

2. **Repository 구현**
   - `UserRepository` 구현
   - `ProjectRepository` 구현 (멤버십 포함)
   - 단위 테스트 작성

3. **API 마이그레이션**
   - `/api/auth/signup` → UserRepository
   - `/api/auth/login` → bcrypt.compare
   - `/api/users/index` → UserRepository.getAll()
   - `/api/projects/*` → ProjectRepository

#### Phase 2: 보드 & 카드 (Week 2, Day 8-14)
1. **Repository 구현**
   - `BoardRepository` 구현
   - `CardRepository` 구현

2. **API 마이그레이션**
   - `/api/kanban` → BoardRepository
   - `/api/cards/*` → CardRepository

3. **복잡 쿼리 최적화**
   - JOIN으로 카드 + 라벨 + 담당자 한번에 조회
   - Prepared Statement 캐싱

#### Phase 3: 데이터 이관 (Week 3, Day 15-16)
1. **마이그레이션 스크립트**
   ```bash
   npm run migrate:to-sqlite
   ```

2. **실행 순서**
   - JSON 파일 백업 → `data/.backup/`
   - SQLite DB 초기화
   - Users 마이그레이션 (비밀번호 해싱)
   - Projects 마이그레이션
   - Boards & Cards 마이그레이션
   - 관계 테이블 마이그레이션 (labels, assignees)

3. **검증**
   - 레코드 수 비교
   - 외래키 무결성 체크
   - 샘플 데이터 확인

#### Phase 4: 테스트 & 배포 (Week 3, Day 17-21)
1. **통합 테스트**
   - 모든 API 엔드포인트 테스트
   - WebSocket 이벤트 검증
   - 동시성 테스트

2. **성능 테스트**
   - 100개 카드 조회 성능
   - 복잡한 필터링 쿼리
   - 동시 쓰기 시나리오

3. **배포**
   - JSON 파일 아카이빙
   - SQLite 파일 백업 설정
   - 모니터링 설정

---

## 🧪 테스트 계획

### 단위 테스트 (Jest)
```typescript
describe('CardRepository', () => {
  let db: Database;
  let cardRepo: CardRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    initSchema(db);
    cardRepo = new CardRepository(db);
  });

  test('createCard should insert card with correct data', () => {
    const card = cardRepo.create({
      columnId: 'col-1',
      title: 'Test Card',
      description: 'Test Description',
      priority: 'high'
    });

    expect(card.id).toBeDefined();
    expect(card.title).toBe('Test Card');
    expect(card.priority).toBe('high');
  });

  test('assignUser should create card_assignees record', () => {
    const card = cardRepo.create({ ... });
    cardRepo.assignUser(card.id, 'user-1');

    const assignees = cardRepo.getAssignees(card.id);
    expect(assignees).toHaveLength(1);
    expect(assignees[0].id).toBe('user-1');
  });
});
```

### 통합 테스트
- API 엔드포인트별 E2E 테스트
- WebSocket 이벤트 발생 확인
- 세션 인증 플로우 검증

### 수동 테스트 체크리스트
- [ ] 회원가입 → 로그인
- [ ] 프로젝트 생성 → 멤버 추가
- [ ] 카드 생성 → 드래그 앤 드롭
- [ ] 라벨 생성 → 카드에 할당
- [ ] 복수 담당자 할당
- [ ] 실시간 동기화 (2개 브라우저)
- [ ] 프로젝트 가입 신청 → 승인/거부

---

## ⚠️ 리스크 관리

### 리스크 매트릭스

| 리스크 | 영향도 | 발생 확률 | 완화 전략 |
|--------|--------|-----------|-----------|
| 데이터 손실 | 🔴 높음 | 🟡 중간 | JSON 백업, 롤백 스크립트 |
| API 호환성 깨짐 | 🔴 높음 | 🟡 중간 | 응답 포맷 유지, 점진적 마이그레이션 |
| WebSocket 이슈 | 🟡 중간 | 🟢 낮음 | 이벤트 구조 동일 유지 |
| 성능 저하 | 🟡 중간 | 🟢 낮음 | 인덱스 최적화, 쿼리 프로파일링 |
| 동시성 문제 | 🟡 중간 | 🟡 중간 | WAL 모드, 트랜잭션 |

### 롤백 계획
1. SQLite 파일 삭제: `rm data/kanban.db`
2. JSON 백업 복원: `cp -r data/.backup/* data/`
3. 코드 롤백: `git revert <commit-hash>`

---

## 📊 성공 기준

### 기능 요구사항
- ✅ 모든 기존 기능 정상 작동 (100%)
- ✅ 데이터 무결성 유지 (0% 데이터 손실)
- ✅ API 응답 포맷 호환성 (100%)

### 성능 요구사항
- ✅ 카드 조회 응답 시간 < 50ms (100개 기준)
- ✅ API 평균 응답 시간 < 100ms
- ✅ 동시 사용자 10명 이상 지원

### 보안 요구사항
- ✅ 비밀번호 해싱 적용 (100%)
- ✅ SQL Injection 방지 (Prepared Statement)
- ✅ 외래키 제약으로 참조 무결성 보장

---

## 📅 구현 로드맵

### Week 1: 인프라 및 기반 구축
- **Day 1-2**: SQLite 설정, 스키마 설계
- **Day 3-4**: Repository 패턴 구현 (User, Project)
- **Day 5-7**: Repository 패턴 구현 (Board, Card)

### Week 2: API 마이그레이션
- **Day 8-10**: Auth & User APIs
- **Day 11-13**: Project APIs (멤버십, 가입 신청)
- **Day 14**: Board & Card APIs

### Week 3: 데이터 이관 및 검증
- **Day 15-16**: 마이그레이션 스크립트 작성 및 실행
- **Day 17-19**: 통합 테스트 및 버그 수정
- **Day 20-21**: 성능 최적화 및 배포

---

## 🔧 환경 설정

### 필수 패키지
```json
{
  "dependencies": {
    "better-sqlite3": "^9.2.2"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.8"
  }
}
```

### 환경 변수
```bash
# .env.local
DATABASE_PATH=./data/kanban.db
NODE_ENV=development
```

### Scripts 추가
```json
{
  "scripts": {
    "migrate:to-sqlite": "node scripts/migrate-to-sqlite.js",
    "db:init": "node scripts/init-db.js",
    "db:seed": "node scripts/seed-db.js"
  }
}
```

---

## 📚 참고 자료

### 문서
- [better-sqlite3 Documentation](https://github.com/WiseLibs/better-sqlite3/blob/master/docs/api.md)
- [SQLite Documentation](https://www.sqlite.org/docs.html)
- [Repository Pattern](https://martinfowler.com/eaaCatalog/repository.html)

### 관련 파일
- `types/index.ts` - 타입 정의
- `pages/api/**/*.ts` - 기존 API 라우트
- `data/*.json` - 현재 데이터 파일

---

## ✅ 다음 단계

1. **승인 대기**: 이 계획서 검토 및 승인
2. **환경 구축**: better-sqlite3 설치 및 설정
3. **스키마 생성**: schema.sql 작성 및 실행
4. **Repository 구현**: UserRepository부터 시작
5. **점진적 마이그레이션**: API 하나씩 전환

---

**작성자**: Claude
**최종 수정일**: 2025-10-26
**문서 버전**: 1.0
