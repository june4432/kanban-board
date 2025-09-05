# 🚀 실시간 협업 칸반보드

Next.js와 Socket.IO를 활용한 **실시간 협업 칸반보드 시스템**입니다. 
팀 프로젝트 관리와 태스크 추적을 위한 완전한 솔루션을 제공합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8.1-green)

## ✨ 주요 기능

### 📋 **프로젝트 관리**
- **다중 프로젝트 지원** - 여러 프로젝트를 생성하고 관리
- **프로젝트 공개/비공개 설정** - 팀별 접근 권한 제어
- **프로젝트 멤버 관리** - 멤버 초대, 승인, 제거
- **프로젝트 나가기** - 멤버가 자유롭게 프로젝트 탈퇴 가능
- **프로젝트 설정** - 이름, 설명, 색상 커스터마이징

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
- **File System DB** - JSON 파일 기반 데이터 저장

### **UI/UX 라이브러리**
- **@hello-pangea/dnd** - 드래그 앤 드롭
- **React Big Calendar** - 캘린더 컴포넌트
- **React Markdown** - 마크다운 렌더링
- **Date-fns** - 날짜 처리
- **Moment.js** - 날짜/시간 관리

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
├── pages/               # Next.js 페이지
│   ├── api/             # API 라우트
│   │   ├── cards/       # 카드 관련 API
│   │   ├── projects/    # 프로젝트 관련 API
│   │   ├── users/       # 사용자 관련 API
│   │   └── websocket.ts # WebSocket 서버
│   └── index.tsx        # 메인 페이지
├── types/               # TypeScript 타입 정의
├── data/                # JSON 데이터 파일
│   ├── kanban-boards.json # 칸반보드 데이터
│   ├── projects.json    # 프로젝트 데이터
│   └── users.json       # 사용자 데이터
└── styles/              # 스타일 파일
```

## 🔧 API 엔드포인트

### **카드 관리**
- `GET /api/boards` - 모든 보드 조회
- `GET /api/boards/:projectId` - 특정 프로젝트 보드 조회
- `POST /api/cards` - 새 카드 생성
- `PUT /api/cards/:cardId` - 카드 수정
- `PUT /api/cards/move` - 카드 이동 (실시간 동기화)
- `DELETE /api/cards/:cardId` - 카드 삭제

### **프로젝트 관리**
- `GET /api/projects` - 프로젝트 목록 조회
- `POST /api/projects` - 새 프로젝트 생성
- `PATCH /api/projects/:projectId` - 프로젝트 설정 수정
- `POST /api/projects/:projectId/join` - 프로젝트 가입 신청
- `PATCH /api/projects/:projectId/requests/:requestId` - 가입 신청 승인/거부
- `DELETE /api/projects/:projectId/leave` - 프로젝트 나가기
- `DELETE /api/projects/:projectId/members/:memberId` - 멤버 제거

### **사용자 관리**
- `GET /api/users` - 사용자 목록 조회
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입

### **실시간 통신**
- `GET /api/websocket` - WebSocket 서버 초기화

## 🎯 실시간 기능

### **WebSocket 이벤트**
- `card-moved` - 카드 이동 이벤트
- `card-created` - 카드 생성 이벤트  
- `card-updated` - 카드 수정 이벤트
- `project-join-request` - 프로젝트 가입 신청
- `project-join-response` - 가입 신청 응답

### **룸 기반 통신**
- `user-{userId}` - 사용자별 개인 알림
- `project-{projectId}` - 프로젝트별 그룹 통신

## 🔐 보안 및 권한

### **프로젝트 권한**
- **소유자 (Owner)**: 모든 권한 (설정 변경, 멤버 관리, 삭제)
- **멤버 (Member)**: 카드 관리, 프로젝트 나가기
- **비회원**: 공개 프로젝트만 조회 가능

### **데이터 보안**
- 프로젝트별 접근 권한 검증
- 사용자 인증 기반 API 보호
- WebSocket 룸 기반 선별적 데이터 전송

## 🎨 사용자 인터페이스

### **반응형 디자인**
- 데스크톱, 태블릿, 모바일 최적화
- Tailwind CSS 기반 일관된 디자인 시스템

### **사용자 경험**
- 직관적인 드래그 앤 드롭 인터페이스
- 실시간 피드백과 로딩 상태
- 접근성을 고려한 키보드 네비게이션

### **테마 및 커스터마이징**
- 프로젝트별 색상 테마
- 다크/라이트 모드 (향후 추가 예정)

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

### **기타 플랫폼**
- **Netlify**: `npm run build` 후 `out` 폴더 배포
- **Docker**: Dockerfile을 통한 컨테이너 배포

## 🧪 개발 도구

### **코드 품질**
```bash
# ESLint 실행
npm run lint

# 타입 체크
npx tsc --noEmit
```

### **디버깅**
- 브라우저 개발자 도구에서 WebSocket 이벤트 로그 확인
- 콘솔 로그를 통한 상태 추적

## 📈 성능 최적화

### **최적화된 기능**
- **옵티미스틱 업데이트**: 즉시 UI 반영 후 서버 동기화
- **이벤트 중복 제거**: 동일 이벤트 중복 처리 방지
- **선별적 리렌더링**: 필요한 컴포넌트만 업데이트
- **지연 로딩**: 필요할 때만 컴포넌트 로드

## 🤝 기여하기

1. 저장소 포크
2. 기능 브랜치 생성 (`git checkout -b feature/amazing-feature`)
3. 변경사항 커밋 (`git commit -m 'Add amazing feature'`)
4. 브랜치 푸시 (`git push origin feature/amazing-feature`)
5. Pull Request 생성

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙋‍♂️ 지원

문제가 발생하거나 질문이 있으시면 [Issues](https://github.com/your-repo/issues)를 통해 문의해 주세요.

---

**Made with ❤️ by Youngjun Lee**

> 실시간 협업을 통해 팀의 생산성을 높이는 칸반보드 시스템
