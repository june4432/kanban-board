# Firebase 마이그레이션 가이드

## 📋 목차
1. [Firebase 개요](#firebase-개요)
2. [질문에 대한 답변](#질문에-대한-답변)
3. [SQLite vs Firebase 비교](#sqlite-vs-firebase-비교)
4. [마이그레이션 장단점](#마이그레이션-장단점)
5. [구체적인 마이그레이션 전략](#구체적인-마이그레이션-전략)
6. [비용 분석](#비용-분석)
7. [추천 사항](#추천-사항)

---

## 🔥 Firebase 개요

Firebase는 Google의 모바일 및 웹 애플리케이션 개발 플랫폼으로, 백엔드 인프라를 쉽게 구축할 수 있게 해주는 BaaS(Backend as a Service)입니다.

### 주요 서비스

#### 1. **Firebase Hosting** ⭐
- **정적 호스팅**: HTML, CSS, JS, Next.js 빌드 파일 호스팅
- **글로벌 CDN**: 전 세계 어디서나 빠른 속도
- **자동 SSL**: HTTPS 무료 제공
- **커스텀 도메인**: 자신의 도메인 연결 가능

#### 2. **Firestore Database** (NoSQL)
- **실시간 동기화**: 클라이언트 간 자동 동기화
- **오프라인 지원**: 오프라인 모드 자동 처리
- **스케일링**: 자동으로 확장됨
- **쿼리**: 복잡한 쿼리 지원

#### 3. **Firebase Authentication**
- **다양한 인증**: Email, Google, GitHub 등
- **토큰 관리**: JWT 자동 처리
- **보안 규칙**: 세밀한 권한 제어

#### 4. **Firebase Functions** (서버리스)
- **Node.js 백엔드**: 서버 없이 백엔드 로직 실행
- **트리거**: DB 변경, HTTP 요청 등에 반응
- **자동 스케일링**: 트래픽에 따라 자동 조정

#### 5. **Firebase Storage**
- **파일 저장소**: 이미지, 동영상 등 파일 저장
- **보안 규칙**: 권한 기반 접근 제어

---

## ❓ 질문에 대한 답변

### Q1: Firebase로 정적 호스팅이 가능한가?
**✅ 네, 가능합니다!**

Firebase Hosting은 정적 사이트 호스팅에 최적화되어 있습니다.

**Next.js 지원**:
- Static Export (`next export`) 지원
- SSR은 Firebase Functions와 조합 필요
- ISR(Incremental Static Regeneration)은 제한적 지원

**호스팅 방법**:
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init hosting

# Next.js 빌드
npm run build

# 배포
firebase deploy --only hosting
```

**Next.js 설정** (`next.config.js`):
```javascript
module.exports = {
  output: 'export',  // Static export 활성화
  images: {
    unoptimized: true  // Firebase Hosting에서 이미지 최적화 비활성화
  }
}
```

---

### Q2: AWS Amplify처럼 자동 빌드/배포가 가능한가?
**✅ 네, 가능합니다!**

Firebase는 **GitHub Actions**를 통해 Amplify와 동일한 CI/CD 기능을 제공합니다.

#### 방법 1: Firebase Hosting GitHub Actions (공식)

**설정**:
```bash
firebase init hosting:github
```

이 명령어를 실행하면 자동으로 `.github/workflows/` 폴더에 다음 파일들이 생성됩니다:

**`.github/workflows/firebase-hosting-merge.yml`** (메인 브랜치 배포):
```yaml
name: Deploy to Firebase Hosting on merge
on:
  push:
    branches:
      - main
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: your-project-id
```

**`.github/workflows/firebase-hosting-pull-request.yml`** (PR 미리보기):
```yaml
name: Deploy to Firebase Hosting on PR
on: pull_request
jobs:
  build_and_preview:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          projectId: your-project-id
```

**특징**:
- ✅ main 브랜치 푸시 시 자동 배포
- ✅ PR 생성 시 미리보기 URL 자동 생성
- ✅ PR 코멘트에 미리보기 링크 추가
- ✅ Amplify와 동일한 워크플로우

#### 방법 2: 커스텀 GitHub Actions

더 세밀한 제어가 필요하다면 직접 작성:
```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run lint

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: '${{ secrets.GITHUB_TOKEN }}'
          firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
          channelId: live
          projectId: kanban-board-app
```

**Amplify vs Firebase CI/CD 비교**:

| 기능 | AWS Amplify | Firebase Hosting |
|------|-------------|------------------|
| 자동 빌드 | ✅ (자체 CI/CD) | ✅ (GitHub Actions) |
| PR 미리보기 | ✅ | ✅ |
| 브랜치별 배포 | ✅ | ✅ |
| 커스텀 도메인 | ✅ | ✅ |
| 환경 변수 | ✅ | ✅ (GitHub Secrets) |
| 빌드 로그 | ✅ | ✅ |
| 롤백 | ✅ | ✅ |
| 설정 난이도 | 쉬움 | 보통 (GitHub Actions 이해 필요) |

---

## ⚖️ SQLite vs Firebase 비교

### 현재 시스템 (SQLite + Next.js API Routes)

**아키텍처**:
```
Client → Next.js API Routes → SQLite (로컬 파일)
         ↓
    Socket.IO (실시간)
```

**장점**:
- ✅ 설정 간단 (파일 기반)
- ✅ 관계형 데이터베이스 (ACID 보장)
- ✅ SQL 쿼리 사용 가능
- ✅ 트랜잭션 지원
- ✅ 외래키 제약조건
- ✅ 무료 (서버 비용만)
- ✅ 데이터 완전 통제

**단점**:
- ❌ 파일 기반 (서버리스 환경에서 쓰기 제한)
- ❌ 실시간 동기화 직접 구현 필요 (Socket.IO)
- ❌ 스케일링 어려움
- ❌ 백업/복구 수동 관리
- ❌ 다중 서버 환경에서 동기화 어려움
- ❌ Vercel 같은 서버리스에서 데이터 영속성 문제

**현재 문제점**:
README.md에서 언급:
> "SQLite 데이터베이스 파일은 배포 시 포함되지만, Vercel의 서버리스 환경에서는 쓰기 작업이 제한될 수 있습니다."

---

### Firebase (Firestore + Firebase Hosting)

**아키텍처**:
```
Client → Firestore SDK (직접 연결)
         ↓
    실시간 리스너 (내장)
```

**장점**:
- ✅ 실시간 동기화 자동 (Socket.IO 불필요)
- ✅ 오프라인 지원 내장
- ✅ 자동 스케일링
- ✅ 서버리스 친화적
- ✅ 글로벌 CDN (빠른 속도)
- ✅ 자동 백업
- ✅ 보안 규칙 (세밀한 권한 제어)
- ✅ 무료 할당량 제공
- ✅ 다중 플랫폼 지원 (웹, iOS, Android)

**단점**:
- ❌ NoSQL (관계형 → 비관계형 전환 필요)
- ❌ 복잡한 쿼리 제한적
- ❌ JOIN 불가 (비정규화 필요)
- ❌ 트랜잭션 제한적
- ❌ 외래키 없음 (직접 관리)
- ❌ 비용 (읽기/쓰기 횟수 기반)
- ❌ 벤더 종속성 (Lock-in)
- ❌ 로컬 개발 복잡 (에뮬레이터 필요)

---

## 🎯 마이그레이션 장단점

### ✅ Firebase로 마이그레이션하면 좋은 이유

#### 1. **진정한 실시간 협업**
현재는 Socket.IO로 수동 구현했지만, Firebase는 이를 자동으로 처리합니다.

**현재 구조**:
```typescript
// 카드 이동 시 모든 클라이언트에 전송
socket.emit('card-moved', cardData);
// 각 클라이언트에서 수신 후 상태 업데이트
socket.on('card-moved', (data) => {
  updateLocalState(data);
});
```

**Firebase 구조**:
```typescript
// 카드 이동 - Firestore에 저장만 하면 됨
await updateDoc(doc(db, 'cards', cardId), { columnId: newColumnId });

// 모든 클라이언트에서 자동으로 실시간 업데이트
onSnapshot(collection(db, 'cards'), (snapshot) => {
  // 자동으로 최신 데이터 수신
  const cards = snapshot.docs.map(doc => doc.data());
  setCards(cards);
});
```

**효과**:
- Socket.IO 서버 불필요
- 실시간 동기화 코드 80% 감소
- 오프라인 → 온라인 자동 동기화

---

#### 2. **배포 및 호스팅 간소화**

**현재 배포 과정**:
```bash
# Vercel에 배포
vercel deploy

# 문제점:
# - SQLite 쓰기 제한
# - Socket.IO 서버 별도 관리 필요
# - 데이터베이스 파일 영속성 문제
```

**Firebase 배포**:
```bash
# 단일 명령어로 완료
firebase deploy

# 또는 GitHub 푸시만 하면 자동 배포
git push origin main
```

**효과**:
- 인프라 관리 불필요
- 자동 스케일링
- 글로벌 CDN
- 자동 SSL

---

#### 3. **모바일 앱 확장 가능**

Firebase는 웹/iOS/Android 모두 지원하므로, 향후 모바일 앱 개발 시 동일한 백엔드를 사용할 수 있습니다.

---

#### 4. **인증 간소화**

**현재**:
```typescript
// bcrypt로 수동 해싱
const hashedPassword = await bcrypt.hash(password, 10);
// 세션 관리 직접 구현
```

**Firebase Authentication**:
```typescript
// 한 줄로 가입/로그인
await createUserWithEmailAndPassword(auth, email, password);
await signInWithEmailAndPassword(auth, email, password);
// JWT 토큰 자동 관리
```

---

### ❌ Firebase로 마이그레이션하지 않는 게 좋은 이유

#### 1. **데이터 모델 재설계 필요**

현재 SQLite 스키마는 11개 테이블로 관계형 설계:
```sql
users → projects → boards → columns → cards
                  ↓
           project_members
                  ↓
            card_labels, card_assignees
```

**Firestore는 NoSQL**이므로 다음과 같이 재설계 필요:

**컬렉션 구조**:
```
/users/{userId}
/projects/{projectId}
  /members/{memberId}
  /boards/{boardId}
    /columns/{columnId}
      /cards/{cardId}
        /comments/{commentId}
        /attachments/{attachmentId}
```

**비정규화 필요**:
```typescript
// SQLite: 외래키로 관계 관리
card: {
  id: "card1",
  columnId: "col1",  // FK
  assignees: ["user1", "user2"]  // FK array
}

// Firestore: 데이터 중복 저장
card: {
  id: "card1",
  columnId: "col1",
  assignees: ["user1", "user2"],
  assigneeDetails: [  // 중복 저장
    { id: "user1", name: "John", avatar: "..." },
    { id: "user2", name: "Jane", avatar: "..." }
  ]
}
```

**작업량**:
- 모든 Repository 재작성 (7개 파일)
- 모든 API Routes 재작성 (20개 이상)
- 테스트 87개 재작성
- 예상 시간: **2-3주**

---

#### 2. **복잡한 쿼리 제한**

**현재 SQLite 쿼리 예시**:
```sql
-- 특정 프로젝트의 특정 기간 완료 카드 수
SELECT COUNT(*) FROM cards c
JOIN columns col ON c.column_id = col.id
JOIN boards b ON col.board_id = b.board_id
WHERE b.project_id = ?
  AND col.title = 'Done'
  AND c.updated_at BETWEEN ? AND ?
  AND c.priority = 'high';
```

**Firestore**에서는 이런 복잡한 쿼리가 불가능하거나 매우 비효율적:
```typescript
// 여러 번의 쿼리 필요
const boards = await getDocs(query(collection(db, 'boards'), where('projectId', '==', projectId)));
const columns = await Promise.all(boards.docs.map(/* ... */));
const cards = await Promise.all(columns.map(/* ... */));
// 클라이언트에서 필터링
const filtered = cards.filter(card => /* ... */);
```

---

#### 3. **비용**

**SQLite (현재)**:
- 데이터베이스: **무료** (파일)
- 호스팅: Vercel Free Tier 또는 저렴한 VPS ($5/월)

**Firebase**:
무료 할당량 (Spark Plan):
- 저장소: 1GB
- 문서 읽기: 50,000/일
- 문서 쓰기: 20,000/일
- 삭제: 20,000/일
- 네트워크: 10GB/월

**예상 사용량** (팀 10명, 활발한 사용):
- 읽기: 실시간 리스너로 인해 **100,000+/일**
- 쓰기: 카드 이동, 편집 등 **30,000+/일**

**초과 시 비용** (Blaze Plan):
- 읽기: $0.06 / 100,000건
- 쓰기: $0.18 / 100,000건
- 삭제: $0.02 / 100,000건

**월 예상 비용**:
- 읽기: ((100,000 - 50,000) × 30) / 100,000 × $0.06 = **$0.90**
- 쓰기: ((30,000 - 20,000) × 30) / 100,000 × $0.18 = **$0.54**
- 총: **$1.44 ~ $5/월** (사용량에 따라)

소규모에서는 저렴하지만, **대규모 사용 시 수십~수백 달러 가능**

---

#### 4. **벤더 종속성 (Vendor Lock-in)**

Firebase로 이동하면 Google 생태계에 종속됩니다.
- 다른 플랫폼으로 이동 어려움
- 가격 정책 변경 시 대응 제한

---

## 🚀 구체적인 마이그레이션 전략

Firebase로 마이그레이션을 결정했다면, 다음 전략을 추천합니다.

### Phase 1: 환경 설정 (1일)

#### 1.1 Firebase 프로젝트 생성
```bash
# Firebase CLI 설치
npm install -g firebase-tools

# 로그인
firebase login

# 프로젝트 초기화
firebase init
# 선택: Firestore, Hosting, Functions (선택)
```

#### 1.2 Next.js 프로젝트에 Firebase SDK 추가
```bash
npm install firebase
```

**`lib/firebase.ts`** 생성:
```typescript
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
```

---

### Phase 2: 데이터 모델 설계 (2-3일)

#### Firestore 컬렉션 구조 설계

**컬렉션 계층**:
```
/users/{userId}
  - name, email, avatar, role

/projects/{projectId}
  - name, description, ownerId, color, isPublic
  /members/{userId}  // 서브컬렉션
    - role, joinedAt
  /boards/{boardId}
    - projectId (중복)
    /columns/{columnId}
      - title, wipLimit, position
      /cards/{cardId}
        - title, description, priority, position, dueDate
        - assigneeIds: string[]
        - labelIds: string[]
        - milestoneId: string

/labels/{labelId}
  - projectId, name, color

/milestones/{milestoneId}
  - projectId, name, dueDate, description

/comments/{commentId}
  - cardId, userId, content, createdAt

/attachments/{attachmentId}
  - cardId, fileName, fileUrl, uploadedBy
```

**보안 규칙** (`firestore.rules`):
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자는 자신의 데이터만 읽기/쓰기
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }

    // 프로젝트는 멤버만 접근
    match /projects/{projectId} {
      allow read: if isProjectMember(projectId) || resource.data.isPublic;
      allow write: if isProjectOwner(projectId);

      match /boards/{boardId}/columns/{columnId}/cards/{cardId} {
        allow read: if isProjectMember(projectId);
        allow write: if isProjectMember(projectId);
      }
    }

    function isProjectMember(projectId) {
      return request.auth != null &&
        exists(/databases/$(database)/documents/projects/$(projectId)/members/$(request.auth.uid));
    }

    function isProjectOwner(projectId) {
      return request.auth != null &&
        get(/databases/$(database)/documents/projects/$(projectId)).data.ownerId == request.auth.uid;
    }
  }
}
```

---

### Phase 3: 데이터 마이그레이션 (3-4일)

#### 3.1 마이그레이션 스크립트 작성

**`scripts/migrate-to-firebase.ts`**:
```typescript
import { db as sqliteDb } from '../lib/database';
import { db as firestoreDb } from '../lib/firebase';
import { collection, doc, setDoc, writeBatch } from 'firebase/firestore';

async function migrateUsers() {
  console.log('Migrating users...');
  const users = sqliteDb.prepare('SELECT * FROM users').all();

  const batch = writeBatch(firestoreDb);
  users.forEach((user: any) => {
    const userRef = doc(firestoreDb, 'users', user.id);
    batch.set(userRef, {
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      createdAt: new Date(user.created_at)
    });
  });
  await batch.commit();
  console.log(`✅ Migrated ${users.length} users`);
}

async function migrateProjects() {
  console.log('Migrating projects...');
  const projects = sqliteDb.prepare('SELECT * FROM projects').all();

  for (const project of projects) {
    // 프로젝트 생성
    await setDoc(doc(firestoreDb, 'projects', project.project_id), {
      name: project.name,
      description: project.description,
      ownerId: project.owner_id,
      color: project.color,
      isPublic: project.is_public === 1,
      createdAt: new Date(project.created_at)
    });

    // 멤버 마이그레이션
    const members = sqliteDb.prepare(
      'SELECT * FROM project_members WHERE project_id = ?'
    ).all(project.project_id);

    const batch = writeBatch(firestoreDb);
    members.forEach((member: any) => {
      const memberRef = doc(
        firestoreDb,
        'projects', project.project_id,
        'members', member.user_id
      );
      batch.set(memberRef, {
        role: member.role,
        joinedAt: new Date(member.joined_at)
      });
    });
    await batch.commit();
  }
  console.log(`✅ Migrated ${projects.length} projects`);
}

async function migrateCards() {
  // 유사한 방식으로 카드 마이그레이션
  // ...
}

async function migrate() {
  try {
    await migrateUsers();
    await migrateProjects();
    await migrateCards();
    console.log('🎉 Migration completed!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

migrate();
```

**실행**:
```bash
npx tsx scripts/migrate-to-firebase.ts
```

---

### Phase 4: 코드 재작성 (1-2주)

#### 4.1 Repository 패턴 → Firestore SDK

**기존 `lib/repositories/card.repository.ts`**:
```typescript
export class CardRepository {
  async getCardsByColumnId(columnId: string): Promise<Card[]> {
    const stmt = db.prepare('SELECT * FROM cards WHERE column_id = ?');
    return stmt.all(columnId);
  }

  async createCard(card: Card): Promise<Card> {
    const stmt = db.prepare('INSERT INTO cards ...');
    stmt.run(card);
    return card;
  }
}
```

**Firebase 버전**:
```typescript
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export async function getCardsByColumnId(columnId: string): Promise<Card[]> {
  const q = query(
    collection(db, 'cards'),
    where('columnId', '==', columnId)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Card));
}

export async function createCard(card: Omit<Card, 'id'>): Promise<Card> {
  const docRef = await addDoc(collection(db, 'cards'), card);
  return { id: docRef.id, ...card };
}
```

#### 4.2 실시간 리스너로 Socket.IO 대체

**기존 `hooks/useKanbanAPI.ts`**:
```typescript
// Socket.IO로 실시간 동기화
useEffect(() => {
  socket.on('card-moved', (data) => {
    setColumns(/* update state */);
  });
}, []);
```

**Firebase 버전**:
```typescript
import { onSnapshot, collection } from 'firebase/firestore';

useEffect(() => {
  // 실시간 리스너
  const unsubscribe = onSnapshot(
    collection(db, 'projects', projectId, 'boards', boardId, 'columns'),
    (snapshot) => {
      const updatedColumns = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setColumns(updatedColumns);
    }
  );

  return () => unsubscribe();  // 클린업
}, [projectId, boardId]);
```

**효과**:
- Socket.IO 서버 제거 가능
- `services/websocket.ts` 삭제
- `hooks/useSocket.ts` 삭제
- 코드 라인 수 30% 감소

---

### Phase 5: 배포 설정 (1일)

#### 5.1 Next.js 설정 수정

**`next.config.js`**:
```javascript
module.exports = {
  output: 'export',  // Static export
  images: {
    unoptimized: true
  },
  trailingSlash: true
}
```

#### 5.2 Firebase 호스팅 설정

**`firebase.json`**:
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

#### 5.3 GitHub Actions 설정

```bash
firebase init hosting:github
```

**`.github/workflows/firebase-hosting-merge.yml`** 자동 생성됨

---

### Phase 6: 테스트 (3-5일)

- 모든 기능 E2E 테스트
- 실시간 동기화 검증
- 보안 규칙 테스트
- 성능 테스트

---

## 💰 비용 분석

### Firestore 요금제

#### Spark Plan (무료)
- 저장소: 1GB
- 문서 읽기: 50,000/일
- 문서 쓰기: 20,000/일
- 네트워크: 10GB/월

**적합한 규모**:
- 사용자 10명 이하
- 일일 활동 낮음

#### Blaze Plan (종량제)
**기본 무료 할당** (Spark와 동일) + 초과분 과금

**가격** (미국 기준):
- 저장소: $0.18/GB/월
- 읽기: $0.06 / 100,000건
- 쓰기: $0.18 / 100,000건
- 삭제: $0.02 / 100,000건
- 네트워크: $0.12/GB

**예상 비용 시나리오**:

**시나리오 1: 소규모 팀 (5명)**
- 읽기: 30,000/일 → 무료 범위 내
- 쓰기: 10,000/일 → 무료 범위 내
- **월 비용: $0**

**시나리오 2: 중규모 팀 (20명)**
- 읽기: 150,000/일 → (150,000 - 50,000) × 30 / 100,000 × $0.06 = **$1.80**
- 쓰기: 50,000/일 → (50,000 - 20,000) × 30 / 100,000 × $0.18 = **$1.62**
- 저장소: 2GB → (2 - 1) × $0.18 = **$0.18**
- **월 비용: ~$3.60**

**시나리오 3: 대규모 (100명)**
- 읽기: 500,000/일 → (500,000 - 50,000) × 30 / 100,000 × $0.06 = **$8.10**
- 쓰기: 200,000/일 → (200,000 - 20,000) × 30 / 100,000 × $0.18 = **$9.72**
- 저장소: 10GB → (10 - 1) × $0.18 = **$1.62**
- **월 비용: ~$19.44**

### 비용 최적화 팁

1. **읽기 최소화**:
```typescript
// ❌ 나쁜 예: 매번 전체 컬렉션 읽기
const cards = await getDocs(collection(db, 'cards'));

// ✅ 좋은 예: 필요한 것만 쿼리
const cards = await getDocs(query(
  collection(db, 'cards'),
  where('projectId', '==', projectId),
  limit(20)
));
```

2. **실시간 리스너 제한**:
```typescript
// 필요한 경우에만 리스너 활성화
useEffect(() => {
  if (!isActive) return;
  const unsubscribe = onSnapshot(/* ... */);
  return unsubscribe;
}, [isActive]);
```

3. **클라이언트 캐싱**:
```typescript
import { enableIndexedDbPersistence } from 'firebase/firestore';
enableIndexedDbPersistence(db);  // 오프라인 캐시
```

---

## 🎯 추천 사항

### ✅ Firebase로 마이그레이션을 추천하는 경우

1. **서버리스 환경에서 운영하고 싶을 때**
   - Vercel, Netlify 등에서 데이터베이스 쓰기 문제 해결

2. **실시간 협업이 핵심 기능일 때**
   - Socket.IO 서버 관리 부담 제거
   - 오프라인 동기화 자동 처리

3. **빠르게 확장할 계획이 있을 때**
   - 자동 스케일링
   - 인프라 관리 불필요

4. **모바일 앱 확장 계획이 있을 때**
   - 웹/iOS/Android 동일 백엔드 사용

5. **개발 속도를 높이고 싶을 때**
   - 백엔드 인프라 관리 시간 절약

---

### ❌ SQLite를 유지하는 것이 좋은 경우

1. **복잡한 관계형 쿼리가 많을 때**
   - JOIN, 트랜잭션이 필수적인 경우

2. **데이터 완전 통제가 필요할 때**
   - 벤더 종속 우려
   - 데이터 주권 중요

3. **비용이 중요한 고려사항일 때**
   - 무료로 운영하고 싶은 경우
   - 대규모 읽기/쓰기 발생 예상

4. **자체 서버 운영 가능할 때**
   - VPS, AWS EC2 등에서 운영
   - SQLite 쓰기 제한 없음

5. **학습/프로토타입 단계일 때**
   - 빠른 개발 및 테스트
   - 나중에 PostgreSQL/MySQL로 전환 가능

---

## 🚀 추천 하이브리드 접근법

**가장 현실적인 옵션**: PostgreSQL/MySQL + Vercel/Railway

### Option A: Vercel + Vercel Postgres
```bash
# Vercel Postgres 추가 (무료 할당량)
vercel postgres create
```

**장점**:
- SQLite와 유사한 SQL 사용
- Vercel과 완벽 통합
- 무료 할당량: 60시간 컴퓨팅, 256MB 스토리지
- 쓰기 제한 없음

**마이그레이션**:
- SQLite → PostgreSQL (스키마 거의 동일)
- Repository 코드 거의 수정 불필요

---

### Option B: Railway + PostgreSQL
```bash
# Railway에 PostgreSQL 배포
railway init
railway add postgresql
```

**장점**:
- 무료 $5 크레딧/월
- GitHub 자동 배포 지원
- 데이터베이스 + 백엔드 모두 호스팅

---

### Option C: PlanetScale (MySQL)
- 서버리스 MySQL
- 무료 티어: 5GB 스토리지
- 브랜치 기능 (개발/프로덕션 분리)

---

## 📋 최종 결론

### 현재 상황에서의 최선의 선택

**단기적 (1-2개월)**:
1. **Vercel + Vercel Postgres**로 마이그레이션
   - 작업량: 2-3일 (SQLite → PostgreSQL은 간단)
   - 비용: 무료 (소규모)
   - 효과: Vercel 서버리스 쓰기 문제 해결

2. Socket.IO는 유지
   - 현재 잘 작동 중
   - 리팩토링 불필요

**장기적 (6개월+)**:
- 사용자 증가 시 Firebase/Supabase 고려
- 실시간 기능이 더 중요해지면 Firebase
- 비용 최적화 필요 시 자체 서버 + PostgreSQL

---

## 🔗 참고 자료

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 가격 계산기](https://firebase.google.com/pricing)
- [Next.js + Firebase 가이드](https://firebase.google.com/docs/hosting/nextjs)
- [Firebase GitHub Actions](https://github.com/marketplace/actions/deploy-to-firebase-hosting)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)

---

**문서 작성일**: 2025-11-02
**작성자**: Claude Code Analysis
**버전**: 1.0
