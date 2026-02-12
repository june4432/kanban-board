# Sprint 0 테스트 실패 분류표 (2026-02-13)

## 실행 결과 요약

- 명령어: `npm test -- --runInBand`
- 결과: 17개 스위트 중 12개 실패
- 참고: `tests/api/v1/*` 는 통과, 구형 `__tests__/*` 중심으로 실패

## 실패 분류

| 분류 | 증상 | 영향 범위 | 조치 상태 |
|---|---|---|---|
| 설정/도구 | Jest haste collision (`.next/standalone/package.json`) | 전체 테스트 안정성 | `modulePathIgnorePatterns` 추가 완료 |
| 코드 회귀 | `AppError` 생성자 시그니처 불일치, `logger` 응답 포맷 불일치 | `__tests__/lib/logger.test.ts` | 하위호환 패치 완료 |
| 모듈 호환 | `NextAuth is not a function` | `__tests__/api/auth-integration.test.ts` | `next-auth/next` import로 패치 완료 |
| 환경 의존 | `better-sqlite3` 바이너리 Node ABI mismatch | `__tests__/api/websocket.test.ts` | 환경 작업 필요 (재설치/재빌드) |
| 환경 의존 | 외부 Postgres DNS(`ENOTFOUND`) | repository 테스트 다수 | 테스트 DB 분리 필요 |
| 테스트/스펙 불일치 | validation 정책 강화로 기존 테스트 입력 불일치 | `__tests__/lib/validation.test.ts` | 테스트 데이터 갱신 필요 |

## 다음 액션 (S0 남은 작업)

1. `better-sqlite3` 재빌드 또는 websocket 테스트를 Postgres mock 기반으로 전환
2. repository 테스트에서 외부 DB 의존 제거(로컬 test DB 또는 mock adapter)
3. `validation.test.ts` 입력값을 현재 비밀번호 정책에 맞게 갱신
4. `npm test` 전수 통과 후 CI 게이트 복구

## 임시 운영 정책 (S0)

- 안정 세트(`test:stable`)와 레거시 세트(`test:legacy`)를 분리한다.
- CI 기본 게이트는 `test:stable`을 사용한다.
- 레거시 테스트는 Postgres 전환/테스트 리팩터링 완료 시 다시 기본 게이트로 편입한다.
