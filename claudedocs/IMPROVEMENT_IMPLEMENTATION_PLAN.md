# 칸반보드 개선사항 구현 계획

## 📋 목차
1. [개선사항 요약](#개선사항-요약)
2. [현재 시스템 분석](#현재-시스템-분석)
3. [구현 전략](#구현-전략)
4. [상세 구현 계획](#상세-구현-계획)
5. [우선순위 및 일정](#우선순위-및-일정)

---

## 🎯 개선사항 요약

### 1. 프로젝트별 WIP 제한 관리
**현재 문제점**: 모든 컬럼의 WIP 제한이 0으로 고정
**개선 방향**: 프로젝트 설정에서 컬럼별 WIP 제한을 관리

### 2. 프로젝트별 컬럼 커스터마이징
**현재 문제점**: 프로젝트 생성 시 Backlog/To Do/In Progress/Done 고정
**개선 방향**: 프로젝트 생성 시 또는 이후에 컬럼을 자유롭게 추가/수정/삭제

### 3. 반응형 디자인
**현재 문제점**: 태블릿/모바일에서 레이아웃 깨짐
**개선 방향**: 화면 크기별 최적화된 레이아웃 제공

---

## 🔍 현재 시스템 분석

### 데이터베이스 구조

**columns 테이블** (lib/schema.sql:84-93):
```sql
CREATE TABLE IF NOT EXISTS columns (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL REFERENCES boards(board_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  wip_limit INTEGER DEFAULT 10,  -- 기본값 10이지만 코드에서 0으로 생성
  position INTEGER NOT NULL
);
```

### 프로젝트 생성 로직

**lib/repositories/project.repository.ts:54-75**:
```typescript
// Create default columns
const defaultColumns = [
  { id: 'backlog', title: 'Backlog', wipLimit: 0, position: 0 },
  { id: 'todo', title: 'To Do', wipLimit: 0, position: 1 },
  { id: 'in-progress', title: 'In Progress', wipLimit: 0, position: 2 },
  { id: 'done', title: 'Done', wipLimit: 0, position: 3 },
];

for (const col of defaultColumns) {
  columnStmt.run(
    `${boardId}-${col.id}`,
    boardId,
    col.title,
    col.wipLimit,
    col.position
  );
}
```

**문제점**:
1. WIP 제한이 하드코딩으로 0
2. 컬럼이 하드코딩으로 4개 고정
3. 프로젝트별 커스터마이징 불가능

### 현재 UI 구조

**components/KanbanColumn.tsx**:
- 개별 컬럼 WIP 편집 가능 (라인 24-86)
- 하지만 프로젝트 전체 설정에서는 관리 불가

**components/ProjectSettingsModal.tsx**:
- 프로젝트 이름, 설명, 색상만 관리
- 컬럼 관리 기능 없음

---

## 🚀 구현 전략

### 전략 1: 데이터베이스 확장 (필요 없음)
현재 데이터베이스 스키마는 이미 충분합니다.
- `columns.wip_limit`: WIP 제한 저장 가능
- `columns` 테이블: 동적 컬럼 관리 가능

### 전략 2: 기본 템플릿 방식
프로젝트 생성 시 "템플릿" 선택 또는 커스텀 옵션 제공

**템플릿 옵션**:
1. **기본 칸반** (현재 방식): Backlog → To Do → In Progress → Done
2. **간단한 칸반**: To Do → Doing → Done
3. **스크럼**: Backlog → Sprint Backlog → In Progress → Review → Done
4. **커스텀**: 사용자가 직접 설정

### 전략 3: 프로젝트 설정 UI 확장
ProjectSettingsModal에 "컬럼 관리" 탭 추가

---

## 📐 상세 구현 계획

## 개선 1: 프로젝트별 WIP 관리

### 1.1 ProjectSettingsModal 확장

**파일**: `components/ProjectSettingsModal.tsx`

**추가 기능**:
```typescript
// 새로운 탭: "컬럼 관리"
<Tab name="columns">
  {/* 컬럼 목록 및 WIP 설정 */}
  {columns.map(column => (
    <ColumnSettingRow
      column={column}
      onUpdateWip={(columnId, newLimit) => handleUpdateWip(columnId, newLimit)}
      onUpdateTitle={(columnId, newTitle) => handleUpdateTitle(columnId, newTitle)}
    />
  ))}
</Tab>
```

**UI 구조**:
```
┌─ 프로젝트 설정 ─────────────────┐
│ [일반] [멤버] [컬럼] [알림]      │
│                                 │
│ 컬럼 관리                        │
│ ┌───────────────────────────┐   │
│ │ Backlog                   │   │
│ │ WIP 제한: [5] [저장]      │   │
│ │ [제목 변경] [삭제]        │   │
│ └───────────────────────────┘   │
│                                 │
│ ┌───────────────────────────┐   │
│ │ To Do                     │   │
│ │ WIP 제한: [10] [저장]     │   │
│ │ [제목 변경] [삭제]        │   │
│ └───────────────────────────┘   │
│                                 │
│ [+ 새 컬럼 추가]                │
└─────────────────────────────────┘
```

### 1.2 API 엔드포인트 추가

**파일**: `pages/api/projects/[projectId]/columns.ts` (신규)

```typescript
// GET: 프로젝트의 모든 컬럼 조회
// PUT: 컬럼 업데이트 (제목, WIP)
// POST: 새 컬럼 추가
// DELETE: 컬럼 삭제
```

---

## 개선 2: 프로젝트별 컬럼 커스터마이징

### 2.1 프로젝트 생성 시 템플릿 선택

**파일**: `components/ProjectSelector.tsx` 또는 새로운 `components/ProjectCreateWizard.tsx`

**단계**:
1. 프로젝트 기본 정보 (이름, 설명, 색상)
2. 컬럼 템플릿 선택
3. 컬럼 커스터마이징 (선택사항)

**UI 구조**:
```
┌─ 새 프로젝트 생성 (2/3) ─────────┐
│                                  │
│ 컬럼 템플릿 선택:                 │
│                                  │
│ ○ 기본 칸반                       │
│   Backlog → To Do → In Progress  │
│   → Done                         │
│                                  │
│ ○ 간단한 칸반                     │
│   To Do → Doing → Done           │
│                                  │
│ ○ 스크럼                          │
│   Backlog → Sprint → In Progress │
│   → Review → Done                │
│                                  │
│ ● 커스텀 (직접 설정)              │
│                                  │
│ [이전] [다음] [취소]              │
└──────────────────────────────────┘
```

**커스텀 설정 화면**:
```
┌─ 컬럼 설정 ──────────────────────┐
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 1. Backlog                   │ │
│ │    WIP 제한: [5]  [×]        │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ 2. To Do                     │ │
│ │    WIP 제한: [10]  [×]       │ │
│ └──────────────────────────────┘ │
│                                  │
│ [+ 컬럼 추가]                    │
│                                  │
│ [이전] [생성] [취소]              │
└──────────────────────────────────┘
```

### 2.2 컬럼 관리 기능

**lib/repositories/column.repository.ts** (신규):
```typescript
export class ColumnRepository {
  // 컬럼 생성
  createColumn(data: {
    boardId: string;
    title: string;
    wipLimit: number;
    position: number;
  }): Column;

  // 컬럼 수정
  updateColumn(columnId: string, data: {
    title?: string;
    wipLimit?: number;
    position?: number;
  }): Column | null;

  // 컬럼 삭제 (카드가 있으면 삭제 불가 또는 다른 컬럼으로 이동 옵션)
  deleteColumn(columnId: string): boolean;

  // 컬럼 순서 변경
  reorderColumns(boardId: string, columnIds: string[]): boolean;
}
```

### 2.3 프로젝트 생성 로직 수정

**파일**: `lib/repositories/project.repository.ts`

**기존**:
```typescript
const defaultColumns = [
  { id: 'backlog', title: 'Backlog', wipLimit: 0, position: 0 },
  { id: 'todo', title: 'To Do', wipLimit: 0, position: 1 },
  { id: 'in-progress', title: 'In Progress', wipLimit: 0, position: 2 },
  { id: 'done', title: 'Done', wipLimit: 0, position: 3 },
];
```

**수정**:
```typescript
create(data: {
  // ... 기존 필드
  columns?: Array<{  // 신규: 선택적 컬럼 설정
    title: string;
    wipLimit: number;
  }>;
  template?: 'basic' | 'simple' | 'scrum' | 'custom';  // 신규: 템플릿
}): Project {
  // ...

  // 컬럼 생성
  const columns = data.columns || getTemplateColumns(data.template || 'basic');

  for (let i = 0; i < columns.length; i++) {
    const col = columns[i];
    columnStmt.run(
      `${boardId}-${i}`,
      boardId,
      col.title,
      col.wipLimit,
      i
    );
  }

  // ...
}

// 템플릿 정의
function getTemplateColumns(template: string) {
  const templates = {
    basic: [
      { title: 'Backlog', wipLimit: 0 },
      { title: 'To Do', wipLimit: 10 },
      { title: 'In Progress', wipLimit: 5 },
      { title: 'Done', wipLimit: 0 },
    ],
    simple: [
      { title: 'To Do', wipLimit: 10 },
      { title: 'Doing', wipLimit: 5 },
      { title: 'Done', wipLimit: 0 },
    ],
    scrum: [
      { title: 'Backlog', wipLimit: 0 },
      { title: 'Sprint Backlog', wipLimit: 15 },
      { title: 'In Progress', wipLimit: 5 },
      { title: 'Review', wipLimit: 3 },
      { title: 'Done', wipLimit: 0 },
    ],
  };

  return templates[template] || templates.basic;
}
```

---

## 개선 3: 반응형 디자인

### 3.1 Breakpoints 정의

**Tailwind 기본 breakpoints**:
```css
sm: 640px   /* 모바일 가로 */
md: 768px   /* 태블릿 */
lg: 1024px  /* 데스크톱 */
xl: 1280px  /* 대형 데스크톱 */
```

### 3.2 KanbanBoard 반응형 레이아웃

**파일**: `components/KanbanBoard.tsx`

**현재** (라인 47):
```tsx
<div className="flex space-x-2 h-full pb-2 min-w-0">
  {columns.map((column) => (
    <div key={column.id} className="flex-1 min-w-0">
      <KanbanColumn ... />
    </div>
  ))}
</div>
```

**수정**:
```tsx
<div className="
  /* 모바일: 세로 스크롤 */
  flex flex-col space-y-4 md:space-y-0
  /* 태블릿 이상: 가로 스크롤 */
  md:flex-row md:space-x-2 md:overflow-x-auto
  h-full pb-2 min-w-0
">
  {columns.map((column) => (
    <div
      key={column.id}
      className="
        /* 모바일: 전체 너비 */
        w-full
        /* 태블릿: 최소 너비 설정 */
        md:min-w-[300px] md:w-[300px]
        /* 데스크톱: flex-1 */
        lg:flex-1 lg:w-auto
        min-w-0
      "
    >
      <KanbanColumn ... />
    </div>
  ))}
</div>
```

### 3.3 KanbanColumn 반응형

**파일**: `components/KanbanColumn.tsx`

**헤더 조정**:
```tsx
<div className="p-4 border-b border-border flex-shrink-0">
  {/* 모바일: 컴팩트 헤더 */}
  <div className="flex items-center justify-between mb-2">
    <h3 className="
      font-semibold text-foreground
      text-base md:text-lg  /* 모바일: 작은 글꼴 */
    ">
      {column.title}
    </h3>
    {/* ... */}
  </div>
</div>
```

**카드 높이 조정**:
```tsx
<div className="
  flex-1 p-4 space-y-3 overflow-y-auto
  /* 모바일: 최대 높이 제한 */
  max-h-[400px] md:max-h-none
">
  {/* 카드 목록 */}
</div>
```

### 3.4 Layout 반응형 사이드바

**파일**: `components/Layout.tsx`

**현재 구조**:
- 고정된 사이드바
- 모바일에서 화면 차지

**수정 방향**:
1. **모바일**: 햄버거 메뉴 → 드로어
2. **태블릿**: 축소 가능한 사이드바
3. **데스크톱**: 고정 사이드바

**구조**:
```tsx
{/* 모바일 햄버거 메뉴 */}
<button
  className="md:hidden fixed top-4 left-4 z-50"
  onClick={() => setMobileMenuOpen(true)}
>
  <Menu />
</button>

{/* 사이드바 */}
<aside className={`
  /* 모바일: 드로어 */
  fixed inset-y-0 left-0 z-40 w-64
  transform transition-transform
  ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}

  /* 태블릿 이상: 고정 사이드바 */
  md:translate-x-0 md:static

  bg-background border-r
`}>
  {/* 사이드바 내용 */}
</aside>

{/* 오버레이 (모바일) */}
{mobileMenuOpen && (
  <div
    className="md:hidden fixed inset-0 bg-black/50 z-30"
    onClick={() => setMobileMenuOpen(false)}
  />
)}
```

### 3.5 CardModal 반응형

**파일**: `components/CardModal.tsx`

**현재**: 고정 너비 모달
**수정**: 화면 크기에 따라 조정

```tsx
<div className="
  fixed inset-0 z-50 overflow-y-auto
  /* 모바일: 전체 화면 */
  p-0 sm:p-4
">
  <div className="
    bg-background rounded-lg
    /* 모바일: 전체 화면 */
    min-h-screen sm:min-h-0
    w-full sm:max-w-2xl
    /* 태블릿 이상: 모달 */
    sm:mx-auto sm:my-8
  ">
    {/* 모달 내용 */}
  </div>
</div>
```

### 3.6 FilterPanel 반응형

**파일**: `components/FilterPanel.tsx`

**현재**: `w-96` 고정 너비
**수정**: 반응형 너비

```tsx
<div className="
  fixed right-0 top-0 h-full
  /* 모바일: 전체 너비 */
  w-full sm:w-96
  bg-background shadow-xl
">
  {/* 필터 내용 */}
</div>
```

---

## 🗂️ 파일 구조

### 신규 파일
```
lib/repositories/
  └─ column.repository.ts         # 컬럼 CRUD

pages/api/projects/[projectId]/
  └─ columns.ts                   # 컬럼 관리 API

components/
  └─ ProjectCreateWizard.tsx      # 프로젝트 생성 마법사
  └─ ColumnSettingsPanel.tsx      # 컬럼 설정 패널
```

### 수정 파일
```
lib/repositories/
  └─ project.repository.ts        # create() 메서드 수정

components/
  └─ KanbanBoard.tsx              # 반응형 레이아웃
  └─ KanbanColumn.tsx             # 반응형 헤더/카드
  └─ Layout.tsx                   # 반응형 사이드바
  └─ ProjectSettingsModal.tsx     # 컬럼 관리 탭 추가
  └─ CardModal.tsx                # 반응형 모달
  └─ FilterPanel.tsx              # 반응형 너비
```

---

## ⏱️ 우선순위 및 일정

### Phase 1: 기반 작업 (1일)
**우선순위: 높음**

1. ColumnRepository 생성 (2시간)
2. API 엔드포인트 생성 (2시간)
3. ProjectRepository.create() 수정 (2시간)

**예상 시간**: 6-8시간

---

### Phase 2: 반응형 디자인 (1-2일)
**우선순위: 매우 높음** (즉시 체감 가능)

1. KanbanBoard 반응형 (2시간)
2. KanbanColumn 반응형 (2시간)
3. Layout 반응형 사이드바 (3시간)
4. CardModal 반응형 (1시간)
5. FilterPanel 반응형 (1시간)
6. 테스트 및 조정 (2시간)

**예상 시간**: 10-12시간

---

### Phase 3: WIP 관리 UI (1일)
**우선순위: 중간**

1. ProjectSettingsModal에 컬럼 탭 추가 (3시간)
2. ColumnSettingsPanel 컴포넌트 (2시간)
3. API 연동 및 테스트 (2시간)

**예상 시간**: 6-8시간

---

### Phase 4: 컬럼 커스터마이징 (2일)
**우선순위: 낮음** (선택사항)

1. ProjectCreateWizard 컴포넌트 (4시간)
2. 템플릿 선택 UI (3시간)
3. 커스텀 컬럼 설정 UI (3시간)
4. 컬럼 추가/삭제 기능 (4시간)
5. 통합 테스트 (2시간)

**예상 시간**: 14-16시간

---

## 🚦 추천 구현 순서

### 즉시 시작 (최대 효과)
1. **반응형 디자인** (Phase 2) - 즉시 체감 가능
   - KanbanBoard, KanbanColumn, Layout
   - 모바일/태블릿 사용성 대폭 향상

### 단기 (1주일 내)
2. **WIP 관리 UI** (Phase 3)
   - ProjectSettingsModal 확장
   - 실용적인 WIP 관리 가능

3. **기반 작업** (Phase 1)
   - ColumnRepository, API
   - Phase 3, 4를 위한 기반

### 중기 (2주일 내)
4. **컬럼 커스터마이징** (Phase 4) - 선택사항
   - 프로젝트 생성 마법사
   - 고급 사용자 편의성

---

## 📊 예상 효과

### 반응형 디자인
- 모바일/태블릿 사용자 +70% 만족도
- 접근성 대폭 향상
- 언제 어디서나 사용 가능

### WIP 관리
- 프로젝트 생산성 +30%
- 병목 구간 조기 발견
- 작업 흐름 최적화

### 컬럼 커스터마이징
- 팀별 워크플로우 맞춤화
- 유연성 +50%
- 다양한 프로젝트 타입 지원

---

**문서 작성일**: 2025-11-02
**버전**: 1.0
