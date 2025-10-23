# SQLite 도입 계획서

**작성일:** 2025-10-23
**프로젝트:** 칸반보드 앱
**목표:** JSON 파일 기반 → SQLite 데이터베이스 마이그레이션

---

## 1. 개요

### 1.1 현재 문제점

현재 시스템은 JSON 파일 기반으로 데이터를 저장하고 있으며, 다음과 같은 심각한 문제가 있습니다:

- **Race Condition**: 동시 접근 시 데이터 손실 위험
- **성능 저하**: 매 요청마다 전체 파일을 메모리에 로드
- **트랜잭션 미지원**: 데이터 정합성 보장 불가
- **확장성 제한**: 데이터 증가 시 성능 급격히 저하

```
현재 데이터 저장:
data/
├── kanban-boards.json  (588 lines)
├── projects.json       (85 lines)
└── users.json          (21 lines)
```

### 1.2 마이그레이션 목표

- ✅ 데이터 무결성 보장 (ACID 속성)
- ✅ 동시성 제어 (락 메커니즘)
- ✅ 성능 향상 (인덱스 기반 검색)
- ✅ 기존 API 100% 호환성 유지
- ✅ 타입 안전성 유지

---

## 2. 기술 스택 선정

### 2.1 ORM: Prisma

**선정 이유:**
- ✅ TypeScript 네이티브 지원 (타입 자동 생성)
- ✅ 마이그레이션 도구 내장
- ✅ Next.js와 우수한 통합
- ✅ SQLite 지원
- ✅ 향후 PostgreSQL/MySQL로 쉬운 전환

**대안 분석:**
- `better-sqlite3`: 경량이지만 타입 안전성 부족, 수동 쿼리 작성 필요
- `TypeORM`: 무겁고 Next.js 통합 복잡
- `Drizzle ORM`: 신생 라이브러리로 생태계 부족

### 2.2 추가 의존성

```json
{
  "dependencies": {
    "@prisma/client": "^5.22.0"
  },
  "devDependencies": {
    "prisma": "^5.22.0"
  }
}
```

---

## 3. 데이터베이스 설계

### 3.1 ERD (Entity Relationship Diagram)

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       │ 1:N (owner)
       ▼
┌─────────────────┐         ┌──────────────────┐
│   Projects      │────1:N──│ ProjectMembers   │
└────────┬────────┘         └──────────────────┘
         │
         │ 1:1
         ▼
┌─────────────────┐
│     Boards      │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│    Columns      │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐         ┌──────────────────┐
│      Cards      │────N:M──│  CardAssignees   │
└────────┬────────┘         └──────────────────┘
         │
         ├── N:M ──┐
         │         ▼
         │    ┌──────────────────┐
         │    │   CardLabels     │
         │    └──────────────────┘
         │
         └── N:1 ──┐
                   ▼
              ┌──────────────────┐
              │   Milestones     │
              └──────────────────┘

┌─────────────────┐
│     Labels      │
└─────────────────┘

┌──────────────────────────┐
│  ProjectJoinRequests     │
└──────────────────────────┘
```

### 3.2 테이블 정의

#### Users
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar TEXT,
  password TEXT,
  role TEXT DEFAULT 'user',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Projects
```sql
CREATE TABLE projects (
  project_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### ProjectMembers (다대다 관계)
```sql
CREATE TABLE project_members (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);
```

#### ProjectJoinRequests
```sql
CREATE TABLE project_join_requests (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(project_id, user_id)
);
```

#### Boards
```sql
CREATE TABLE boards (
  board_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES projects(project_id) ON DELETE CASCADE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

#### Columns
```sql
CREATE TABLE columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wip_limit INTEGER DEFAULT 0,
  position INTEGER NOT NULL,
  UNIQUE(board_id, position)
);
```

#### Cards
```sql
CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  column_id TEXT NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  milestone_id TEXT REFERENCES milestones(id) ON DELETE SET NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  due_date DATETIME,
  position INTEGER NOT NULL
);
```

#### CardAssignees (다대다 관계)
```sql
CREATE TABLE card_assignees (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id)
);
```

#### Labels
```sql
CREATE TABLE labels (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL
);
```

#### CardLabels (다대다 관계)
```sql
CREATE TABLE card_labels (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label_id TEXT NOT NULL REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, label_id)
);
```

#### Milestones
```sql
CREATE TABLE milestones (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  due_date DATETIME,
  description TEXT
);
```

### 3.3 인덱스 전략

성능 최적화를 위한 인덱스:

```sql
-- 프로젝트 조회 성능 향상
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_projects_is_public ON projects(is_public);

-- 보드/컬럼/카드 조회 성능 향상
CREATE INDEX idx_boards_project_id ON boards(project_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_cards_column_id ON cards(column_id);
CREATE INDEX idx_cards_milestone_id ON cards(milestone_id);

-- 다대다 관계 조회 성능 향상
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_card_assignees_card_id ON card_assignees(card_id);
CREATE INDEX idx_card_assignees_user_id ON card_assignees(user_id);
CREATE INDEX idx_card_labels_card_id ON card_labels(card_id);
CREATE INDEX idx_card_labels_label_id ON card_labels(label_id);

-- 날짜 기반 조회
CREATE INDEX idx_cards_due_date ON cards(due_date);
CREATE INDEX idx_milestones_due_date ON milestones(due_date);
```

---

## 4. Prisma 스키마 설계

### 4.1 schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = "file:./kanban.db"
}

model User {
  id        String   @id
  name      String
  email     String   @unique
  avatar    String?
  password  String?
  role      String   @default("user")
  createdAt DateTime @default(now()) @map("created_at")

  ownedProjects      Project[]             @relation("ProjectOwner")
  projectMemberships ProjectMember[]
  joinRequests       ProjectJoinRequest[]
  cardAssignments    CardAssignee[]

  @@map("users")
}

model Project {
  projectId   String   @id @map("project_id")
  name        String
  description String?
  ownerId     String   @map("owner_id")
  color       String?
  isPublic    Boolean  @default(false) @map("is_public")
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  owner        User                  @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: Cascade)
  members      ProjectMember[]
  joinRequests ProjectJoinRequest[]
  board        Board?
  labels       Label[]
  milestones   Milestone[]

  @@index([ownerId])
  @@index([isPublic])
  @@map("projects")
}

model ProjectMember {
  id        String   @id
  projectId String   @map("project_id")
  userId    String   @map("user_id")
  joinedAt  DateTime @default(now()) @map("joined_at")

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
  @@map("project_members")
}

model ProjectJoinRequest {
  id          String   @id
  projectId   String   @map("project_id")
  userId      String   @map("user_id")
  status      String   @default("pending")
  requestedAt DateTime @default(now()) @map("requested_at")

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@map("project_join_requests")
}

model Board {
  boardId   String   @id @map("board_id")
  projectId String   @unique @map("project_id")
  createdAt DateTime @default(now()) @map("created_at")

  project Project  @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  columns Column[]

  @@index([projectId])
  @@map("boards")
}

model Column {
  id       String @id
  boardId  String @map("board_id")
  title    String
  wipLimit Int    @default(0) @map("wip_limit")
  position Int

  board Board  @relation(fields: [boardId], references: [boardId], onDelete: Cascade)
  cards Card[]

  @@unique([boardId, position])
  @@index([boardId])
  @@map("columns")
}

model Card {
  id          String    @id
  columnId    String    @map("column_id")
  title       String
  description String?
  priority    String    @default("medium")
  milestoneId String?   @map("milestone_id")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  dueDate     DateTime? @map("due_date")
  position    Int

  column     Column         @relation(fields: [columnId], references: [id], onDelete: Cascade)
  milestone  Milestone?     @relation(fields: [milestoneId], references: [id], onDelete: SetNull)
  assignees  CardAssignee[]
  cardLabels CardLabel[]

  @@index([columnId])
  @@index([milestoneId])
  @@index([dueDate])
  @@map("cards")
}

model CardAssignee {
  id     String @id
  cardId String @map("card_id")
  userId String @map("user_id")

  card Card @relation(fields: [cardId], references: [id], onDelete: Cascade)
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([cardId, userId])
  @@index([cardId])
  @@index([userId])
  @@map("card_assignees")
}

model Label {
  id        String @id
  projectId String @map("project_id")
  name      String
  color     String

  project    Project     @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  cardLabels CardLabel[]

  @@map("labels")
}

model CardLabel {
  id      String @id
  cardId  String @map("card_id")
  labelId String @map("label_id")

  card  Card  @relation(fields: [cardId], references: [id], onDelete: Cascade)
  label Label @relation(fields: [labelId], references: [id], onDelete: Cascade)

  @@unique([cardId, labelId])
  @@index([cardId])
  @@index([labelId])
  @@map("card_labels")
}

model Milestone {
  id          String    @id
  projectId   String    @map("project_id")
  name        String
  dueDate     DateTime? @map("due_date")
  description String?

  project Project @relation(fields: [projectId], references: [projectId], onDelete: Cascade)
  cards   Card[]

  @@index([dueDate])
  @@map("milestones")
}
```

---

## 5. 구현 단계

### 5.1 Phase 1: 환경 설정 (1-2시간)

**작업 항목:**
1. Prisma 패키지 설치
   ```bash
   npm install @prisma/client
   npm install -D prisma
   ```

2. Prisma 초기화
   ```bash
   npx prisma init --datasource-provider sqlite
   ```

3. `schema.prisma` 작성 (위 스키마 사용)

4. 마이그레이션 생성 및 실행
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   ```

5. `.gitignore` 업데이트
   ```
   /prisma/*.db
   /prisma/*.db-journal
   ```

**검증:**
- `prisma/kanban.db` 파일 생성 확인
- `node_modules/.prisma/client` 생성 확인

---

### 5.2 Phase 2: Prisma Client 래퍼 작성 (1시간)

**파일:** `lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```

**목적:**
- Next.js 개발 모드에서 Hot Reload 시 PrismaClient 중복 생성 방지
- 성능 최적화

---

### 5.3 Phase 3: 마이그레이션 스크립트 작성 (3-4시간)

**파일:** `scripts/migrate-json-to-sqlite.ts`

```typescript
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface JSONUser {
  id: string;
  name: string;
  email: string;
  avatar: string;
  password?: string;
  role?: string;
  createdAt?: Date;
}

interface JSONProject {
  projectId: string;
  name: string;
  description?: string;
  ownerId: string;
  members: JSONUser[];
  createdAt: Date;
  updatedAt: Date;
  color?: string;
  isPublic: boolean;
  pendingRequests: any[];
}

interface JSONCard {
  id: string;
  title: string;
  description: string;
  assignees: string[];
  milestone?: any;
  priority: string;
  labels: any[];
  columnId: string;
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  position: number;
}

interface JSONColumn {
  id: string;
  title: string;
  cards: JSONCard[];
  wipLimit: number;
  position: number;
}

interface JSONBoard {
  boardId: string;
  projectId: string;
  columns: JSONColumn[];
  labels: any[];
  milestones: any[];
}

async function migrateUsers(users: JSONUser[]) {
  console.log(`Migrating ${users.length} users...`);

  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: {},
      create: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        password: user.password,
        role: user.role || 'user',
        createdAt: user.createdAt || new Date(),
      },
    });
  }

  console.log('✓ Users migrated');
}

async function migrateProjects(projects: JSONProject[]) {
  console.log(`Migrating ${projects.length} projects...`);

  for (const project of projects) {
    // Create project
    await prisma.project.create({
      data: {
        projectId: project.projectId,
        name: project.name,
        description: project.description,
        ownerId: project.ownerId,
        color: project.color,
        isPublic: project.isPublic,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
    });

    // Create project members
    for (const member of project.members) {
      await prisma.projectMember.create({
        data: {
          id: `pm-${project.projectId}-${member.id}`,
          projectId: project.projectId,
          userId: member.id,
        },
      });
    }

    // Create join requests
    for (const request of project.pendingRequests) {
      await prisma.projectJoinRequest.create({
        data: {
          id: request.id,
          projectId: project.projectId,
          userId: request.userId,
          status: request.status || 'pending',
          requestedAt: request.requestedAt || new Date(),
        },
      });
    }
  }

  console.log('✓ Projects migrated');
}

async function migrateBoards(boards: JSONBoard[]) {
  console.log(`Migrating ${boards.length} boards...`);

  for (const board of boards) {
    // Create board
    await prisma.board.create({
      data: {
        boardId: board.boardId,
        projectId: board.projectId,
      },
    });

    // Create labels
    const labelMap = new Map<string, string>();
    for (const label of board.labels) {
      const labelId = label.id || `label-${Date.now()}-${Math.random()}`;
      labelMap.set(label.id, labelId);

      await prisma.label.create({
        data: {
          id: labelId,
          projectId: board.projectId,
          name: label.name,
          color: label.color,
        },
      });
    }

    // Create milestones
    const milestoneMap = new Map<string, string>();
    for (const milestone of board.milestones) {
      const milestoneId = milestone.id || `milestone-${Date.now()}-${Math.random()}`;
      milestoneMap.set(milestone.id, milestoneId);

      await prisma.milestone.create({
        data: {
          id: milestoneId,
          projectId: board.projectId,
          name: milestone.name,
          dueDate: milestone.dueDate ? new Date(milestone.dueDate) : null,
          description: milestone.description,
        },
      });
    }

    // Create columns and cards
    for (const column of board.columns) {
      await prisma.column.create({
        data: {
          id: column.id,
          boardId: board.boardId,
          title: column.title,
          wipLimit: column.wipLimit,
          position: column.position,
        },
      });

      // Create cards
      for (const card of column.cards) {
        const milestoneId = card.milestone?.id
          ? milestoneMap.get(card.milestone.id)
          : null;

        await prisma.card.create({
          data: {
            id: card.id,
            columnId: column.id,
            title: card.title,
            description: card.description,
            priority: card.priority,
            milestoneId: milestoneId,
            createdAt: new Date(card.createdAt),
            updatedAt: new Date(card.updatedAt),
            dueDate: card.dueDate ? new Date(card.dueDate) : null,
            position: card.position,
          },
        });

        // Create card assignees
        for (const assigneeId of card.assignees) {
          await prisma.cardAssignee.create({
            data: {
              id: `ca-${card.id}-${assigneeId}`,
              cardId: card.id,
              userId: assigneeId,
            },
          });
        }

        // Create card labels
        for (const label of card.labels) {
          const labelId = labelMap.get(label.id);
          if (labelId) {
            await prisma.cardLabel.create({
              data: {
                id: `cl-${card.id}-${labelId}`,
                cardId: card.id,
                labelId: labelId,
              },
            });
          }
        }
      }
    }
  }

  console.log('✓ Boards migrated');
}

async function main() {
  try {
    console.log('Starting migration from JSON to SQLite...\n');

    // Read JSON files
    const usersPath = path.join(process.cwd(), 'data', 'users.json');
    const projectsPath = path.join(process.cwd(), 'data', 'projects.json');
    const boardsPath = path.join(process.cwd(), 'data', 'kanban-boards.json');

    const usersData = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf-8'));
    const boardsData = JSON.parse(fs.readFileSync(boardsPath, 'utf-8'));

    // Migrate in order (due to foreign key constraints)
    await migrateUsers(usersData.users || []);
    await migrateProjects(projectsData.projects || []);
    await migrateBoards(boardsData.boards || []);

    console.log('\n✓✓✓ Migration completed successfully! ✓✓✓');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
```

**실행:**
```bash
npx ts-node scripts/migrate-json-to-sqlite.ts
```

**검증:**
```bash
npx prisma studio  # 웹 UI에서 데이터 확인
```

---

### 5.4 Phase 4: Service 레이어 리팩토링 (8-10시간)

#### 5.4.1 boardService.ts 리팩토링

**기존 구조:**
```typescript
// fs.readFileSync/writeFileSync 사용
export const getBoard = (projectId: string): Board | null => {
  const data = readKanbanData();
  return data.boards.find(b => b.projectId === projectId) || null;
};
```

**새 구조:**
```typescript
import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';

export const getBoard = async (projectId: string) => {
  const board = await prisma.board.findUnique({
    where: { projectId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              assignees: {
                include: {
                  user: true,
                },
              },
              cardLabels: {
                include: {
                  label: true,
                },
              },
              milestone: true,
            },
          },
        },
      },
      project: {
        include: {
          labels: true,
          milestones: true,
        },
      },
    },
  });

  if (!board) return null;

  // Transform to frontend format
  return transformBoardToFrontend(board);
};

export const createCard = async (
  projectId: string,
  columnId: string,
  cardData: Partial<Card>
) => {
  return await prisma.$transaction(async (tx) => {
    // Get column to check WIP limit
    const column = await tx.column.findUnique({
      where: { id: columnId },
      include: { cards: true },
    });

    if (!column) {
      throw new Error('Column not found');
    }

    if (column.wipLimit > 0 && column.cards.length >= column.wipLimit) {
      throw new Error(`WIP limit (${column.wipLimit}) reached for column "${column.title}"`);
    }

    // Get next position
    const maxPosition = column.cards.reduce((max, card) => Math.max(max, card.position), -1);
    const newPosition = maxPosition + 1;

    // Create card
    const card = await tx.card.create({
      data: {
        id: uuidv4(),
        columnId,
        title: cardData.title || 'Untitled',
        description: cardData.description || '',
        priority: cardData.priority || 'medium',
        position: newPosition,
        dueDate: cardData.dueDate,
      },
    });

    // Add assignees
    if (cardData.assignees && cardData.assignees.length > 0) {
      await tx.cardAssignee.createMany({
        data: cardData.assignees.map((userId) => ({
          id: uuidv4(),
          cardId: card.id,
          userId,
        })),
      });
    }

    // Add labels
    if (cardData.labels && cardData.labels.length > 0) {
      await tx.cardLabel.createMany({
        data: cardData.labels.map((label) => ({
          id: uuidv4(),
          cardId: card.id,
          labelId: label.id,
        })),
      });
    }

    return card;
  });
};

export const moveCard = async (
  cardId: string,
  sourceColumnId: string,
  destColumnId: string,
  destIndex: number
) => {
  return await prisma.$transaction(async (tx) => {
    const card = await tx.card.findUnique({ where: { id: cardId } });
    if (!card) throw new Error('Card not found');

    // Same column - reorder
    if (sourceColumnId === destColumnId) {
      const cards = await tx.card.findMany({
        where: { columnId: sourceColumnId },
        orderBy: { position: 'asc' },
      });

      const oldIndex = cards.findIndex((c) => c.id === cardId);
      const reordered = [...cards];
      const [removed] = reordered.splice(oldIndex, 1);
      reordered.splice(destIndex, 0, removed);

      // Update positions
      for (let i = 0; i < reordered.length; i++) {
        await tx.card.update({
          where: { id: reordered[i].id },
          data: { position: i },
        });
      }
    } else {
      // Different column - check WIP limit
      const destColumn = await tx.column.findUnique({
        where: { id: destColumnId },
        include: { cards: true },
      });

      if (!destColumn) throw new Error('Destination column not found');

      if (destColumn.wipLimit > 0 && destColumn.cards.length >= destColumn.wipLimit) {
        throw new Error(`WIP limit reached`);
      }

      // Update source column positions
      const sourceCards = await tx.card.findMany({
        where: { columnId: sourceColumnId },
        orderBy: { position: 'asc' },
      });

      const filtered = sourceCards.filter((c) => c.id !== cardId);
      for (let i = 0; i < filtered.length; i++) {
        await tx.card.update({
          where: { id: filtered[i].id },
          data: { position: i },
        });
      }

      // Move card and update dest column positions
      await tx.card.update({
        where: { id: cardId },
        data: { columnId: destColumnId },
      });

      const destCards = await tx.card.findMany({
        where: { columnId: destColumnId },
        orderBy: { position: 'asc' },
      });

      const movedCard = destCards.find((c) => c.id === cardId)!;
      const others = destCards.filter((c) => c.id !== cardId);
      others.splice(destIndex, 0, movedCard);

      for (let i = 0; i < others.length; i++) {
        await tx.card.update({
          where: { id: others[i].id },
          data: { position: i },
        });
      }
    }
  });
};
```

#### 5.4.2 projectService.ts 리팩토링

**주요 변경:**
```typescript
export const getAllProjects = async () => {
  return await prisma.project.findMany({
    include: {
      owner: true,
      members: {
        include: {
          user: true,
        },
      },
      joinRequests: {
        include: {
          user: true,
        },
      },
    },
  });
};

export const createProject = async (projectData: any, ownerId: string) => {
  return await prisma.$transaction(async (tx) => {
    const projectId = `project-${Date.now()}`;
    const boardId = `board-${projectId}`;

    // Create project
    const project = await tx.project.create({
      data: {
        projectId,
        name: projectData.name,
        description: projectData.description,
        ownerId,
        color: projectData.color,
        isPublic: projectData.isPublic || false,
      },
    });

    // Add owner as member
    await tx.projectMember.create({
      data: {
        id: uuidv4(),
        projectId,
        userId: ownerId,
      },
    });

    // Create board
    await tx.board.create({
      data: {
        boardId,
        projectId,
      },
    });

    // Create default columns
    const defaultColumns = [
      { id: 'backlog', title: 'Backlog', position: 0 },
      { id: 'todo', title: 'To Do', position: 1 },
      { id: 'in-progress', title: 'In Progress', position: 2 },
      { id: 'done', title: 'Done', position: 3 },
    ];

    for (const col of defaultColumns) {
      await tx.column.create({
        data: {
          id: `${boardId}-${col.id}`,
          boardId,
          title: col.title,
          position: col.position,
          wipLimit: 0,
        },
      });
    }

    return project;
  });
};
```

---

### 5.5 Phase 5: API 엔드포인트 업데이트 (2-3시간)

**주요 변경 사항:**

1. **비동기 처리로 변경**
   ```typescript
   // Before
   export default function handler(req: NextApiRequest, res: NextApiResponse) {
     const board = getBoard(projectId);
   }

   // After
   export default async function handler(req: NextApiRequest, res: NextApiResponse) {
     const board = await getBoard(projectId);
   }
   ```

2. **에러 처리 개선**
   ```typescript
   try {
     const card = await createCard(projectId, columnId, cardData);
     res.status(201).json(card);
   } catch (error) {
     if (error.message.includes('WIP limit')) {
       res.status(400).json({ error: error.message });
     } else {
       res.status(500).json({ error: 'Internal server error' });
     }
   }
   ```

3. **트랜잭션 활용**
   - 카드 이동, 프로젝트 생성 등 복잡한 작업에 트랜잭션 적용

---

### 5.6 Phase 6: 테스트 및 검증 (4-5시간)

**테스트 계획:**

1. **단위 테스트 업데이트**
   - `__tests__/services/boardService.test.ts`
   - `__tests__/services/projectService.test.ts`
   - Prisma 모킹 또는 테스트 DB 사용

2. **통합 테스트**
   - API 엔드포인트 테스트
   - 실제 SQLite DB로 테스트

3. **수동 테스트 시나리오**
   - [ ] 프로젝트 생성 및 조회
   - [ ] 보드 조회 (빈 보드 자동 생성 확인)
   - [ ] 카드 CRUD
   - [ ] 카드 드래그 앤 드롭
   - [ ] WIP 제한 동작 확인
   - [ ] 다중 사용자 동시 작업 (Race condition 해결 확인)
   - [ ] 라벨/마일스톤 기능
   - [ ] 프로젝트 멤버 관리
   - [ ] 실시간 업데이트 (WebSocket)

4. **성능 테스트**
   - 카드 100개 이상일 때 조회 속도
   - 동시 요청 처리

---

## 6. 배포 및 롤백 계획

### 6.1 배포 체크리스트

- [ ] Prisma 마이그레이션 파일 포함
- [ ] `prisma/kanban.db` 제외 (.gitignore)
- [ ] 환경 변수 설정 (DATABASE_URL)
- [ ] 프로덕션 DB 마이그레이션 실행
- [ ] JSON 데이터 백업

### 6.2 롤백 계획

만약 문제 발생 시:

1. **즉시 롤백**
   ```bash
   git revert <commit-hash>
   ```

2. **JSON 파일 복구**
   - 백업된 JSON 파일 복원
   - 기존 코드로 재배포

3. **데이터 손실 방지**
   - SQLite DB도 보관 (향후 재시도 시 활용)

---

## 7. 향후 최적화 계획

### 7.1 단기 (마이그레이션 직후)

- [ ] N+1 쿼리 문제 확인 및 해결
- [ ] 인덱스 성능 모니터링
- [ ] 쿼리 로그 분석

### 7.2 중기 (1-2개월 후)

- [ ] Redis 캐싱 도입 (보드 조회)
- [ ] 페이지네이션 도입 (카드 목록)
- [ ] Full-text search (카드 검색)

### 7.3 장기 (6개월 후)

- [ ] PostgreSQL 마이그레이션 검토
- [ ] 수평 확장 전략
- [ ] 백업/복구 자동화

---

## 8. 리스크 및 대응 방안

| 리스크 | 영향도 | 대응 방안 |
|--------|--------|-----------|
| 데이터 마이그레이션 실패 | 높음 | JSON 백업 유지, 단계별 검증 |
| 성능 저하 | 중간 | 인덱스 최적화, 쿼리 프로파일링 |
| 기존 API 호환성 문제 | 높음 | 철저한 테스트, 점진적 배포 |
| SQLite 파일 손상 | 중간 | 정기 백업, WAL 모드 활성화 |
| 동시성 처리 오류 | 낮음 | 트랜잭션 격리 수준 조정 |

---

## 9. 마일스톤

| 단계 | 예상 시간 | 완료 조건 |
|------|-----------|-----------|
| Phase 1: 환경 설정 | 1-2시간 | Prisma 설정 완료, DB 생성 |
| Phase 2: Prisma Client | 1시간 | lib/prisma.ts 작성 |
| Phase 3: 마이그레이션 스크립트 | 3-4시간 | JSON → SQLite 변환 완료 |
| Phase 4: Service 리팩토링 | 8-10시간 | 모든 Service 함수 async로 변경 |
| Phase 5: API 업데이트 | 2-3시간 | 모든 API 엔드포인트 async 처리 |
| Phase 6: 테스트 | 4-5시간 | 모든 테스트 통과, 수동 검증 완료 |
| **총 예상 시간** | **19-25시간** | **프로덕션 배포 준비 완료** |

---

## 10. 참고 자료

- [Prisma 공식 문서](https://www.prisma.io/docs)
- [SQLite 공식 문서](https://www.sqlite.org/docs.html)
- [Next.js + Prisma 가이드](https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices)
- [Prisma Best Practices](https://www.prisma.io/docs/guides/performance-and-optimization/query-optimization-performance)

---

**문서 버전:** 1.0
**최종 수정:** 2025-10-23
**작성자:** Claude (AI Assistant)
