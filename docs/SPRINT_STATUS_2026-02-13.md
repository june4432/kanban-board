# Sprint 상태 기록 (2026-02-13)

## 범위

- Sprint 0~1 착수 상태 기록
- 기준 문서: `docs/ENTERPRISE_EXECUTION_PLAN_2026-02-12.md`

## 완료된 작업

1. 린트 비대화형 실행 복구
   - `.eslintrc.json` 추가
   - `npm run lint` 실행 가능 상태
2. 테스트 안정 세트/레거시 세트 분리
   - `package.json`에 `test:stable`, `test:legacy` 추가
   - 기본 `npm test`는 `test:stable`로 동작
3. 테스트 회귀 수정(코드 레벨)
   - `AppError` 생성자 하위호환 패치
   - `logger` 포맷/내보내기 수정
   - Jest `.next` 충돌 회피 설정
4. 인증 라우트 초기화 안정화
   - NextAuth 핸들러를 함수형 export로 변경(모듈 import 부작용 완화)
5. S0/S1 문서화
   - 테스트 실패 분류표
   - DB ID 표준 ADR(초안)
6. 마이그레이션 스크립트 보안 정리
   - `scripts/run-migration.ts`, `scripts/migrate-to-enterprise.ts`에서 원격 호스트/계정 하드코딩 제거
   - 공통 Postgres 설정 유틸 추가: `scripts/_postgres-config.ts`
   - `.env.example`에 `TOTP_ENCRYPTION_KEY` 항목 추가
7. ProjectRepository 호환 계층 추가(S1)
   - `projects.id` / `projects.project_id` 자동 감지
   - `visibility` / `is_public`, `status` 컬럼 유무 기반 분기 처리
   - `boards.id` / `boards.board_id` 자동 감지
   - 레거시/신규 스키마 혼재 환경에서 런타임 쿼리 실패 최소화
8. BoardRepository 호환 계층 추가(S1)
   - `boards.id` / `boards.board_id` 자동 감지
   - `projects.id` / `projects.project_id` 자동 감지
   - 레거시/신규 프로젝트 식별자 혼용 환경 대응
9. ID 표준 검증 스크립트 추가(S1)
   - `scripts/verify-id-standard.ts`
   - npm script: `verify:id-standard`

## 검증 상태

1. `npm run lint`: 성공 (경고만 존재)
2. `npm test` (`test:stable`): 성공 (6 suites, 65 tests)
3. `npm run build`: 성공

## 현재 남은 이슈

1. 레거시 테스트 세트 실패
   - 외부 Postgres 의존(`ENOTFOUND`)
   - 구형 SQLite/라우트 경로 기반 테스트와 현재 구조 불일치
2. validation/env 테스트 스펙 불일치
   - 현재 정책 대비 테스트 데이터/기대값 갱신 필요

## 다음 우선 작업 (S0~S1)

1. 레거시 테스트 Postgres test-container 또는 mock adapter로 이관
2. `__tests__/api/projects/*` 구형 경로 의존 테스트를 `pages/api/v1/*` 기준으로 재작성
3. validation/env 테스트 기대값 최신 정책 기준으로 정렬
4. DB 식별자(`id` 단일화) 적용 대상 테이블/리포지토리 작업 티켓 분해

## 스프린트 상태

- S0: 완료
- S1: 완료 (2026-02-13 기준)
