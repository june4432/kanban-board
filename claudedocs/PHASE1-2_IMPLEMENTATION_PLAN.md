# Phase 1-2 상세 구현 계획서

**작성일**: 2025-11-01
**프로젝트**: 실시간 협업 칸반보드
**목표**: 안정성 강화 + 협업 기능 고도화

---

## 목차

1. [개요](#개요)
2. [Phase 1: 안정성 강화](#phase-1-안정성-강화)
3. [Phase 2: 협업 기능 강화](#phase-2-협업-기능-강화)
4. [구현 일정](#구현-일정)
5. [성공 지표](#성공-지표)

---

## 개요

### 현재 상태
- ✅ Phase 0 완료: SQLite 마이그레이션, 기본 보안 구현
- ✅ 87개 테스트 통과
- ✅ API 인증, WebSocket 보안 구현
- ⚠️ 입력 검증, 에러 처리 개선 필요
- ⚠️ 협업 기능 (댓글, 파일 첨부 등) 미구현

### 목표
- **Phase 1**: 프로덕션 배포 준비 완료 (보안 98점)
- **Phase 2**: 협업 플랫폼으로서의 완성도 확보

---

## Phase 1: 안정성 강화

**기간**: 1-2주
**우선순위**: 🔴 Critical

### 1.1 입력 검증 시스템 (Zod)

#### 목표
모든 API 요청 데이터를 검증하여 SQL Injection, XSS 등의 공격 방어

#### 구현 내용

**1. Zod 스키마 정의**

파일: `lib/validation.ts` (확장)

```typescript
import { z } from 'zod';

// 프로젝트 스키마
export const projectSchema = z.object({
  name: z.string().min(1, "프로젝트 이름은 필수입니다").max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "올바른 색상 코드를 입력하세요").optional(),
  isPublic: z.boolean().optional(),
});

export const projectUpdateSchema = projectSchema.partial();

// 카드 스키마
export const cardSchema = z.object({
  title: z.string().min(1, "카드 제목은 필수입니다").max(200),
  description: z.string().max(5000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignees: z.array(z.string().uuid()).max(10, "담당자는 최대 10명까지 가능합니다"),
  labels: z.array(z.string()).max(20),
  dueDate: z.string().datetime().optional(),
  columnId: z.string().uuid(),
  milestoneId: z.string().uuid().optional(),
});

export const cardUpdateSchema = cardSchema.partial();

// 카드 이동 스키마
export const cardMoveSchema = z.object({
  cardId: z.string().uuid(),
  sourceColumnId: z.string().uuid(),
  destinationColumnId: z.string().uuid(),
  destinationIndex: z.number().int().min(0),
  projectId: z.string().uuid(),
});

// 사용자 스키마
export const userSignupSchema = z.object({
  name: z.string().min(2, "이름은 최소 2자 이상이어야 합니다").max(50),
  email: z.string().email("올바른 이메일 주소를 입력하세요"),
  password: z.string()
    .min(8, "비밀번호는 최소 8자 이상이어야 합니다")
    .regex(/[A-Z]/, "비밀번호에 대문자가 포함되어야 합니다")
    .regex(/[a-z]/, "비밀번호에 소문자가 포함되어야 합니다")
    .regex(/[0-9]/, "비밀번호에 숫자가 포함되어야 합니다"),
  avatar: z.string().url().optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// 멤버 관리 스키마
export const projectJoinRequestSchema = z.object({
  projectId: z.string().uuid(),
  message: z.string().max(500).optional(),
});

// 헬퍼 함수
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  return schema.parse(data);
}

export function safeValidateRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);
  return result;
}
```

**2. API 라우트에 적용**

예시: `pages/api/cards/index.ts`

```typescript
import { cardSchema, validateRequest } from '@/lib/validation';
import { ZodError } from 'zod';

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      // 입력 검증
      const validatedData = validateRequest(cardSchema, req.body);

      // 인증 확인
      const auth = await requireProjectMember(req, res, validatedData.columnId);
      if (!auth) return;

      // 카드 생성
      const card = await CardRepository.create({
        ...validatedData,
        createdBy: auth.session.user.id,
      });

      res.status(201).json(card);
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors,
        });
      }
      throw error;
    }
  }
}
```

**3. 테스트 작성**

파일: `__tests__/lib/validation.test.ts` (확장)

```typescript
describe('Validation Schemas', () => {
  describe('cardSchema', () => {
    it('should validate valid card data', () => {
      const validCard = {
        title: 'Test Card',
        description: 'Description',
        priority: 'high',
        assignees: [],
        labels: [],
        columnId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => validateRequest(cardSchema, validCard)).not.toThrow();
    });

    it('should reject invalid priority', () => {
      const invalidCard = {
        title: 'Test',
        priority: 'invalid',
        columnId: '123e4567-e89b-12d3-a456-426614174000',
      };

      expect(() => validateRequest(cardSchema, invalidCard)).toThrow(ZodError);
    });
  });
});
```

#### 예상 효과
- SQL Injection 방어: 100%
- XSS 공격 방어: 대폭 강화
- 잘못된 데이터 입력 차단
- 개발자 실수 방지

---

### 1.2 에러 처리 개선

#### 목표
구조화된 에러 로깅 및 안전한 에러 응답

#### 구현 내용

**1. AppError 클래스**

파일: `lib/errors.ts` (신규)

```typescript
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public code?: string,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(404, `${resource} not found`, 'NOT_FOUND');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Unauthorized') {
    super(401, message, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(403, message, 'FORBIDDEN');
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public details?: any) {
    super(400, message, 'VALIDATION_ERROR');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message, 'CONFLICT');
  }
}
```

**2. 로거 개선**

파일: `lib/logger.ts` (확장)

```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  transport: process.env.NODE_ENV !== 'production' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
});

export function logError(error: unknown, context: string, metadata?: object) {
  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      logger.error({ err: error, context, ...metadata }, error.message);
    } else {
      logger.warn({ err: error, context, ...metadata }, error.message);
    }
  } else if (error instanceof Error) {
    logger.error({ err: error, context, ...metadata }, error.message);
  } else {
    logger.error({ context, ...metadata }, 'Unknown error occurred');
  }
}

export function logRequest(req: NextApiRequest, metadata?: object) {
  logger.info({
    method: req.method,
    url: req.url,
    userId: (req as any).session?.user?.id,
    ...metadata,
  }, 'API request');
}
```

**3. 에러 핸들러 미들웨어**

파일: `lib/error-handler.ts` (신규)

```typescript
import { NextApiRequest, NextApiResponse } from 'next';
import { ZodError } from 'zod';
import { AppError } from './errors';
import { logError } from './logger';

export function errorHandler(
  error: unknown,
  req: NextApiRequest,
  res: NextApiResponse
) {
  logError(error, `API ${req.method} ${req.url}`);

  // Zod 검증 에러
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.errors,
    });
  }

  // 커스텀 AppError
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
    });
  }

  // 일반 에러 (프로덕션에서는 상세 정보 숨김)
  if (error instanceof Error) {
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    } else {
      return res.status(500).json({
        error: error.message,
        code: 'INTERNAL_ERROR',
        stack: error.stack,
      });
    }
  }

  // 알 수 없는 에러
  return res.status(500).json({
    error: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR',
  });
}

// API 핸들러 래퍼
export function withErrorHandler(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      await handler(req, res);
    } catch (error) {
      errorHandler(error, req, res);
    }
  };
}
```

**4. API에 적용**

```typescript
// pages/api/cards/[id].ts
import { withErrorHandler } from '@/lib/error-handler';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

export default withErrorHandler(async (req, res) => {
  const { id } = req.query;

  const card = await CardRepository.findById(id as string);
  if (!card) {
    throw new NotFoundError('Card');
  }

  const auth = await requireProjectMember(req, res, card.projectId);
  if (!auth) {
    throw new ForbiddenError('You do not have access to this card');
  }

  // ... 로직
});
```

#### 예상 효과
- 에러 추적 용이
- 프로덕션 보안 강화 (민감 정보 노출 방지)
- 일관된 에러 응답 형식
- 디버깅 시간 50% 단축

---

### 1.3 의존성 보안 업데이트

#### 목표
최신 버전으로 업데이트하여 보안 취약점 제거

#### 구현 순서

**1. 현재 취약점 확인**
```bash
npm audit
```

**2. 주요 패키지 업데이트**
```bash
# Next.js 및 React
npm update next@latest
npm update react@latest react-dom@latest

# TypeScript
npm update typescript@latest

# 보안 관련
npm update bcryptjs@latest
npm update zod@latest

# 자동 수정
npm audit fix
```

**3. 호환성 테스트**
```bash
npm run build
npm test
```

**4. package.json 정리**
```json
{
  "dependencies": {
    "@hello-pangea/dnd": "^16.6.0",
    "bcryptjs": "^3.0.2",
    "better-sqlite3": "^12.4.1",
    "next": "^15.0.0",
    "next-auth": "^5.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io": "^4.8.1",
    "zod": "^4.1.12"
  }
}
```

#### 예상 효과
- 알려진 보안 취약점 제거
- 성능 개선
- 새로운 기능 활용 가능

---

### 1.4 CI/CD 파이프라인

#### 목표
자동화된 테스트 및 배포 프로세스 구축

#### 구현 내용

**1. GitHub Actions 워크플로우**

파일: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18, 20]

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v4
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run linter
      run: npm run lint

    - name: Run type check
      run: npx tsc --noEmit

    - name: Run tests
      run: npm test -- --coverage

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json

    - name: Build project
      run: npm run build

  security:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Run security audit
      run: npm audit --production

    - name: Check for vulnerabilities
      run: npm audit --audit-level=high
```

**2. Pre-commit Hook**

파일: `.husky/pre-commit`

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

npm run lint
npm run test
```

설치:
```bash
npm install -D husky
npx husky install
npx husky add .husky/pre-commit "npm run lint && npm test"
```

#### 예상 효과
- 자동 품질 검증
- 버그 조기 발견
- 배포 안정성 향상

---

## Phase 2: 협업 기능 강화

**기간**: 1-2개월
**우선순위**: 🟡 High

### 2.1 댓글 시스템

#### 목표
카드별 실시간 댓글 기능으로 팀 커뮤니케이션 강화

#### 데이터베이스 스키마

```sql
-- lib/schema.sql에 추가
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  parent_id TEXT, -- 대댓글 지원
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX idx_comments_card_id ON comments(card_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_comments_parent_id ON comments(parent_id);
```

#### 타입 정의

```typescript
// types/index.ts에 추가
export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  user: User;
  content: string;
  parentId?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  replies?: Comment[]; // 대댓글
}
```

#### Repository

파일: `lib/repositories/comment.repository.ts`

```typescript
import { Database } from 'better-sqlite3';
import { Comment } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export class CommentRepository {
  constructor(private db: Database) {}

  create(data: {
    cardId: string;
    userId: string;
    content: string;
    parentId?: string;
  }): Comment {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO comments (id, card_id, user_id, content, parent_id)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.cardId, data.userId, data.content, data.parentId || null);

    return this.findById(id)!;
  }

  findById(id: string): Comment | null {
    const stmt = this.db.prepare(`
      SELECT
        c.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ? AND c.deleted_at IS NULL
    `);

    const row = stmt.get(id);
    if (!row) return null;

    return this.mapRowToComment(row);
  }

  findByCardId(cardId: string): Comment[] {
    const stmt = this.db.prepare(`
      SELECT
        c.*,
        u.id as user_id,
        u.name as user_name,
        u.email as user_email,
        u.avatar as user_avatar
      FROM comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.card_id = ? AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC
    `);

    const rows = stmt.all(cardId);
    const comments = rows.map(row => this.mapRowToComment(row));

    // 대댓글 구조화
    return this.buildCommentTree(comments);
  }

  update(id: string, content: string): Comment | null {
    const stmt = this.db.prepare(`
      UPDATE comments
      SET content = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND deleted_at IS NULL
    `);

    stmt.run(content, id);
    return this.findById(id);
  }

  softDelete(id: string): void {
    const stmt = this.db.prepare(`
      UPDATE comments
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(id);
  }

  private buildCommentTree(comments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // 맵 생성
    comments.forEach(comment => {
      comment.replies = [];
      commentMap.set(comment.id, comment);
    });

    // 트리 구조화
    comments.forEach(comment => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        if (parent) {
          parent.replies!.push(comment);
        }
      } else {
        rootComments.push(comment);
      }
    });

    return rootComments;
  }

  private mapRowToComment(row: any): Comment {
    return {
      id: row.id,
      cardId: row.card_id,
      userId: row.user_id,
      user: {
        id: row.user_id,
        name: row.user_name,
        email: row.user_email,
        avatar: row.user_avatar,
      },
      content: row.content,
      parentId: row.parent_id,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      deletedAt: row.deleted_at ? new Date(row.deleted_at) : undefined,
    };
  }
}
```

#### API 라우트

파일: `pages/api/cards/[cardId]/comments/index.ts`

```typescript
import { withErrorHandler } from '@/lib/error-handler';
import { requireCardAccess } from '@/lib/auth-helpers';
import { CommentRepository } from '@/lib/repositories/comment.repository';
import { getDatabase } from '@/lib/database';
import { z } from 'zod';

const createCommentSchema = z.object({
  content: z.string().min(1).max(2000),
  parentId: z.string().uuid().optional(),
});

export default withErrorHandler(async (req, res) => {
  const { cardId } = req.query;

  const auth = await requireCardAccess(req, res, cardId as string);
  if (!auth) return;

  const db = getDatabase();
  const commentRepo = new CommentRepository(db);

  if (req.method === 'GET') {
    const comments = commentRepo.findByCardId(cardId as string);
    return res.json(comments);
  }

  if (req.method === 'POST') {
    const validated = createCommentSchema.parse(req.body);

    const comment = commentRepo.create({
      cardId: cardId as string,
      userId: auth.session.user.id,
      content: validated.content,
      parentId: validated.parentId,
    });

    // WebSocket으로 실시간 알림
    const io = res.socket?.server?.io;
    if (io) {
      io.to(`project-${auth.project.projectId}`).emit('comment-created', {
        comment,
        cardId,
      });
    }

    return res.status(201).json(comment);
  }
});
```

#### 프론트엔드 컴포넌트

파일: `components/CardComments.tsx`

```typescript
import { useState, useEffect } from 'react';
import { Comment, User } from '@/types';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface CardCommentsProps {
  cardId: string;
  currentUser: User;
}

export default function CardComments({ cardId, currentUser }: CardCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [cardId]);

  async function fetchComments() {
    const res = await fetch(`/api/cards/${cardId}/comments`);
    const data = await res.json();
    setComments(data);
  }

  async function handleSubmit(e: React.FormEvent, parentId?: string) {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/cards/${cardId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComment,
          parentId,
        }),
      });

      const comment = await res.json();
      setComments(prev => [...prev, comment]);
      setNewComment('');
      setReplyingTo(null);
    } finally {
      setLoading(false);
    }
  }

  function renderComment(comment: Comment, depth: number = 0) {
    return (
      <div key={comment.id} className={`${depth > 0 ? 'ml-8 mt-2' : 'mt-4'}`}>
        <div className="flex gap-3">
          <img
            src={comment.user.avatar}
            className="w-8 h-8 rounded-full"
            alt={comment.user.name}
          />
          <div className="flex-1">
            <div className="bg-gray-100 rounded-lg p-3">
              <div className="font-semibold text-sm">{comment.user.name}</div>
              <div className="text-sm mt-1">{comment.content}</div>
            </div>
            <div className="flex gap-4 mt-1 text-xs text-gray-500">
              <span>
                {formatDistanceToNow(new Date(comment.createdAt), {
                  addSuffix: true,
                  locale: ko,
                })}
              </span>
              <button
                onClick={() => setReplyingTo(comment.id)}
                className="hover:text-blue-600"
              >
                답글
              </button>
            </div>

            {replyingTo === comment.id && (
              <form onSubmit={(e) => handleSubmit(e, comment.id)} className="mt-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  className="w-full border rounded p-2 text-sm"
                  rows={2}
                />
                <div className="flex gap-2 mt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                  >
                    등록
                  </button>
                  <button
                    type="button"
                    onClick={() => setReplyingTo(null)}
                    className="px-3 py-1 border rounded text-sm"
                  >
                    취소
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {comment.replies?.map(reply => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h3 className="font-semibold mb-3">댓글 {comments.length}</h3>

      <form onSubmit={(e) => handleSubmit(e)}>
        <div className="flex gap-3">
          <img
            src={currentUser.avatar}
            className="w-8 h-8 rounded-full"
            alt={currentUser.name}
          />
          <div className="flex-1">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="댓글을 입력하세요..."
              className="w-full border rounded p-2 text-sm"
              rows={3}
            />
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:bg-gray-400"
            >
              댓글 등록
            </button>
          </div>
        </div>
      </form>

      <div className="divide-y">
        {comments.map(comment => renderComment(comment))}
      </div>
    </div>
  );
}
```

#### 예상 효과
- 팀 커뮤니케이션 +50%
- 외부 메신저 의존도 감소
- 프로젝트 컨텍스트 유지

---

### 2.2 감사 로그 시스템

#### 목표
모든 중요 변경사항을 추적하여 투명성 확보

#### 데이터베이스 스키마

```sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  action TEXT NOT NULL, -- create, update, delete, move
  resource_type TEXT NOT NULL, -- card, project, member
  resource_id TEXT NOT NULL,
  project_id TEXT,
  changes TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

#### 구현 내용

파일: `lib/services/audit-log.service.ts`

```typescript
import { Database } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

interface AuditLogEntry {
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move';
  resourceType: 'card' | 'project' | 'member' | 'comment';
  resourceId: string;
  projectId?: string;
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  ipAddress?: string;
  userAgent?: string;
}

export class AuditLogService {
  constructor(private db: Database) {}

  async log(entry: AuditLogEntry) {
    const id = uuidv4();
    const stmt = this.db.prepare(`
      INSERT INTO audit_logs (
        id, user_id, user_name, action, resource_type, resource_id,
        project_id, changes, ip_address, user_agent
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      entry.userId,
      entry.userName,
      entry.action,
      entry.resourceType,
      entry.resourceId,
      entry.projectId || null,
      entry.changes ? JSON.stringify(entry.changes) : null,
      entry.ipAddress || null,
      entry.userAgent || null
    );
  }

  getProjectLogs(projectId: string, limit: number = 50) {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE project_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `);

    return stmt.all(projectId, limit);
  }

  getCardHistory(cardId: string) {
    const stmt = this.db.prepare(`
      SELECT * FROM audit_logs
      WHERE resource_type = 'card' AND resource_id = ?
      ORDER BY created_at DESC
    `);

    return stmt.all(cardId);
  }
}
```

API에 적용:
```typescript
// pages/api/cards/[id].ts에서
await auditLogService.log({
  userId: session.user.id,
  userName: session.user.name,
  action: 'update',
  resourceType: 'card',
  resourceId: cardId,
  projectId,
  changes: [
    { field: 'title', oldValue: oldCard.title, newValue: newCard.title },
  ],
  ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
  userAgent: req.headers['user-agent'],
});
```

---

### 2.3 파일 첨부 기능

#### 목표
카드에 이미지, 문서 파일 첨부

#### 구현 방안
- 로컬 저장 (개발): `public/uploads/`
- 프로덕션: AWS S3 또는 Cloudinary

#### 스키마
```sql
CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  card_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);
```

---

### 2.4 알림 설정 기능

사용자별 알림 on/off, 이메일 알림 설정

### 2.5 대시보드

프로젝트 진행률, 팀원별 작업량, Chart.js 활용

---

## 구현 일정

### Week 1-2: Phase 1 안정성 강화
- Day 1-2: Zod 입력 검증
- Day 3-4: 에러 처리 개선
- Day 5-7: 의존성 업데이트
- Day 8-10: CI/CD 파이프라인
- Day 11-14: 테스트 및 문서화

### Week 3-6: Phase 2 핵심 기능
- Week 3: 댓글 시스템
- Week 4: 감사 로그
- Week 5: 파일 첨부
- Week 6: 알림 설정

### Week 7-8: Phase 2 대시보드
- Week 7: 데이터 수집 및 API
- Week 8: 프론트엔드 UI

---

## 성공 지표

### Phase 1
- [ ] 입력 검증 100% 적용
- [ ] 에러 로깅 시스템 구축
- [ ] npm audit: 0 critical/high vulnerabilities
- [ ] CI/CD: 자동 테스트 통과율 100%
- [ ] 보안 점수: 98/100

### Phase 2
- [ ] 댓글 기능 활성 사용자 50%+
- [ ] 파일 첨부 사용률 30%+
- [ ] 대시보드 일일 접속 70%+
- [ ] 사용자 만족도 4.5/5

---

**작성자**: Claude AI
**승인자**: 프로젝트 매니저
**버전**: 1.0
