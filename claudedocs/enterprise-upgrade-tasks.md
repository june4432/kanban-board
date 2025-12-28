# 엔터프라이즈 업그레이드 작업 목록

> 생성일: 2025-12-27
> 마지막 업데이트: 2025-12-27
> 상태: 진행 중

---

## 🔴 Phase 1: 레거시 정리 (높은 우선순위)

### Task 1.1: 레거시 코드 정리 및 PostgreSQL 마이그레이션 ✅ 완료
- [x] `lib/auth.ts` 삭제 (미사용 파일 기반 인증)
- [x] `lib/auth-helpers.ts` → PostgreSQL 마이그레이션
- [x] `lib/api-v1/middleware/auth.ts` → PostgreSQL 마이그레이션
- [x] `lib/api-v1/middleware/api-key-auth.ts` → PostgreSQL 마이그레이션
- [x] `lib/services/api-key.service.ts` → PostgreSQL 마이그레이션 (완전 재작성)
- [x] 모든 API Keys 엔드포인트 PostgreSQL 마이그레이션
- [x] 레거시 초대/사용자 검색 API PostgreSQL 마이그레이션
- [x] tsconfig.json 수정 (scripts 폴더 exclude)
- [x] 빌드 성공 확인

### Task 1.2: 레거시 API를 API v1으로 마이그레이션 ✅ 부분 완료
- [x] `pages/api/` (레거시) 엔드포인트 목록 작성
- [x] `pages/api/v1/` 엔드포인트와 비교 분석
- [x] 누락된 v1 엔드포인트 구현:
  - [x] `/api/v1/companies` - 회사 CRUD
  - [x] `/api/v1/users/search` - 사용자 검색
  - [x] `/api/v1/projects/[id]/dashboard` - 프로젝트 대시보드
  - [x] `/api/v1/projects/[id]/join` - 프로젝트 가입 요청
  - [x] `/api/v1/projects/[id]/join-requests` - 가입 요청 목록
  - [x] `/api/v1/projects/[id]/join-requests/[requestId]/approve` - 가입 승인
  - [x] `/api/v1/projects/[id]/join-requests/[requestId]/reject` - 가입 거부
  - [x] `/api/v1/projects/[id]/invites` - 초대 링크 CRUD
  - [x] `/api/v1/projects/[id]/invites/[inviteId]` - 초대 삭제
- [ ] 클라이언트에서 레거시 API 호출 → v1 API 호출로 변경
- [ ] 레거시 API 파일 제거 또는 v1으로 리다이렉트

### Task 1.3: 서비스 레이어 패턴 적용
- [ ] `lib/services/` 디렉토리 구조 정립
- [ ] 비즈니스 로직을 Repository에서 Service로 분리
- [ ] API Route → Service → Repository 계층 구조 확립
- [ ] 주요 서비스 구현:
  - [ ] UserService
  - [ ] ProjectService (기존 확장)
  - [ ] BoardService (기존 확장)
  - [ ] CardService
  - [ ] OrganizationService

---

## 🟡 Phase 2: 아키텍처 개선 (중간 우선순위)

### Task 2.1: 에러 핸들링 통일
- [ ] 표준 에러 클래스 정의
- [ ] API 응답 포맷 통일
- [ ] 에러 로깅 개선

### Task 2.2: Validation 스키마 통합
- [ ] Zod 스키마 정의
- [ ] API 입력 검증 통일
- [ ] 타입 자동 생성 연동

### Task 2.3: 테스트 확대
- [ ] E2E 테스트 환경 구축 (Playwright)
- [ ] 미들웨어 단위 테스트
- [ ] 서비스 레이어 테스트

---

## 🟢 Phase 3: 기능 완성 (낮은 우선순위)

### Task 3.1: 대시보드 기능 구현
- [ ] 프로젝트 통계 API
- [ ] 대시보드 UI 컴포넌트

### Task 3.2: Webhook 시스템 구현
- [ ] Webhook 발송 로직
- [ ] 재시도 메커니즘
- [ ] Webhook 관리 UI

### Task 3.3: 알림 시스템 완성
- [ ] 실시간 알림 UI
- [ ] 이메일 알림 연동
- [ ] 알림 설정 UI

---

## 진행 상황

| Task | 상태 | 완료일 |
|------|------|--------|
| 1.1 PostgreSQL 마이그레이션 | ✅ 완료 | 2025-12-27 |
| 1.2 V1 API 엔드포인트 구현 | ✅ 완료 | 2025-12-27 |
| 1.2 클라이언트 마이그레이션 | ⏳ 대기 | - |
| 1.3 서비스 레이어 | ⏳ 대기 | - |
| 2.x 아키텍처 개선 | ⏳ 대기 | - |
| 3.x 기능 완성 | ⏳ 대기 | - |

---

## 신규 V1 API 엔드포인트 (2025-12-27 추가)

### Companies API
- `GET /api/v1/companies` - 사용자의 회사 목록
- `POST /api/v1/companies` - 회사 생성

### Users API
- `GET /api/v1/users` - 사용자 목록 (기존)
- `GET /api/v1/users/search` - 사용자 검색 (신규)

### Projects API (추가분)
- `GET /api/v1/projects/[id]/dashboard` - 프로젝트 대시보드 통계
- `POST /api/v1/projects/[id]/join` - 프로젝트 가입 요청
- `GET /api/v1/projects/[id]/join-requests` - 가입 요청 목록
- `POST /api/v1/projects/[id]/join-requests/[requestId]/approve` - 가입 승인
- `POST /api/v1/projects/[id]/join-requests/[requestId]/reject` - 가입 거부
- `GET /api/v1/projects/[id]/invites` - 초대 링크 목록
- `POST /api/v1/projects/[id]/invites` - 초대 링크 생성
- `DELETE /api/v1/projects/[id]/invites/[inviteId]` - 초대 비활성화

---

## 참고 파일

- ~~레거시 auth: `lib/auth.ts`~~ (삭제됨)
- 레거시 API: `pages/api/`
- 신규 API v1: `pages/api/v1/`
- Repository: `lib/repositories/`
- 서비스: `lib/services/`
- 엔터프라이즈 스키마: `lib/schema.enterprise.sql`
- API 클라이언트: `lib/api/v1-client.ts`
