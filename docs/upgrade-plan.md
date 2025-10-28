# 칸반보드 시스템 업그레이드 계획서

**작성일**: 2025-10-28
**버전**: 1.0
**대상 시스템**: 실시간 협업 칸반보드 (Next.js 14 + Socket.IO)

---

## 📋 목차

1. [개요](#개요)
2. [보안 측면 개선사항](#보안-측면-개선사항)
3. [기능 측면 개선사항](#기능-측면-개선사항)
4. [기술적 측면 개선사항](#기술적-측면-개선사항)
5. [우선순위 로드맵](#우선순위-로드맵)
6. [구현 가이드](#구현-가이드)

---

## 개요

### 현재 시스템 상태

**기술 스택**
- Frontend: Next.js 14.0.4, React 18.2.0, TypeScript 5.3.3
- Backend: Next.js API Routes, Socket.IO 4.8.1
- Database: 파일 시스템 기반 JSON (data/*.json)
- Authentication: NextAuth.js 4.24.11

**주요 기능**
- 다중 프로젝트 관리 및 멤버 관리
- 실시간 칸반보드 (드래그앤드롭)
- 다양한 뷰 모드 (칸반, 캘린더, 간트)
- WebSocket 기반 실시간 동기화
- 필터링 및 검색

### 분석 결과 요약

이번 검토에서 **4개 영역, 총 35개의 개선사항**이 도출되었습니다:
- 🔴 **보안**: 8개 (Critical 4개, High 4개)
- 🟡 **기능**: 14개 (Medium~High)
- 🟢 **기술**: 9개 (High~Low)
- 🔵 **프로세스**: 4개 (Medium)

### 🎯 SQLite 마이그레이션 상태

**현재 상태**: 📄 계획서 작성 완료, 🔧 구현 대기 중

- ✅ 상세한 마이그레이션 계획서 작성됨 (`dev_docs/sqlite-migration-plan.md`)
- ✅ Prisma 기반 설계 완료 (스키마, ERD, 구현 단계 정의)
- ❌ 실제 코드 구현 아직 안 됨 (Prisma 설치 및 마이그레이션 필요)

**참조 문서**: `dev_docs/sqlite-migration-plan.md` (32KB, Prisma 스키마 포함)

---

## 보안 측면 개선사항

### 🔴 Critical Issues (즉시 수정 필요)

#### 1. API 인증/권한 검증 누락

**문제점**
```typescript
// pages/api/cards/[id].ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // ❌ NextAuth getServerSession 사용 없음
  // ❌ 누구나 카드 수정/삭제 가능
  const { userId } = req.body; // 신뢰할 수 없는 클라이언트 데이터
}
```

**영향도**: 심각 - 인증 없이 모든 데이터 조작 가능

**해결방안**
```typescript
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 1. 세션 확인
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 2. 프로젝트 멤버십 확인
  const project = await getProject(projectId);
  const isMember = project.members.some(m => m.id === session.user.id);
  if (!isMember) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // 3. 작업 권한 확인 (소유자만 삭제 가능 등)
  if (req.method === 'DELETE' && project.ownerId !== session.user.id) {
    return res.status(403).json({ error: 'Only owner can delete' });
  }
}
```

**적용 대상 파일**
- `pages/api/cards/[id].ts` - 카드 수정/삭제
- `pages/api/cards/index.ts` - 카드 생성
- `pages/api/cards/move.ts` - 카드 이동
- `pages/api/projects/[projectId].ts` - 프로젝트 수정/삭제 (LINE 120 TODO 구현)
- `pages/api/projects/[projectId]/members/[userId].ts` - 멤버 제거
- `pages/api/projects/[projectId]/requests/[requestId].ts` - 가입 승인/거부

**우선순위**: 🔴 P0 (1일 내)

---

#### 2. 비밀번호 평문 저장

**문제점**
```json
// data/users.json
{
  "id": "admin",
  "password": "admin"  // ❌ 평문 저장
}
```

**영향도**: 심각 - 데이터 유출 시 모든 계정 탈취 가능

**해결방안**

**Step 1: 신규 가입자 비밀번호 해싱 활성화**
```typescript
// pages/api/auth/signup.ts
import { hashPassword } from '@/lib/auth';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { password, ...userData } = req.body;

  // 비밀번호 해싱
  const hashedPassword = await hashPassword(password);

  const user = await createUser({
    ...userData,
    password: hashedPassword
  });
}
```

**Step 2: 기존 사용자 데이터 마이그레이션**
```typescript
// scripts/migrate-passwords.ts
import bcrypt from 'bcryptjs';
import fs from 'fs';

async function migratePasswords() {
  const users = JSON.parse(fs.readFileSync('data/users.json', 'utf-8'));

  for (const user of users.users) {
    // 평문 비밀번호인지 확인 (해시는 $2로 시작)
    if (!user.password.startsWith('$2')) {
      console.log(`Migrating password for user: ${user.email}`);
      user.password = await bcrypt.hash(user.password, 12);
    }
  }

  fs.writeFileSync('data/users.json', JSON.stringify(users, null, 2));
  console.log('Password migration completed!');
}

migratePasswords();
```

**Step 3: 로그인 로직 확인**
```typescript
// lib/auth.ts의 verifyPassword는 이미 bcrypt.compare 사용 중 ✅
```

**실행 순서**
```bash
# 1. 마이그레이션 스크립트 생성
npm run migrate:passwords

# 2. 기존 데이터 백업
cp data/users.json data/users.json.backup

# 3. 마이그레이션 실행
node scripts/migrate-passwords.ts

# 4. 검증
npm run test:auth
```

**우선순위**: 🔴 P0 (1일 내)

---

#### 3. WebSocket 인증 누락

**문제점**
```typescript
// pages/api/websocket.ts
socket.on('join-user', (userId: string) => {
  socket.join(`user-${userId}`); // ❌ userId 검증 없음
  // 누구나 다른 사용자의 알림 수신 가능
});
```

**영향도**: 심각 - 타인의 개인 알림 수신 가능

**해결방안**
```typescript
import { getSession } from 'next-auth/react';

io.use(async (socket, next) => {
  // WebSocket handshake에서 인증 확인
  const session = await getSession({ req: socket.request });

  if (!session?.user?.id) {
    return next(new Error('Unauthorized'));
  }

  // socket에 사용자 정보 저장
  socket.data.userId = session.user.id;
  socket.data.userEmail = session.user.email;
  next();
});

io.on('connection', (socket) => {
  // 인증된 사용자만 자신의 룸에 참여 가능
  socket.on('join-user', () => {
    const userId = socket.data.userId; // 클라이언트 입력 무시
    socket.join(`user-${userId}`);
  });

  socket.on('join-project', async (projectId: string) => {
    // 프로젝트 멤버십 확인
    const project = await getProject(projectId);
    const isMember = project.members.some(m => m.id === socket.data.userId);

    if (isMember) {
      socket.join(`project-${projectId}`);
    } else {
      socket.emit('error', { message: 'Access denied to project' });
    }
  });
});
```

**우선순위**: 🔴 P0 (2일 내)

---

#### 4. 환경 변수 검증 부재

**문제점**
```bash
# .env.example
NEXTAUTH_SECRET=your-secret-key-here-change-in-production
# ❌ 기본값이 그대로 프로덕션에 사용될 위험
```

**해결방안**
```typescript
// lib/env-validation.ts
export function validateEnv() {
  const required = [
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // NEXTAUTH_SECRET 강도 검증
  const secret = process.env.NEXTAUTH_SECRET!;
  if (secret.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters');
  }

  if (secret === 'your-secret-key-here-change-in-production') {
    throw new Error('NEXTAUTH_SECRET is using default value! Change it in production.');
  }

  // 프로덕션 환경 추가 검증
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      throw new Error('NEXTAUTH_URL should not use localhost in production');
    }
  }
}

// pages/_app.tsx
if (typeof window === 'undefined') {
  validateEnv(); // 서버 시작 시 검증
}
```

**우선순위**: 🔴 P0 (1일 내)

---

### 🟡 High Priority Issues

#### 5. 파일 시스템 DB의 Race Condition

**문제점**
```typescript
// services/projectService.ts
private static readProjects(): Project[] {
  return JSON.parse(fs.readFileSync(projectsFilePath, 'utf-8'));
}

private static writeProjects(projects: Project[]): boolean {
  fs.writeFileSync(projectsFilePath, JSON.stringify(projects, null, 2));
}

// ❌ 동시에 2개의 요청이 readProjects → 수정 → writeProjects 하면
//    나중에 쓴 요청이 먼저 쓴 변경사항을 덮어씀
```

**임시 해결방안** (DB 마이그레이션 전까지)
```typescript
// lib/file-lock.ts
import { promises as fs } from 'fs';
import path from 'path';

const locks = new Map<string, Promise<any>>();

export async function withFileLock<T>(
  filePath: string,
  operation: () => Promise<T>
): Promise<T> {
  const lockKey = path.resolve(filePath);

  // 이전 작업이 완료될 때까지 대기
  while (locks.has(lockKey)) {
    await locks.get(lockKey);
  }

  // 새 작업 시작
  const promise = operation();
  locks.set(lockKey, promise);

  try {
    return await promise;
  } finally {
    locks.delete(lockKey);
  }
}

// 사용 예시
static updateProject(projectId: string, updates: Partial<Project>): Promise<Project | null> {
  return withFileLock(projectsFilePath, async () => {
    const projects = this.readProjects();
    // ... 업데이트 로직
    this.writeProjects(projects);
    return updatedProject;
  });
}
```

**근본적 해결**: SQLite 마이그레이션 (Phase 2)

**우선순위**: 🟡 P1 (1주 내 임시 조치, 2주 내 근본 해결)

---

#### 6. CORS 설정 하드코딩

**문제점**
```typescript
// pages/api/websocket.ts
cors: {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://your-domain.com']  // ❌ 하드코딩
    : ['http://localhost:3000'],
}
```

**해결방안**
```typescript
// next.config.js
module.exports = {
  env: {
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || 'http://localhost:3000',
  },
};

// pages/api/websocket.ts
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  methods: ["GET", "POST"],
  credentials: true
}
```

```bash
# .env.production
ALLOWED_ORIGINS=https://kanban.example.com,https://www.kanban.example.com
```

**우선순위**: 🟡 P1 (1주 내)

---

#### 7. 에러 메시지 정보 노출

**문제점**
```typescript
catch (error) {
  console.error('Error reading users file:', error);
  // ❌ 스택 트레이스, 파일 경로 등 노출 가능
}
```

**해결방안**
```typescript
// lib/logger.ts
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

export function logError(error: unknown, context: string) {
  if (process.env.NODE_ENV === 'development') {
    console.error(`[${context}]`, error);
  } else {
    // 프로덕션: Sentry 등으로 전송
    console.error(`[${context}]`, {
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}

// 사용
catch (error) {
  logError(error, 'ProjectService.updateProject');
  throw new AppError(500, 'Failed to update project');
}
```

**우선순위**: 🟡 P1 (1주 내)

---

#### 8. 입력 검증 부족

**문제점**
```typescript
// 사용자 입력을 검증 없이 사용
const { name, description } = req.body;
```

**해결방안**
```typescript
// lib/validation.ts
import { z } from 'zod';

export const projectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  isPublic: z.boolean().optional(),
});

// 사용
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const validated = projectSchema.parse(req.body);
    // validated 데이터 사용
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
  }
}
```

**설치 필요**
```bash
npm install zod
```

**우선순위**: 🟡 P1 (2주 내)

---

## 기능 측면 개선사항

### 개선 필요 기능

#### 1. 감사 로그 (Audit Log) 시스템

**목적**: 누가 언제 무엇을 변경했는지 추적

**구현 예시**
```typescript
// types/index.ts
export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: 'create' | 'update' | 'delete' | 'move';
  resourceType: 'card' | 'project' | 'member';
  resourceId: string;
  changes: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

// services/auditService.ts
export class AuditService {
  static async log(entry: Omit<AuditLog, 'id' | 'timestamp'>) {
    const log: AuditLog = {
      ...entry,
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
    };

    // DB에 저장
    await db.auditLogs.insert(log);
  }

  static async getProjectLogs(projectId: string, limit = 50) {
    return db.auditLogs
      .where('resourceType', 'in', ['card', 'project'])
      .limit(limit)
      .orderBy('timestamp', 'desc')
      .all();
  }
}

// API에서 사용
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // ... 카드 업데이트 로직

  await AuditService.log({
    userId: session.user.id,
    userName: session.user.name,
    action: 'update',
    resourceType: 'card',
    resourceId: cardId,
    changes: [
      { field: 'title', oldValue: oldCard.title, newValue: newCard.title }
    ],
    ipAddress: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  });
}
```

**우선순위**: 🟢 P2 (1개월 내)

---

#### 2. 카드 히스토리/변경 이력

**UI 컴포넌트**
```typescript
// components/CardHistory.tsx
export function CardHistory({ cardId }: { cardId: string }) {
  const { data: history } = useQuery(['card-history', cardId], () =>
    fetch(`/api/cards/${cardId}/history`).then(r => r.json())
  );

  return (
    <div className="space-y-2">
      <h3 className="font-semibold">변경 이력</h3>
      {history?.map(entry => (
        <div key={entry.id} className="flex gap-2 text-sm">
          <span className="text-gray-500">
            {formatDate(entry.timestamp)}
          </span>
          <span>{entry.userName}</span>
          <span>{entry.action === 'update' ? '수정함' : '생성함'}</span>
          {entry.changes.map(change => (
            <div key={change.field}>
              <strong>{change.field}</strong>:
              <del>{change.oldValue}</del> → {change.newValue}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

**우선순위**: 🟢 P2 (1개월 내)

---

#### 3. 파일 첨부 기능

**요구사항**
- 이미지, PDF, 문서 파일 업로드
- 파일 크기 제한 (10MB)
- 미리보기 기능
- 다운로드 기능

**구현 방안**
```typescript
// API Route with file upload
import formidable from 'formidable';
import fs from 'fs/promises';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const form = formidable({
    uploadDir: './public/uploads',
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // 10MB
  });

  const [fields, files] = await form.parse(req);

  // 파일 정보 저장
  const attachment = {
    id: `file_${Date.now()}`,
    cardId: fields.cardId,
    filename: files.file.originalFilename,
    path: files.file.filepath,
    size: files.file.size,
    mimeType: files.file.mimetype,
    uploadedBy: session.user.id,
    uploadedAt: new Date(),
  };

  // DB에 저장
  await db.attachments.insert(attachment);

  res.json({ attachment });
}
```

**저장소 옵션**
- 로컬 파일 시스템 (개발/소규모)
- AWS S3 (프로덕션 권장)
- Cloudinary (이미지 최적화)

**우선순위**: 🟢 P2 (1-2개월 내)

---

#### 4. 댓글 시스템

**데이터 모델**
```typescript
export interface Comment {
  id: string;
  cardId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  parentId?: string; // 대댓글 지원
}
```

**컴포넌트**
```typescript
// components/CardComments.tsx
export function CardComments({ cardId }: { cardId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

  const handleSubmit = async () => {
    const response = await fetch(`/api/cards/${cardId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: newComment }),
    });

    const comment = await response.json();
    setComments([...comments, comment]);
    setNewComment('');
  };

  return (
    <div>
      <div className="space-y-2">
        {comments.map(comment => (
          <div key={comment.id} className="flex gap-2">
            <img src={comment.userAvatar} className="w-8 h-8 rounded-full" />
            <div>
              <div className="font-semibold">{comment.userName}</div>
              <div>{comment.content}</div>
              <div className="text-xs text-gray-500">
                {formatRelativeTime(comment.createdAt)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <textarea
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="댓글 작성..."
      />
      <button onClick={handleSubmit}>등록</button>
    </div>
  );
}
```

**우선순위**: 🟢 P2 (1-2개월 내)

---

#### 5-14. 기타 기능 제안

**5. 알림 설정**
- 사용자별 알림 on/off
- 알림 채널 선택 (WebSocket, 이메일)
- 우선순위: 🟢 P2

**6. 이메일 알림**
- 카드 할당 시 이메일 발송
- 마감일 임박 알림
- Nodemailer 또는 SendGrid 사용
- 우선순위: 🟢 P3

**7. 데이터 백업/복원**
- 자동 백업 (일일)
- 수동 백업/복원 UI
- 우선순위: 🟡 P1 (DB 마이그레이션 후)

**8. 데이터 내보내기**
- CSV, JSON, PDF 형식
- 프로젝트 단위 내보내기
- 우선순위: 🟢 P3

**9. 전문 검색 (Full-text Search)**
- PostgreSQL Full-text search 또는 Elasticsearch
- 카드 제목/내용/댓글 통합 검색
- 우선순위: 🟢 P3

**10. 대시보드**
- 프로젝트 진행률
- 팀원별 작업량
- 마감일 임박 카드
- Chart.js 또는 Recharts 사용
- 우선순위: 🟢 P2

**11. 프로젝트 템플릿**
- 자주 사용하는 프로젝트 구조 저장
- 템플릿에서 프로젝트 생성
- 우선순위: 🔵 P3

**12. 태그 시스템**
- 라벨 외 추가 분류 체계
- 태그별 필터링
- 우선순위: 🔵 P3

**13. 시간 추적**
- 카드별 작업 시간 기록
- 타임 트래킹 UI
- 우선순위: 🔵 P4

**14. 자동화 규칙**
- "특정 컬럼 이동 시 담당자 자동 할당"
- "마감일 3일 전 알림"
- 우선순위: 🔵 P4

---

## 기술적 측면 개선사항

### 1. 데이터베이스 마이그레이션 (최우선)

**현재 문제점**
- 파일 시스템 DB → Race condition
- 트랜잭션 지원 없음
- 인덱싱 불가 → 성능 저하
- 백업/복원 어려움

**📄 상세 계획서 이미 존재**: `dev_docs/sqlite-migration-plan.md`

기존에 작성된 SQLite 마이그레이션 계획서가 있으며, 다음 내용을 포함합니다:
- ✅ Prisma 기반 설계 (스키마, ERD)
- ✅ 단계별 구현 가이드 (Phase 1-6)
- ✅ 마이그레이션 스크립트 예시
- ✅ 테스트 전략 및 롤백 계획
- ✅ 예상 소요 시간: 19-25시간

**구현 단계 요약** (상세 내용은 `dev_docs/sqlite-migration-plan.md` 참조)

**Phase 1: Prisma 설정** (1-2일)
```bash
npm install @prisma/client
npm install -D prisma
npx prisma init --datasource-provider sqlite
# schema.prisma 작성 (기존 계획서 참조)
npx prisma migrate dev --name init
```

**Phase 2: 데이터 마이그레이션 스크립트** (1일)
- JSON → SQLite 변환 스크립트 작성
- 기존 계획서에 전체 스크립트 포함됨

**Phase 3: Service 레이어 리팩토링** (2-3일)
- 모든 Service 함수를 Prisma로 변경
- 트랜잭션 처리 추가

**Phase 4: API 엔드포인트 업데이트** (1일)
- 동기 → 비동기 처리로 변경

**Phase 5: 테스트 및 검증** (1-2일)
- 단위 테스트, 통합 테스트, 수동 QA

**예상 소요 시간**: 6-9일 (기존 계획서는 19-25시간 = 약 3-4일 추정)

**우선순위**: 🟡 P1 (2주 내 완료)

---

### 2. 의존성 업데이트

**보안 취약점 확인**
```bash
npm audit
npm audit fix

# 주요 업데이트 대상
npm update next@latest
npm update react@latest react-dom@latest
npm update typescript@latest
```

**Next.js 15 마이그레이션 고려사항**
- App Router 전환 (선택적)
- Turbopack 활성화
- 이미지 최적화 개선

**우선순위**: 🟡 P1 (1주 내)

---

### 3. 테스트 커버리지 강화

**현재 상태**
```bash
npm run test:coverage
# 현재 커버리지 확인 필요
```

**목표**: 80% 이상 커버리지

**테스트 전략**
```typescript
// __tests__/api/cards.test.ts
import { createMocks } from 'node-mocks-http';
import handler from '@/pages/api/cards/[id]';

describe('/api/cards/[id]', () => {
  it('should require authentication', async () => {
    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'card-123' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(401);
  });

  it('should update card with valid session', async () => {
    // Mock session
    jest.spyOn(require('next-auth/next'), 'getServerSession')
      .mockResolvedValue({ user: { id: 'user-1' } });

    const { req, res } = createMocks({
      method: 'PUT',
      query: { id: 'card-123' },
      body: { title: 'Updated Title' },
    });

    await handler(req, res);

    expect(res._getStatusCode()).toBe(200);
  });
});
```

**E2E 테스트** (Playwright)
```typescript
// e2e/kanban.spec.ts
import { test, expect } from '@playwright/test';

test('should create and move card', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // 로그인
  await page.fill('[name=email]', 'admin@admin.com');
  await page.fill('[name=password]', 'admin');
  await page.click('button[type=submit]');

  // 카드 생성
  await page.click('text=Add Card');
  await page.fill('[name=title]', 'Test Card');
  await page.click('text=Create');

  // 카드 이동
  await page.dragAndDrop('[data-card-id="test-card"]', '[data-column="in-progress"]');

  // 확인
  await expect(page.locator('[data-column="in-progress"] >> text=Test Card')).toBeVisible();
});
```

**설치**
```bash
npm install -D @playwright/test
npx playwright install
```

**우선순위**: 🟡 P1 (2주 내)

---

### 4. 성능 최적화

**측정 도구**
```bash
npm install -D @next/bundle-analyzer
```

**최적화 항목**

1. **이미지 최적화**
```typescript
// Before
<img src={user.avatar} />

// After
import Image from 'next/image';
<Image src={user.avatar} width={40} height={40} alt={user.name} />
```

2. **코드 스플리팅**
```typescript
// 동적 임포트
const CalendarView = dynamic(() => import('@/components/CalendarView'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

3. **API 응답 캐싱**
```typescript
// pages/api/projects/index.ts
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
  // ...
}
```

**우선순위**: 🟢 P2 (1개월 내)

---

### 5. 모니터링 및 로깅

**Sentry 통합**
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

**구조화된 로깅**
```typescript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// 사용
logger.info({ userId, projectId }, 'User joined project');
logger.error({ error, context }, 'Failed to update card');
```

**우선순위**: 🟢 P2 (1개월 내)

---

### 6-9. 기타 기술적 개선

**6. CI/CD 파이프라인**
```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run test
      - run: npm run build
```

우선순위: 🟢 P2 (1개월 내)

**7. API 문서화**
- OpenAPI 3.0 스펙 작성
- Swagger UI 통합
- 우선순위: 🔵 P3

**8. 접근성 (a11y)**
- ARIA 레이블 추가
- 키보드 네비게이션 개선
- 스크린 리더 테스트
- 우선순위: 🔵 P3

**9. 국제화 (i18n)**
- next-i18next 또는 next-intl
- 한국어, 영어 지원
- 우선순위: 🔵 P4

---

## 우선순위 로드맵

### Phase 1: Critical Security Fixes (1주)

**목표**: 보안 취약점 즉시 해결

| 항목 | 예상 시간 | 담당 |
|-----|---------|-----|
| API 인증/권한 검증 추가 | 2일 | Backend |
| 비밀번호 해싱 및 마이그레이션 | 1일 | Backend |
| WebSocket 인증 구현 | 1일 | Backend |
| 환경 변수 검증 | 0.5일 | DevOps |
| CORS 설정 수정 | 0.5일 | Backend |

**체크리스트**
- [ ] `pages/api/cards/[id].ts`에 getServerSession 추가
- [ ] `pages/api/cards/index.ts`에 getServerSession 추가
- [ ] `pages/api/cards/move.ts`에 getServerSession 추가
- [ ] `pages/api/projects/[projectId].ts` DELETE 권한 구현
- [ ] 모든 프로젝트 관련 API에 멤버십 확인 추가
- [ ] `scripts/migrate-passwords.ts` 작성 및 실행
- [ ] 기존 users.json 백업
- [ ] WebSocket handshake 인증 추가
- [ ] join-project 멤버십 확인 추가
- [ ] `lib/env-validation.ts` 작성
- [ ] `_app.tsx`에 환경 변수 검증 추가
- [ ] CORS origin을 환경 변수로 변경

---

### Phase 2: Infrastructure & Stability (2주)

**목표**: 안정적인 데이터 저장 및 테스트

| 항목 | 예상 시간 | 담당 |
|-----|---------|-----|
| SQLite 마이그레이션 | 5일 | Backend |
| 파일 잠금 임시 조치 | 1일 | Backend |
| 의존성 업데이트 | 1일 | DevOps |
| 에러 처리 개선 | 2일 | Backend |
| 입력 검증 (Zod) | 2일 | Backend |
| 테스트 작성 | 3일 | QA |

**체크리스트**
- [ ] Drizzle ORM 설정
- [ ] 스키마 정의
- [ ] 마이그레이션 스크립트 작성
- [ ] JSON → SQLite 데이터 이전
- [ ] API 라우트 DB 연결 업데이트
- [ ] services 레이어 리팩토링
- [ ] 통합 테스트 작성
- [ ] `withFileLock` 유틸리티 구현
- [ ] 주요 write 작업에 적용
- [ ] `npm audit` 실행 및 수정
- [ ] Next.js, React 업데이트
- [ ] 호환성 테스트
- [ ] AppError 클래스 구현
- [ ] logger 유틸리티 작성
- [ ] 모든 catch 블록 업데이트
- [ ] Zod 스키마 정의
- [ ] API 라우트에 검증 추가
- [ ] 단위 테스트 작성 (커버리지 >50%)
- [ ] E2E 테스트 작성 (주요 플로우)

---

### Phase 3: Feature Enhancements (1-2개월)

**목표**: 사용자 경험 개선 및 기능 추가

| 항목 | 예상 시간 | 담당 |
|-----|---------|-----|
| 감사 로그 시스템 | 3일 | Backend |
| 카드 히스토리 | 2일 | Frontend |
| 파일 첨부 기능 | 5일 | Full-stack |
| 댓글 시스템 | 5일 | Full-stack |
| 알림 설정 | 3일 | Frontend |
| 대시보드 | 5일 | Frontend |
| 모니터링 (Sentry) | 2일 | DevOps |
| CI/CD 파이프라인 | 3일 | DevOps |
| 성능 최적화 | 5일 | Full-stack |

**체크리스트**
- [ ] AuditLog 타입 정의
- [ ] AuditService 구현
- [ ] UI 컴포넌트 작성
- [ ] CardHistory 컴포넌트
- [ ] API 라우트 작성
- [ ] formidable 설정
- [ ] 파일 저장 로직
- [ ] 미리보기 UI
- [ ] Comment 타입 정의
- [ ] API 라우트 작성
- [ ] CardComments 컴포넌트
- [ ] WebSocket 실시간 댓글
- [ ] 알림 설정 UI
- [ ] 사용자 preference 저장
- [ ] 통계 데이터 수집
- [ ] Chart.js 통합
- [ ] 대시보드 UI
- [ ] Sentry 설정
- [ ] GitHub Actions 워크플로우
- [ ] 이미지 최적화
- [ ] 번들 사이즈 분석

---

### Phase 4: Advanced Features (향후 검토)

**목표**: 경쟁력 강화 및 확장성

| 항목 | 예상 시간 | 담당 |
|-----|---------|-----|
| 이메일 알림 | 3일 | Backend |
| 데이터 내보내기 | 3일 | Backend |
| 전문 검색 | 5일 | Backend |
| 프로젝트 템플릿 | 3일 | Full-stack |
| 시간 추적 | 5일 | Full-stack |
| 자동화 규칙 | 7일 | Backend |
| 국제화 | 5일 | Frontend |
| API 문서화 | 2일 | Backend |
| 접근성 개선 | 5일 | Frontend |

---

## 구현 가이드

### 시작하기 전에

1. **현재 상태 백업**
```bash
# 전체 프로젝트 백업
cp -r . ../kanban-board-backup-$(date +%Y%m%d)

# 데이터 백업
cp -r data data-backup-$(date +%Y%m%d)

# Git 커밋
git add .
git commit -m "Pre-upgrade checkpoint"
git tag pre-upgrade-$(date +%Y%m%d)
```

2. **개발 브랜치 생성**
```bash
git checkout -b feature/security-fixes
```

3. **의존성 설치 확인**
```bash
npm install
npm run build
npm run test
```

---

### Phase 1 구현 가이드 (보안 수정)

#### Step 1: API 인증 추가

**1일차 작업**

```typescript
// lib/auth-helpers.ts (새 파일)
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/pages/api/auth/[...nextauth]';
import { NextApiRequest, NextApiResponse } from 'next';

export async function requireAuth(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);

  if (!session?.user?.id) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return session;
}

export async function requireProjectMember(
  req: NextApiRequest,
  res: NextApiResponse,
  projectId: string
) {
  const session = await requireAuth(req, res);
  if (!session) return null;

  const project = await getProject(projectId);
  if (!project) {
    res.status(404).json({ error: 'Project not found' });
    return null;
  }

  const isMember = project.members.some(m => m.id === session.user.id);
  if (!isMember) {
    res.status(403).json({ error: 'Access denied' });
    return null;
  }

  return { session, project };
}
```

**적용 예시**
```typescript
// pages/api/cards/[id].ts
import { requireProjectMember } from '@/lib/auth-helpers';

export default async function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  const { id } = req.query;
  const projectId = req.query.projectId as string || req.body.projectId;

  // 인증 및 권한 확인
  const auth = await requireProjectMember(req, res, projectId);
  if (!auth) return; // 이미 에러 응답 전송됨

  const { session, project } = auth;

  // 기존 로직...
}
```

**테스트**
```bash
# 인증 없이 요청
curl -X PUT http://localhost:3000/api/cards/card-123
# 예상: 401 Unauthorized

# 인증된 요청
curl -X PUT http://localhost:3000/api/cards/card-123 \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"title":"Updated"}'
# 예상: 200 OK
```

---

#### Step 2: 비밀번호 마이그레이션

**2일차 작업**

```typescript
// scripts/migrate-passwords.ts (새 파일)
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

interface User {
  id: string;
  email: string;
  password: string;
  [key: string]: any;
}

async function migratePasswords() {
  const usersFilePath = path.join(process.cwd(), 'data', 'users.json');
  const backupPath = path.join(process.cwd(), 'data', `users-backup-${Date.now()}.json`);

  console.log('📋 Reading users.json...');
  const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
  const data = JSON.parse(fileContent);
  const users: User[] = data.users || data;

  console.log(`📊 Found ${users.length} users`);

  // 백업
  console.log('💾 Creating backup...');
  fs.writeFileSync(backupPath, fileContent);
  console.log(`✅ Backup created: ${backupPath}`);

  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    // 이미 해시된 비밀번호인지 확인 ($2a, $2b, $2y로 시작)
    if (user.password.startsWith('$2')) {
      console.log(`⏭️  Skipping ${user.email} (already hashed)`);
      skippedCount++;
      continue;
    }

    console.log(`🔒 Hashing password for ${user.email}...`);
    user.password = await bcrypt.hash(user.password, 12);
    migratedCount++;
  }

  // 저장
  console.log('💾 Saving migrated data...');
  const output = data.users ? { users } : users;
  fs.writeFileSync(usersFilePath, JSON.stringify(output, null, 2));

  console.log('\n✅ Migration completed!');
  console.log(`   Migrated: ${migratedCount} users`);
  console.log(`   Skipped: ${skippedCount} users`);
  console.log(`   Backup: ${backupPath}`);
}

migratePasswords().catch(error => {
  console.error('❌ Migration failed:', error);
  process.exit(1);
});
```

**package.json에 스크립트 추가**
```json
{
  "scripts": {
    "migrate:passwords": "ts-node scripts/migrate-passwords.ts"
  }
}
```

**실행**
```bash
npm run migrate:passwords
```

**검증**
```typescript
// __tests__/password-migration.test.ts
import bcrypt from 'bcryptjs';
import fs from 'fs';

describe('Password Migration', () => {
  it('should hash all passwords', () => {
    const users = JSON.parse(fs.readFileSync('data/users.json', 'utf-8')).users;

    for (const user of users) {
      expect(user.password).toMatch(/^\$2[aby]\$/);
    }
  });

  it('should verify with bcrypt', async () => {
    const users = JSON.parse(fs.readFileSync('data/users.json', 'utf-8')).users;
    const adminUser = users.find(u => u.email === 'admin@admin.com');

    // 원래 비밀번호 'admin'과 비교
    const isValid = await bcrypt.compare('admin', adminUser.password);
    expect(isValid).toBe(true);
  });
});
```

---

#### Step 3: WebSocket 인증

**3일차 작업**

```typescript
// pages/api/websocket.ts
import { NextApiRequest } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from './auth/[...nextauth]';

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log('Socket is already running');
  } else {
    const io = new SocketIOServer(res.socket.server, {
      path: '/api/socketio',
      addTrailingSlash: false,
      cors: {
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        methods: ["GET", "POST"],
        credentials: true
      }
    });

    // 인증 미들웨어
    io.use(async (socket, next) => {
      try {
        const req = socket.request as any;
        const session = await getServerSession(req, {} as any, authOptions);

        if (!session?.user?.id) {
          console.log('🚫 WebSocket connection rejected: No session');
          return next(new Error('Unauthorized'));
        }

        // socket에 사용자 정보 저장
        socket.data.userId = session.user.id;
        socket.data.userEmail = session.user.email;
        socket.data.userName = session.user.name;

        console.log(`✅ WebSocket authenticated: ${session.user.email}`);
        next();
      } catch (error) {
        console.error('🚫 WebSocket auth error:', error);
        next(new Error('Authentication failed'));
      }
    });

    io.on('connection', (socket) => {
      console.log(`📡 Client connected: ${socket.id} (${socket.data.userEmail})`);

      // 사용자 룸 자동 참여 (클라이언트 입력 무시)
      const userId = socket.data.userId;
      socket.join(`user-${userId}`);
      console.log(`👤 Auto-joined user room: user-${userId}`);

      // 프로젝트 룸 참여 - 멤버십 확인
      socket.on('join-project', async (projectId: string) => {
        try {
          const project = await ProjectService.getProject(projectId);

          if (!project) {
            socket.emit('error', { message: 'Project not found' });
            return;
          }

          const isMember = project.members.some(m => m.id === userId);

          if (isMember) {
            socket.join(`project-${projectId}`);
            console.log(`✅ ${socket.data.userEmail} joined project-${projectId}`);
            socket.emit('project-joined', { projectId });
          } else {
            console.log(`🚫 ${socket.data.userEmail} denied access to project-${projectId}`);
            socket.emit('error', { message: 'Access denied to project' });
          }
        } catch (error) {
          console.error('Error joining project:', error);
          socket.emit('error', { message: 'Failed to join project' });
        }
      });

      socket.on('leave-project', (projectId: string) => {
        socket.leave(`project-${projectId}`);
        console.log(`👋 ${socket.data.userEmail} left project-${projectId}`);
      });

      socket.on('disconnect', () => {
        console.log(`📡 Client disconnected: ${socket.id} (${socket.data.userEmail})`);
      });
    });

    res.socket.server.io = io;
  }
  res.end();
};

export default SocketHandler;
```

**클라이언트 업데이트**
```typescript
// hooks/useSocket.ts
import { useSession } from 'next-auth/react';

export function useSocket() {
  const { data: session, status } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // 인증되지 않았으면 연결하지 않음
    if (status !== 'authenticated' || !session?.user) {
      return;
    }

    const socketIo = io({
      path: '/api/socketio',
      withCredentials: true, // 쿠키 전송
    });

    socketIo.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketIo.on('error', (error) => {
      console.error('WebSocket error:', error);
      toast.error(error.message || 'Connection error');
    });

    setSocket(socketIo);

    return () => {
      socketIo.disconnect();
    };
  }, [session, status]);

  return socket;
}
```

**테스트**
```typescript
// __tests__/websocket-auth.test.ts
import { io } from 'socket.io-client';

describe('WebSocket Authentication', () => {
  it('should reject unauthenticated connections', (done) => {
    const socket = io('http://localhost:3000', {
      path: '/api/socketio',
    });

    socket.on('connect_error', (error) => {
      expect(error.message).toContain('Unauthorized');
      socket.disconnect();
      done();
    });
  });

  it('should allow authenticated connections', (done) => {
    // Mock authenticated request
    const socket = io('http://localhost:3000', {
      path: '/api/socketio',
      auth: { sessionToken: 'valid-token' },
    });

    socket.on('connect', () => {
      expect(socket.connected).toBe(true);
      socket.disconnect();
      done();
    });
  });
});
```

---

#### Step 4-5: 환경 변수 & CORS

**4일차 작업**

```typescript
// lib/env-validation.ts (새 파일)
export function validateEnv() {
  const errors: string[] = [];

  // 필수 환경 변수
  const required = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }

  // NEXTAUTH_SECRET 검증
  const secret = process.env.NEXTAUTH_SECRET;
  if (secret) {
    if (secret.length < 32) {
      errors.push('NEXTAUTH_SECRET must be at least 32 characters long');
    }

    const unsafeSecrets = [
      'your-secret-key-here-change-in-production',
      'secret',
      'changeme',
      'password',
    ];

    if (unsafeSecrets.some(unsafe => secret.toLowerCase().includes(unsafe))) {
      errors.push('NEXTAUTH_SECRET is using an unsafe default value');
    }
  }

  // 프로덕션 환경 추가 검증
  if (process.env.NODE_ENV === 'production') {
    if (process.env.NEXTAUTH_URL?.includes('localhost')) {
      errors.push('NEXTAUTH_URL should not use localhost in production');
    }

    if (!process.env.ALLOWED_ORIGINS) {
      errors.push('ALLOWED_ORIGINS must be set in production');
    }
  }

  if (errors.length > 0) {
    console.error('❌ Environment validation failed:');
    errors.forEach(error => console.error(`   - ${error}`));
    throw new Error('Environment validation failed');
  }

  console.log('✅ Environment validation passed');
}
```

**적용**
```typescript
// pages/_app.tsx
import { validateEnv } from '@/lib/env-validation';

// 서버 사이드에서만 실행
if (typeof window === 'undefined') {
  validateEnv();
}

function MyApp({ Component, pageProps }: AppProps) {
  // ...
}
```

**.env.example 업데이트**
```bash
# Application
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# WebSocket
NEXT_PUBLIC_WS_URL=http://localhost:3000

# Authentication (NextAuth.js)
NEXTAUTH_URL=http://localhost:3000
# Generate a secure secret: openssl rand -base64 32
NEXTAUTH_SECRET=REPLACE_WITH_SECURE_RANDOM_STRING_AT_LEAST_32_CHARACTERS

# CORS (comma-separated origins)
ALLOWED_ORIGINS=http://localhost:3000

# Database (SQLite)
DATABASE_URL=file:./data/kanban.db

# Monitoring (Optional)
SENTRY_DSN=
```

**CORS 업데이트**
```typescript
// pages/api/websocket.ts
cors: {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ["GET", "POST"],
  credentials: true
}
```

---

### 배포 전 체크리스트

#### 보안 체크리스트

- [ ] 모든 API 라우트에 인증 추가
- [ ] 모든 비밀번호 해시 확인
- [ ] WebSocket 인증 동작 확인
- [ ] 환경 변수 검증 동작 확인
- [ ] CORS 설정 확인
- [ ] 에러 메시지에 민감 정보 미포함 확인
- [ ] 입력 검증 추가
- [ ] SQL 인젝션 방지 (Drizzle ORM 사용)
- [ ] XSS 방지 (React 기본 이스케이핑 + DOMPurify 고려)
- [ ] CSRF 방지 (NextAuth.js 기본 지원)

#### 기능 체크리스트

- [ ] 로그인/회원가입 동작
- [ ] 카드 생성/수정/삭제 동작
- [ ] 카드 드래그앤드롭 동작
- [ ] 프로젝트 생성/수정/삭제 동작
- [ ] 멤버 초대/승인/제거 동작
- [ ] 실시간 동기화 동작
- [ ] 알림 수신 확인
- [ ] 필터링 동작
- [ ] 뷰 모드 전환 동작

#### 성능 체크리스트

- [ ] Lighthouse 점수 > 90
- [ ] 페이지 로드 시간 < 3초
- [ ] API 응답 시간 < 200ms
- [ ] WebSocket 연결 시간 < 1초
- [ ] 번들 사이즈 < 500KB

#### 테스트 체크리스트

- [ ] 단위 테스트 통과
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 통과
- [ ] 테스트 커버리지 > 80%
- [ ] 수동 QA 완료

---

## 참고 자료

### 공식 문서

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Socket.IO Documentation](https://socket.io/docs/)
- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

### 보안 가이드

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Headers](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)
- [NextAuth.js Security](https://next-auth.js.org/getting-started/rest-api#security)

### 모범 사례

- [React Best Practices](https://react.dev/learn)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [API Design Best Practices](https://docs.microsoft.com/en-us/azure/architecture/best-practices/api-design)

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|-----|------|----------|
| 1.0 | 2025-10-28 | 초기 작성 |

---

## 문의 및 지원

질문이나 제안 사항이 있으시면 이슈를 생성해 주세요.

**작성자**: Youngjun Lee
**마지막 업데이트**: 2025-10-28
