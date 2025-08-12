# 🚀 프로젝트 관리 칸반보드

[![Next.js](https://img.shields.io/badge/Next.js-14.0.4-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.3.6-38B2AC)](https://tailwindcss.com/)

현대적이고 직관적인 프로젝트 관리를 위한 **완전한 칸반보드 시스템**입니다. 4가지 뷰 모드와 강력한 기능들로 팀의 생산성을 극대화하세요.

![Kanban Board Demo](https://via.placeholder.com/800x400/f3f4f6/374151?text=Kanban+Board+Demo)

## ✨ 주요 기능

### 🎯 **4가지 뷰 모드**
- **📋 칸반 뷰**: 직관적인 드래그앤드롭 카드 관리
- **📅 캘린더 뷰**: 일정 기반 작업 시각화
- **📊 간트 차트**: 프로젝트 타임라인 및 진행률 추적
- **📚 매뉴얼**: 칸반보드 완전 가이드 (마크다운 렌더링)

### 🔥 **핵심 기능들**
- ✅ **드래그앤드롭** - 직관적인 카드 이동
- ✅ **WIP 제한** - 컬럼별 작업 제한 및 경고 시스템
- ✅ **스마트 필터링** - 라벨, 담당자, 기한, 텍스트 검색
- ✅ **완전한 CRUD** - 카드 생성, 수정, 삭제
- ✅ **우선순위 관리** - 4단계 우선순위 시스템
- ✅ **마일스톤 추적** - 프로젝트 이정표 관리
- ✅ **라벨 시스템** - 카테고리별 작업 분류
- ✅ **반응형 디자인** - 모든 디바이스 지원

## 🎨 스크린샷

### 칸반 뷰
![Kanban View](https://via.placeholder.com/600x350/f3f4f6/374151?text=Kanban+View)

### 캘린더 뷰
![Calendar View](https://via.placeholder.com/600x350/f3f4f6/374151?text=Calendar+View)

### 간트 차트
![Gantt Chart](https://via.placeholder.com/600x350/f3f4f6/374151?text=Gantt+Chart)

## 🚀 빠른 시작

### 필수 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn

### 설치 및 실행

```bash
# 저장소 클론
git clone https://github.com/june4432/kanban-board.git
cd kanban-board

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 애플리케이션을 확인하세요.

### 빌드 및 배포

```bash
# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# 코드 검사
npm run lint
```

## 📖 사용법

### 1. 카드 관리
- **카드 생성**: 상단의 "카드 추가" 버튼 또는 각 컬럼의 "카드 추가" 버튼
- **카드 이동**: 드래그앤드롭으로 컬럼 간 이동
- **카드 편집**: 카드 클릭 또는 편집 아이콘
- **카드 삭제**: 카드의 삭제 아이콘

### 2. 뷰 전환
상단 네비게이션에서 원하는 뷰를 선택하세요:
- **칸반**: 기본 칸반보드 뷰
- **캘린더**: 마감일 기반 캘린더 뷰
- **간트**: 프로젝트 타임라인 뷰
- **매뉴얼**: 사용법 및 모범 사례

### 3. 필터링 및 검색
- **필터 버튼**: 라벨, 담당자, 우선순위, 날짜 범위로 필터링
- **텍스트 검색**: 제목과 설명에서 키워드 검색
- **다중 필터**: 여러 조건을 조합하여 정확한 검색

### 4. WIP 제한 관리
- 각 컬럼 헤더의 **설정 아이콘**으로 WIP 제한 수정
- 제한 초과 시 **자동 경고** 및 **이동 차단**
- 컬럼별 진행 상황 **실시간 모니터링**

## 🏗️ 프로젝트 구조

```
kanban-board/
├── components/          # React 컴포넌트
│   ├── CalendarView.tsx # 캘린더 뷰
│   ├── CardModal.tsx    # 카드 편집 모달
│   ├── FilterPanel.tsx  # 필터 패널
│   ├── GanttView.tsx    # 간트 차트 뷰
│   ├── KanbanBoard.tsx  # 칸반보드 메인
│   ├── KanbanCard.tsx   # 개별 카드
│   ├── KanbanColumn.tsx # 칸반 컬럼
│   ├── Layout.tsx       # 메인 레이아웃
│   └── ManualView.tsx   # 매뉴얼 뷰
├── hooks/               # React 훅
│   └── useKanban.ts     # 칸반보드 상태 관리
├── pages/               # Next.js 페이지
│   ├── _app.tsx         # 앱 래퍼
│   └── index.tsx        # 메인 페이지
├── styles/              # 스타일 파일
│   └── globals.css      # 글로벌 CSS
├── types/               # TypeScript 타입 정의
│   └── index.ts         # 공통 타입
├── utils/               # 유틸리티 함수
│   └── mockData.ts      # 모의 데이터
├── public/              # 정적 파일
│   └── kanban.md        # 매뉴얼 마크다운
├── kanban.md            # 칸반보드 완전 가이드
└── README.md            # 프로젝트 문서
```

## 🛠️ 기술 스택

### 프론트엔드
- **[Next.js 14](https://nextjs.org/)** - React 프레임워크
- **[React 18](https://reactjs.org/)** - UI 라이브러리
- **[TypeScript](https://www.typescriptlang.org/)** - 정적 타입 검사
- **[Tailwind CSS](https://tailwindcss.com/)** - 유틸리티 우선 CSS 프레임워크

### UI/UX 라이브러리
- **[@hello-pangea/dnd](https://github.com/hello-pangea/dnd)** - 드래그앤드롭
- **[react-big-calendar](https://github.com/jquense/react-big-calendar)** - 캘린더 컴포넌트
- **[react-markdown](https://github.com/remarkjs/react-markdown)** - 마크다운 렌더링
- **[lucide-react](https://lucide.dev/)** - 아이콘 라이브러리
- **[date-fns](https://date-fns.org/)** - 날짜 유틸리티

### 개발 도구
- **[ESLint](https://eslint.org/)** - 코드 품질 검사
- **[PostCSS](https://postcss.org/)** - CSS 후처리
- **[Autoprefixer](https://autoprefixer.github.io/)** - CSS 벤더 프리픽스

## 💡 주요 특징

### 🎨 **현대적인 UI/UX**
- **Material Design** 영감의 깔끔한 인터페이스
- **부드러운 애니메이션** 및 트랜지션
- **일관된 색상 체계** 및 타이포그래피
- **접근성 고려** 설계

### ⚡ **최적화된 성능**
- **React 18** 동시성 기능 활용
- **메모이제이션**으로 불필요한 리렌더링 방지
- **지연 로딩** 및 **코드 분할**
- **번들 크기 최적화**

### 🔒 **타입 안전성**
- **TypeScript** 100% 적용
- **엄격한 타입 검사**
- **런타임 에러 최소화**
- **개발자 경험 향상**

### 📱 **반응형 디자인**
- **모바일 우선** 설계
- **태블릿 및 데스크탑** 최적화
- **터치 제스처** 지원
- **다양한 화면 크기** 대응

## 🤝 기여하기

프로젝트 개선에 기여하고 싶으시다면:

1. **Fork** 이 저장소
2. **Feature 브랜치** 생성 (`git checkout -b feature/AmazingFeature`)
3. **변경사항 커밋** (`git commit -m 'Add some AmazingFeature'`)
4. **브랜치에 Push** (`git push origin feature/AmazingFeature`)
5. **Pull Request** 생성

### 🐛 버그 리포트
[Issues](https://github.com/june4432/kanban-board/issues)에서 버그를 신고해주세요.

### 💡 기능 요청
새로운 기능 아이디어가 있으시면 [Issues](https://github.com/june4432/kanban-board/issues)에서 제안해주세요.

## 📄 라이선스

이 프로젝트는 **MIT 라이선스** 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들의 도움을 받았습니다:

- [Next.js](https://nextjs.org/) - React 프레임워크
- [Tailwind CSS](https://tailwindcss.com/) - CSS 프레임워크
- [Lucide](https://lucide.dev/) - 아이콘 라이브러리
- [React Big Calendar](https://github.com/jquense/react-big-calendar) - 캘린더 컴포넌트

## 📞 연락처

- **GitHub**: [june4432](https://github.com/june4432)
- **Project Link**: [https://github.com/june4432/kanban-board](https://github.com/june4432/kanban-board)

---

⭐ 이 프로젝트가 유용하다면 **Star**를 눌러주세요!

**Made with ❤️ by [june4432](https://github.com/june4432)**