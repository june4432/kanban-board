# 🚀 실시간 협업 칸반보드

Next.js와 Socket.IO를 활용한 **실시간 협업 칸반보드 시스템**입니다.
팀 프로젝트 관리와 태스크 추적을 위한 완전한 솔루션을 제공합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-green)
![SQLite](https://img.shields.io/badge/SQLite-3-blue)

## ✨ 주요 기능

### 📋 **프로젝트 관리**
- **다중 프로젝트 지원** - 여러 프로젝트를 생성하고 관리
- **프로젝트 공개/비공개 설정** - 팀별 접근 권한 제어
- **프로젝트 멤버 관리** - 멤버 초대, 승인, 제거
- **초대 링크 시스템** - 링크를 통한 간편한 팀원 초대
  - 만료 시간 설정 (시간 단위)
  - 최대 사용 횟수 제한
  - 링크별 사용 현황 추적
- **프로젝트 나가기** - 멤버가 자유롭게 프로젝트 탈퇴 가능
- **프로젝트 설정** - 이름, 설명, 색상 커스터마이징
- **컬럼 관리** - 컬럼 추가, 삭제, 제목 수정, 순서 변경

### 🎯 **칸반보드**
- **드래그 앤 드롭** - 직관적인 카드 이동
- **실시간 동기화** - 팀원들과 실시간 협업
- **WIP 제한** - 컬럼별 작업 진행 카드 수 제한
- **카드 상세 정보** - 설명, 담당자, 라벨, 마일스톤, 체크리스트
- **우선순위 설정** - High, Medium, Low 우선순위
- **마크다운 지원** - 카드 설명에 마크다운 문법 사용

### 🔔 **실시간 알림 시스템**
- **카드 이동 알림** - 프로젝트 멤버에게만 선별적 전송
- **카드 생성/수정 알림** - 실시간 변경사항 공유
- **프로젝트 가입 신청** - 소유자에게 즉시 알림
- **토스트 알림** - 사용자 친화적인 알림 UI

### 📊 **다양한 뷰 모드**
- **칸반 뷰** - 전통적인 칸반보드 형태
- **캘린더 뷰** - 마감일 기준 일정 관리
- **간트 차트 뷰** - 프로젝트 타임라인 시각화
- **매뉴얼 뷰** - 시스템 사용법 안내

### 🔍 **고급 필터링**
- **텍스트 검색** - 카드 제목/내용 검색
- **라벨 필터링** - 특정 라벨의 카드만 표시
- **담당자 필터링** - 특정 사용자 할당 카드만 표시
- **우선순위 필터링** - 우선순위별 카드 필터링
- **날짜 범위 필터링** - 마감일 기준 필터링

### 👥 **사용자 관리**
- **사용자 인증** - 로그인/회원가입 시스템
- **프로필 관리** - 아바타, 이름, 이메일 설정
- **권한 관리** - 프로젝트 소유자/멤버 구분
- **비밀번호 보안** - bcrypt 해싱을 통한 안전한 저장

## 🛠️ 기술 스택

### **Frontend**
- **Next.js 14** - React 프레임워크
- **TypeScript** - 타입 안정성
- **Tailwind CSS** - 유틸리티 퍼스트 CSS
- **Socket.IO Client** - 실시간 통신
- **Lucide React** - 아이콘 라이브러리

### **Backend**
- **Next.js API Routes** - 서버리스 API
- **Socket.IO** - 실시간 웹소켓 통신
- **SQLite** - 경량 관계형 데이터베이스
- **better-sqlite3** - 동기식 SQLite 드라이버
- **bcryptjs** - 비밀번호 해싱

### **Database**
- **SQLite 3** - 파일 기반 관계형 데이터베이스
- **11개 테이블** - users, projects, boards, cards 등
- **Repository 패턴** - 깔끔한 데이터 접근 계층
- **트랜잭션 지원** - ACID 보장
- **외래키 제약** - 참조 무결성
- **인덱스 최적화** - 빠른 쿼리 성능

### **UI/UX 라이브러리**
- **@hello-pangea/dnd** - 드래그 앤 드롭
- **React Big Calendar** - 캘린더 컴포넌트
- **React Markdown** - 마크다운 렌더링
- **Date-fns** - 날짜 처리
- **Moment.js** - 날짜/시간 관리

### **Testing**
- **Jest** - 단위 테스트 프레임워크
- **87개 테스트** - Repository 및 API 통합 테스트
- **100% 테스트 통과** - 안정적인 코드베이스

## 🚀 설치 및 실행

### **필수 요구사항**
- Node.js 18+
- npm 또는 yarn

### **설치**
```bash
# 저장소 클론
git clone <repository-url>
cd kanban-board

# 의존성 설치
npm install
# 또는
yarn install

# 데이터베이스 초기화 (선택사항 - 자동으로 생성됨)
npm run db:init
```

### **개발 서버 실행**
```bash
npm run dev
# 또는
yarn dev
```

http://localhost:3000에서 애플리케이션에 접근할 수 있습니다.

### **프로덕션 빌드**
```bash
# 빌드
npm run build

# 프로덕션 서버 실행
npm start
```

### **테스트 실행**
```bash
# 모든 테스트 실행
npm test

# 테스트 커버리지 확인
npm run test:coverage

# 특정 테스트만 실행
npm test -- user.repository.test
```

### **데이터 마이그레이션**
기존 JSON 데이터를 SQLite로 이관하려면:
```bash
npm run migrate:to-sqlite
```

## 📁 프로젝트 구조

```
kanban-board/
├── components/           # React 컴포넌트
│   ├── Layout.tsx       # 메인 레이아웃
│   ├── KanbanBoard.tsx  # 칸반보드 컴포넌트
│   ├── CardModal.tsx    # 카드 편집 모달
│   ├── ProjectSelector.tsx # 프로젝트 선택기
│   ├── ProjectQuickSettings.tsx # 프로젝트 설정
│   └── ...
├── contexts/            # React Context
│   ├── AuthContext.tsx  # 인증 상태 관리
│   ├── ProjectContext.tsx # 프로젝트 상태 관리
│   └── ToastContext.tsx # 알림 상태 관리
├── hooks/               # Custom Hooks
│   ├── useKanbanAPI.ts  # 칸반 API 훅
│   ├── useSocket.ts     # WebSocket 훅
│   └── useGlobalWebSocketEvents.ts # 전역 WebSocket 이벤트
├── lib/                 # 데이터베이스 및 비즈니스 로직
│   ├── database.ts      # DB 연결 및 초기화
│   ├── schema.sql       # 데이터베이스 스키마
│   └── repositories/    # Repository 패턴
│       ├── index.ts
│       ├── user.repository.ts
│       ├── project.repository.ts
│       ├── board.repository.ts
│       └── card.repository.ts
├── pages/               # Next.js 페이지
│   ├── api/             # API 라우트
│   │   ├── auth/        # 인증 관련 API
│   │   ├── cards/       # 카드 관련 API
│   │   ├── projects/    # 프로젝트 관련 API
│   │   ├── users/       # 사용자 관련 API
│   │   ├── kanban.ts    # 칸반보드 API
│   │   └── websocket.ts # WebSocket 서버
│   └── index.tsx        # 메인 페이지
├── scripts/             # 유틸리티 스크립트
│   └── migrate-to-sqlite.ts # 데이터 마이그레이션
├── types/               # TypeScript 타입 정의
├── __tests__/           # 테스트 파일
│   ├── api/             # API 통합 테스트
│   ├── repositories/    # Repository 단위 테스트
│   ├── components/      # 컴포넌트 테스트
│   └── services/        # 서비스 테스트
├── data/                # 데이터 저장소
│   ├── kanban.db        # SQLite 데이터베이스
│   └── .backup/         # 백업 파일
└── styles/              # 스타일 파일
```

## 🗄️ 데이터베이스 스키마

### **주요 테이블**

#### 1. users - 사용자
```sql
- id (TEXT, PK)
- name (TEXT)
- email (TEXT, UNIQUE)
- password (TEXT, bcrypt hashed)
- avatar (TEXT)
- role (TEXT)
```

#### 2. projects - 프로젝트
```sql
- project_id (TEXT, PK)
- name (TEXT)
- description (TEXT)
- owner_id (TEXT, FK → users)
- color (TEXT)
- is_public (BOOLEAN)
```

#### 3. project_members - 멤버십
```sql
- id (INTEGER, PK)
- project_id (TEXT, FK → projects)
- user_id (TEXT, FK → users)
- role (TEXT: owner/member)
```

#### 4. boards - 칸반보드
```sql
- board_id (TEXT, PK)
- project_id (TEXT, FK → projects)
```

#### 5. columns - 컬럼
```sql
- id (TEXT, PK)
- board_id (TEXT, FK → boards)
- title (TEXT)
- wip_limit (INTEGER)
- position (INTEGER)
```

#### 6. cards - 카드
```sql
- id (TEXT, PK)
- column_id (TEXT, FK → columns)
- title (TEXT)
- description (TEXT)
- priority (TEXT)
- position (INTEGER)
- due_date (DATETIME)
- milestone_id (TEXT, FK → milestones)
```

#### 7. project_invitations - 초대 링크
```sql
- id (INTEGER, PK)
- project_id (TEXT, FK → projects)
- invite_token (TEXT, UNIQUE)
- created_by (TEXT, FK → users)
- expires_at (DATETIME)
- max_uses (INTEGER)
- current_uses (INTEGER)
- created_at (DATETIME)
```

그 외 6개 테이블: labels, card_labels, card_assignees, milestones, project_join_requests, project_settings

## 🔧 API 엔드포인트

### **인증 관리**
- `POST /api/auth/login` - 로그인
- `POST /api/auth/signup` - 회원가입

### **사용자 관리**
- `GET /api/users` - 사용자 목록 조회

### **프로젝트 관리**
- `GET /api/projects` - 프로젝트 목록 조회
- `GET /api/projects/my` - 내 프로젝트 조회
- `GET /api/projects/public` - 공개 프로젝트 조회
- `GET /api/projects/:projectId` - 특정 프로젝트 조회
- `POST /api/projects` - 새 프로젝트 생성
- `PATCH /api/projects/:projectId` - 프로젝트 설정 수정
- `DELETE /api/projects/:projectId` - 프로젝트 삭제

### **멤버십 관리**
- `POST /api/projects/:projectId/join` - 프로젝트 가입 신청
- `PATCH /api/projects/:projectId/requests/:requestId` - 가입 신청 승인/거부
- `DELETE /api/projects/:projectId/leave` - 프로젝트 나가기
- `DELETE /api/projects/:projectId/members/:userId` - 멤버 제거

### **초대 링크 관리**
- `GET /api/projects/:projectId/invites` - 초대 링크 목록 조회
- `POST /api/projects/:projectId/invites` - 새 초대 링크 생성
- `DELETE /api/projects/:projectId/invites/:inviteId` - 초대 링크 삭제
- `GET /api/invite/:inviteToken` - 초대 링크 정보 조회 및 프로젝트 참여

### **칸반보드 관리**
- `GET /api/kanban?projectId=:projectId` - 칸반보드 조회

### **카드 관리**
- `POST /api/cards` - 새 카드 생성
- `PUT /api/cards/:id` - 카드 수정
- `PUT /api/cards/move` - 카드 이동 (실시간 동기화)
- `DELETE /api/cards/:id` - 카드 삭제

### **실시간 통신**
- `GET /api/websocket` - WebSocket 서버 초기화

## 🎯 실시간 기능

### **WebSocket 이벤트**
- `card-moved` - 카드 이동 이벤트
- `card-created` - 카드 생성 이벤트
- `card-updated` - 카드 수정 이벤트
- `card-deleted` - 카드 삭제 이벤트
- `project-join-request` - 프로젝트 가입 신청
- `project-join-response` - 가입 신청 응답
- `member-joined` - 새 멤버 참여 (초대 링크 사용)

### **룸 기반 통신**
- `user-{userId}` - 사용자별 개인 알림
- `project-{projectId}` - 프로젝트별 그룹 통신

## 🔗 외부 연동

### **Slack 통합**
- **실시간 알림** - 프로젝트 활동을 Slack으로 전송
- **Webhook 설정** - 프로젝트별 Slack Webhook URL 설정
- **이벤트 지원**:
  - 카드 생성 (✅)
  - 카드 이동 (🔄)
  - 카드 수정 (✏️)
  - 카드 삭제 (🗑️)
  - 멤버 참여 (👋)
- **커스터마이징** - 컬러, 아이콘, 메시지 포맷 커스터마이징
- **API**: `POST /api/slack/notify` - Slack 알림 전송

## 🔐 보안 및 권한

### **비밀번호 보안**
- **bcrypt 해싱** - 모든 비밀번호는 bcrypt로 안전하게 해시
- **Salt 라운드** - 10 라운드 해싱으로 보안 강화
- **평문 저장 금지** - 데이터베이스에 평문 비밀번호 저장 안 함

### **데이터베이스 보안**
- **Prepared Statements** - SQL Injection 방지
- **외래키 제약** - 참조 무결성 보장
- **트랜잭션** - ACID 속성 보장
- **WAL Mode** - 동시성 제어

### **프로젝트 권한**
- **소유자 (Owner)**: 모든 권한 (설정 변경, 멤버 관리, 삭제)
- **멤버 (Member)**: 카드 관리, 프로젝트 나가기
- **비회원**: 공개 프로젝트만 조회 가능

### **API 보안**
- 프로젝트별 접근 권한 검증
- 사용자 인증 기반 API 보호
- WebSocket 룸 기반 선별적 데이터 전송

## 🧪 테스트

### **테스트 통계**
```
Test Suites: 8 passed, 8 total
Tests:       87 passed, 87 total
Coverage:    100%
```

### **테스트 종류**

#### Repository 테스트 (48개)
- **UserRepository** (14 tests)
  - 사용자 생성, 조회, 수정, 삭제
  - 비밀번호 검증 (bcrypt)
  - 이메일 중복 체크

- **ProjectRepository** (13 tests)
  - 프로젝트 CRUD
  - 멤버십 관리
  - 가입 신청 처리

- **CardRepository** (15 tests)
  - 카드 CRUD
  - 드래그 앤 드롭
  - WIP limit 체크

- **BoardService** (6 tests)
  - 보드 조회 및 관리

#### API 통합 테스트 (39개)
- **Project CRUD** (10 tests)
  - GET/PATCH/DELETE 엔드포인트
  - 권한 체크

- **Membership** (12 tests)
  - 멤버 추가/제거
  - 프로젝트 나가기

- **Join Requests** (17 tests)
  - 가입 신청 생성
  - 승인/거부 처리
  - WebSocket 이벤트 검증

## 🎨 사용자 인터페이스

### **반응형 디자인**
- 데스크톱, 태블릿, 모바일 최적화
- Tailwind CSS 기반 일관된 디자인 시스템
- **모바일 UX 최적화**:
  - 전체 화면 모달 (모바일)
  - 터치 친화적 버튼 크기
  - 수평 스크롤 탭 네비게이션
  - 반응형 레이아웃 (수직/수평 전환)
  - 텍스트 크기 최적화

### **사용자 경험**
- 직관적인 드래그 앤 드롭 인터페이스
- 실시간 피드백과 로딩 상태
- 접근성을 고려한 키보드 네비게이션

### **테마 및 커스터마이징**
- 프로젝트별 색상 테마
- 다크/라이트 모드 (향후 추가 예정)

## 📈 성능 최적화

### **데이터베이스 최적화**
- **인덱스**: 자주 조회되는 컬럼에 인덱스 적용
- **Prepared Statements**: 쿼리 성능 향상
- **WAL Mode**: 동시 읽기/쓰기 성능 개선
- **트랜잭션**: 복잡한 작업을 원자적으로 처리

### **애플리케이션 최적화**
- **옵티미스틱 업데이트**: 즉시 UI 반영 후 서버 동기화
- **이벤트 중복 제거**: 동일 이벤트 중복 처리 방지
- **선별적 리렌더링**: 필요한 컴포넌트만 업데이트
- **지연 로딩**: 필요할 때만 컴포넌트 로드

## 🚀 배포

### **Vercel 배포** (권장)
```bash
# Vercel CLI 설치
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

**참고**: SQLite 데이터베이스 파일은 배포 시 포함되지만, Vercel의 서버리스 환경에서는 쓰기 작업이 제한될 수 있습니다. 프로덕션 환경에서는 PostgreSQL 또는 MySQL로 마이그레이션을 권장합니다.

### **기타 플랫폼**
- **Netlify**: `npm run build` 후 `out` 폴더 배포
- **Docker**: Dockerfile을 통한 컨테이너 배포
- **VPS**: PM2를 사용한 프로세스 관리

## 🧪 개발 도구

### **코드 품질**
```bash
# ESLint 실행
npm run lint

# 타입 체크
npx tsc --noEmit

# 테스트 실행
npm test

# 테스트 커버리지
npm run test:coverage
```

### **디버깅**
- 브라우저 개발자 도구에서 WebSocket 이벤트 로그 확인
- 콘솔 로그를 통한 상태 추적
- Jest 테스트를 통한 단위 테스트

## 📚 문서

- **[SQLite 마이그레이션 계획서](docs/DB_MIGRATION_PLAN.md)** - 데이터베이스 마이그레이션 상세 계획
- **[API 문서](docs/API.md)** - REST API 엔드포인트 상세 설명 (향후 추가)
- **[컴포넌트 가이드](docs/COMPONENTS.md)** - 컴포넌트 사용법 (향후 추가)

## 🤝 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

### **코딩 컨벤션**
- TypeScript 사용
- ESLint 규칙 준수
- 테스트 코드 작성 필수
- 커밋 메시지는 명확하게 작성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙋‍♂️ 지원

문제가 발생하거나 질문이 있으시면 [Issues](https://github.com/your-repo/issues)를 통해 문의해 주세요.

---

**Made with ❤️ by Youngjun Lee**

> 실시간 협업을 통해 팀의 생산성을 높이는 칸반보드 시스템
