# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 프로젝트 개요

Next.js 14, TypeScript, Socket.IO로 구축된 **실시간 협업 칸반보드 시스템**입니다. 다중 프로젝트 지원, 실시간 카드 동기화, 파일 시스템 기반 JSON 데이터 저장소를 사용합니다.

## 개발 명령어

### 필수 명령어
```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드
npm start        # 프로덕션 서버 실행
npm run lint     # ESLint 실행
npx tsc --noEmit # 타입 체크 (파일 생성 없이)
```

## 아키텍처 개요

### 실시간 통신 패턴

이 애플리케이션은 **이중 채널 실시간 아키텍처**를 사용합니다:

1. **WebSocket 서버** (`pages/api/websocket.ts`):
   - Next.js API 라우트를 통해 Socket.IO 서버 초기화
   - 경로: `/api/socketio`
   - 룸 기반 통신: 개별 사용자용 `user-{userId}`, 프로젝트 그룹용 `project-{projectId}`

2. **API 라우트 브로드캐스트 패턴** (`pages/api/cards/move.ts` 등):
   - API 엔드포인트가 HTTP 요청 처리 + Socket.IO 이벤트 발행을 동시에 수행
   - `res.socket.server.io`를 통해 `io` 서버에 접근
   - 특정 룸으로 이벤트 발행 (예: `project-{projectId}`)

3. **클라이언트 측 이벤트 처리** (`hooks/useKanbanAPI.ts`):
   - 낙관적 UI 업데이트 (로컬 상태 즉시 업데이트)
   - WebSocket 리스너가 다른 사용자의 변경사항 동기화
   - `processedEvents` Set과 이벤트 키를 사용한 중복 이벤트 방지
   - **중요**: 현재 사용자가 발생시킨 이벤트인 경우 로컬 상태 업데이트 건너뛰기

### 상태 관리 아키텍처

1. **전역 컨텍스트** (`contexts/`):
   - `AuthContext.tsx`: 사용자 인증 상태 (로그인, 로그아웃, 현재 사용자)
   - `ProjectContext.tsx`: 현재 프로젝트 선택 및 프로젝트 목록
   - `ToastContext.tsx`: 토스트 알림 시스템

2. **커스텀 훅** (`hooks/`):
   - `useKanbanAPI.ts`: 메인 칸반 로직 - 보드 상태, CRUD 작업, WebSocket 이벤트 핸들러
   - `useSocket.ts`: WebSocket 연결 관리, 룸 입장/퇴장, 이벤트 발행
   - `useGlobalWebSocketEvents.ts`: 전역 WebSocket 이벤트 (프로젝트 가입 요청, 알림)
   - `useKanban.ts`: 추가 칸반 유틸리티 및 필터링 로직

3. **데이터 흐름 패턴**:
   ```
   사용자 액션 → API 호출 (HTTP) → 서버가 JSON 업데이트 → 서버가 Socket 이벤트 발행 →
   다른 클라이언트가 이벤트 수신 → 로컬 상태 업데이트
   ```

### 파일 기반 데이터 저장소

모든 데이터는 `data/` 디렉토리의 JSON 파일로 저장됩니다:
- `kanban-boards.json`: 보드 컬럼, 카드, 라벨, 마일스톤 (`projectId`로 키잉)
- `projects.json`: 프로젝트 메타데이터, 멤버, 가입 요청
- `users.json`: 사용자 계정, 프로필

**중요사항**:
- 데이터베이스 없음 - Node.js `fs` 모듈을 통한 직접 파일 시스템 읽기/쓰기
- 데이터 구조는 보드와 프로젝트 간 연결 키로 `projectId` 사용
- API 라우트가 파일 잠금 및 동시 접근 처리

### 타입 시스템 (`types/index.ts`)

주요 타입 관계:
- `Project`는 `projectId`를 가지며, `members: User[]`, `pendingRequests: ProjectJoinRequest[]` 포함
- `Board`는 `boardId`와 `projectId`(프로젝트 연결)를 가지며, `columns: Column[]` 포함
- `Column`은 `cards: Card[]`를 포함하고, `wipLimit: number` 보유
- `Card`는 `columnId`, `assignees: string[]`(사용자 ID), `labels: Label[]`, `milestone?: Milestone` 보유

## 컴포넌트 아키텍처

### 주요 컴포넌트

1. **Layout.tsx**: 네비게이션, 프로젝트 선택기, 뷰 모드 전환기가 있는 메인 애플리케이션 쉘
2. **KanbanBoard.tsx**: 드래그 앤 드롭과 함께 KanbanColumn 컴포넌트들을 통합하는 컨테이너 컴포넌트
3. **CardModal.tsx**: 마크다운 지원, 담당자, 라벨, 마일스톤, 체크리스트가 있는 카드 편집 모달
4. **ProjectSelector.tsx**: 프로젝트 목록, 생성, 가입 요청, 공개 프로젝트 탐색을 처리하는 복잡한 컴포넌트
5. **ProjectQuickSettings.tsx**: 프로젝트 설정 드롭다운 (멤버, 요청, 설정 모달 트리거)
6. **CalendarView.tsx / GanttView.tsx**: react-big-calendar를 사용한 대체 뷰
7. **GlobalWebSocketManager.tsx**: 전역 WebSocket 이벤트 처리 (_app.tsx에 마운트됨)

### 드래그 앤 드롭

`@hello-pangea/dnd` 라이브러리 사용:
- KanbanBoard.tsx의 `<DragDropContext>`
- 컬럼용 `<Droppable>`
- 카드용 `<Draggable>`
- `onDragEnd` 핸들러가 WebSocket 이벤트를 발행하는 `moveCard` API 호출

## API 엔드포인트 구조

### 카드 (`pages/api/cards/`)
- `POST /api/cards` - 카드 생성 (`card-created` 이벤트 발행)
- `PUT /api/cards/[id]` - 카드 수정 (`card-updated` 이벤트 발행)
- `DELETE /api/cards/[id]` - 카드 삭제
- `PUT /api/cards/move` - 실시간 브로드캐스트와 함께 카드 이동 (`project-{projectId}` 룸에 `card-moved` 발행)

### 프로젝트 (`pages/api/projects/`)
- `GET /api/projects` - 모든 프로젝트 목록
- `GET /api/projects/my` - 사용자의 프로젝트 (소유 + 멤버)
- `GET /api/projects/public` - 공개 프로젝트 목록
- `POST /api/projects` - 새 프로젝트 생성
- `PATCH /api/projects/[projectId]` - 프로젝트 설정 수정
- `POST /api/projects/[projectId]/join` - 프로젝트 가입 요청 (소유자에게 알림 발행)
- `PATCH /api/projects/[projectId]/requests/[requestId]` - 가입 요청 승인/거부
- `DELETE /api/projects/[projectId]/leave` - 프로젝트 나가기
- `DELETE /api/projects/[projectId]/members/[memberId]` - 멤버 제거 (소유자만)

### 보드
- `GET /api/kanban` - 모든 보드 조회
- `GET /api/kanban?projectId={id}` - 특정 프로젝트의 보드 조회

### 인증 (`pages/api/auth/`)
- `POST /api/auth/login` - 사용자 로그인
- `POST /api/auth/signup` - 사용자 회원가입

## 핵심 구현 세부사항

### WebSocket 이벤트 중복 제거

`useKanbanAPI.ts`에서 card-moved 이벤트는 중복 제거를 사용합니다:
```typescript
const eventKey = `card-moved-${data.card.id}-${data.user.id}-${data.fromColumn}-${data.toColumn}`;
if (processedEvents.current.has(eventKey)) return;
processedEvents.current.add(eventKey);
// 5초 후 정리
```

### 낙관적 업데이트 패턴

사용자가 액션을 수행할 때:
1. 로컬 상태를 즉시 업데이트
2. API 엔드포인트 호출
3. API가 다른 사용자들에게 WebSocket 이벤트 발행
4. 현재 사용자의 WebSocket 핸들러가 `if (data.user.id !== currentUser.id)` 체크 후 업데이트

### 프로젝트-멤버 관계

- 프로젝트는 UI 편의를 위해 멤버를 `User[]`로 저장
- API 엔드포인트가 `ProjectMember[]`(role/joinedAt 포함)와 `User[]` 간 변환
- 소유자 체크: `project.ownerId === user.id`
- 멤버 체크: `project.members.some(m => m.id === user.id)`

## 설정

### Next.js 설정
- `reactStrictMode: false` - 개발 모드에서 WebSocket 이중 연결 방지를 위해 비활성화
- `swcMinify: true` - 더 빠른 빌드를 위해 SWC 사용

### TypeScript
- `target: "es5"` - 광범위한 브라우저 호환성
- 경로 별칭: `@/*`가 프로젝트 루트에 매핑
- Strict 모드 활성화

### Socket.IO
- 경로: `/api/socketio`
- localhost:3000(개발) 및 프로덕션 도메인에 대한 CORS 설정
- 전송: WebSocket 및 폴링 폴백

## 공통 패턴

### 현재 사용자 가져오기
```typescript
const getCurrentUser = () => {
  const storedUser = localStorage.getItem('user');
  return storedUser ? JSON.parse(storedUser) : { id: '', name: 'Anonymous' };
};
```

### API 라우트에서 이벤트 브로드캐스트
```typescript
const io = res.socket.server.io;
io.to(`project-${projectId}`).emit('card-moved', {
  card,
  user: currentUser,
  fromColumn,
  toColumn,
  destinationIndex
});
```

### 클라이언트에서 룸 입장
```typescript
const { joinProject } = useSocket();
useEffect(() => {
  if (projectId && isConnected) {
    joinProject(projectId);
  }
}, [projectId, isConnected]);
```

## 스타일링

- 모든 스타일링에 **Tailwind CSS** 사용
- 커스텀 토스트 알림 시스템 (외부 라이브러리 미사용)
- 모바일 고려한 반응형 디자인
- `project.color` 필드를 통한 프로젝트 색상 테마

## 중요 참고사항

1. **React Strict Mode가 꺼져있음**: 이중 렌더링이 WebSocket 연결 문제를 일으킴
2. **외부 데이터베이스 없음**: 모든 지속성은 JSON 파일을 통해 - 동시 쓰기 주의
3. **사용자 컨텍스트 지속성**: 사용자는 localStorage에 저장됨 (HTTP-only 쿠키 아님)
4. **이벤트 룸 타겟팅**: 항상 특정 룸(`project-{id}` 또는 `user-{id}`)으로 발행, 절대 전역 브로드캐스트 금지
5. **뷰 모드**: 애플리케이션은 4가지 뷰 모드 지원 - kanban(기본), calendar, gantt, manual
6. **WIP 제한**: 컬럼에는 진행 중인 작업 제한이 있음 (현재 코드에서는 강제되지 않음)
