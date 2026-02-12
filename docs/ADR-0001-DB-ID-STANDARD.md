# ADR-0001: DB 식별자 컬럼 표준화

- 상태: Proposed
- 날짜: 2026-02-13
- 대상: PostgreSQL 스키마, Repository, API 계약

## 배경

현재 코드베이스에는 `id` 와 `project_id`(유사하게 `board_id`)가 혼재한다.  
이로 인해 migration/쿼리/API 응답에서 불일치가 반복되고, 테스트 안정성이 저하된다.

## 결정

1. 엔터티 PK 컬럼은 모두 `id` 로 통일한다.
2. FK 컬럼은 `<entity>_id` 규칙을 사용한다. 예: `project_id`, `board_id`, `user_id`
3. API 응답 모델은 도메인 관점 단일 필드(`id`)를 사용한다.
4. 과도기에는 DB View 또는 alias query로 하위호환을 제공하되, 신규 코드에서 legacy PK명 사용을 금지한다.

## 적용 범위

1. `projects`: PK `id` 고정
2. `boards`: PK `id` 고정
3. `columns`: PK `id` 고정
4. 나머지 엔터티 동일 규칙 적용

## 마이그레이션 원칙

1. idempotent migration 스크립트 사용
2. DDL 변경 전후 데이터 무결성 검증 쿼리 포함
3. 롤백 스크립트 제공
4. 앱 코드 전환 완료 전까지 dual-read 허용, dual-write 금지

## 완료 기준 (S1 DoD)

1. Repository 코드에서 legacy PK명 직접 참조 제거
2. OpenAPI 스키마의 식별자 필드 일관성 확보
3. 통합 테스트에서 식별자 혼용 관련 실패 0건
