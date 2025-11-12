# API Key Authentication System - Implementation Guide

## 📋 Overview

AWS-style API key authentication system이 성공적으로 구현되었습니다. 이제 REST API를 외부 시스템(MCP 서버, CLI 도구, 모바일 앱 등)에서 안전하게 사용할 수 있습니다.

## ✅ 구현 완료된 항목

### 1. 데이터베이스 스키마
- ✅ `api_keys` 테이블 생성
- ✅ `api_key_usage_logs` 테이블 생성 (감사 추적용)
- ✅ 인덱스 최적화 (빠른 조회)
- ✅ 마이그레이션 실행 완료

**위치:** `lib/migrations/002_add_api_keys.sql`

### 2. API Key Service
- ✅ API 키 생성 (AWS 스타일: `sk_live_...` 또는 `sk_test_...`)
- ✅ SHA-256 해싱으로 안전한 저장
- ✅ API 키 검증 및 만료 체크
- ✅ 사용량 추적 및 통계
- ✅ 권한 범위(scope) 관리: read, write, admin
- ✅ 취소(revoke) 및 삭제 기능

**위치:** `lib/services/api-key.service.ts`

### 3. 인증 미들웨어
- ✅ Bearer 토큰 인증 지원
- ✅ 기존 세션 인증과 함께 작동
- ✅ 권한 범위 검증
- ✅ 사용량 자동 로깅
- ✅ 에러 처리

**위치:** `lib/api-v1/middleware/api-key-auth.ts`

### 4. REST API 엔드포인트
- ✅ `GET /api/v1/api-keys` - API 키 목록 조회
- ✅ `POST /api/v1/api-keys` - 새 API 키 생성
- ✅ `GET /api/v1/api-keys/[id]` - API 키 상세 정보
- ✅ `PATCH /api/v1/api-keys/[id]` - API 키 수정
- ✅ `DELETE /api/v1/api-keys/[id]` - API 키 삭제
- ✅ `POST /api/v1/api-keys/[id]/revoke` - API 키 비활성화
- ✅ `GET /api/v1/api-keys/[id]/usage` - 사용 통계 조회

**위치:** `pages/api/v1/api-keys/`

### 5. 사용자 인터페이스
- ✅ API 키 관리 페이지
- ✅ API 키 목록 컴포넌트
- ✅ 새 API 키 생성 모달
- ✅ 사용량 통계 표시
- ✅ 취소/삭제 기능

**위치:**
- `pages/settings/api-keys.tsx`
- `components/ApiKeyList.tsx`
- `components/CreateApiKeyModal.tsx`

### 6. 마이그레이션 도구
- ✅ 자동 마이그레이션 러너
- ✅ 마이그레이션 추적 (중복 실행 방지)
- ✅ 트랜잭션 지원

**위치:** `scripts/run-migrations.ts`

## 🚀 사용 방법

### 1. API 키 생성하기

1. 웹 UI에서 `/settings/api-keys` 페이지로 이동
2. "새 API 키 생성" 버튼 클릭
3. 다음 정보 입력:
   - **이름**: API 키를 식별할 이름 (예: "MCP Server", "Mobile App")
   - **환경**: `live` (운영) 또는 `test` (테스트)
   - **권한**:
     - `read`: 데이터 읽기만 가능
     - `write`: 데이터 읽기/쓰기 가능
     - `admin`: 모든 작업 가능 (주의!)
   - **만료일** (선택사항): 비워두면 만료되지 않음

4. 생성 후 표시되는 **전체 API 키를 반드시 복사하여 저장**
   - ⚠️ **중요**: API 키는 생성 시 단 한 번만 표시됩니다!
   - 다시 볼 수 없으므로 안전한 곳에 보관하세요

### 2. API 키로 인증하기

#### cURL 예시
```bash
curl -H "Authorization: Bearer sk_live_abc123..." \
  https://your-domain.com/api/v1/projects
```

#### JavaScript/TypeScript 예시
```typescript
const response = await fetch('https://your-domain.com/api/v1/projects', {
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});
```

#### Python 예시
```python
import requests

headers = {
    'Authorization': f'Bearer {api_key}',
    'Content-Type': 'application/json'
}

response = requests.get(
    'https://your-domain.com/api/v1/projects',
    headers=headers
)
```

### 3. MCP 서버에서 사용하기

MCP 서버 설정 파일에 API 키를 추가:

```json
{
  "mcpServers": {
    "kanban": {
      "url": "https://your-domain.com/api/v1",
      "headers": {
        "Authorization": "Bearer sk_live_abc123..."
      }
    }
  }
}
```

## 🔒 보안 모범 사례

### API 키 관리
1. ✅ **절대 코드에 하드코딩하지 마세요**
   - 환경 변수나 비밀 관리 서비스 사용
   - `.env` 파일은 절대 Git에 커밋하지 말것

2. ✅ **최소 권한 원칙**
   - 필요한 최소한의 권한만 부여
   - 읽기만 필요하면 `read` 권한만 사용

3. ✅ **정기적인 키 순환**
   - 주기적으로 새 키 생성 및 이전 키 삭제
   - 특히 팀원이 퇴사하거나 키가 노출된 경우 즉시 취소

4. ✅ **만료일 설정**
   - 임시 액세스가 필요한 경우 만료일 설정
   - 자동으로 만료되어 보안 강화

5. ✅ **사용량 모니터링**
   - 정기적으로 사용 통계 확인
   - 비정상적인 활동 감지

### 키 노출 시 대응
1. 즉시 해당 키를 **비활성화**(revoke) 또는 **삭제**
2. 새 키 생성 및 배포
3. 사용 로그 확인하여 피해 파악

## 📊 사용 통계 확인

### 웹 UI
- API 키 목록에서 각 키의 사용 횟수와 마지막 사용 시간 확인

### API로 통계 조회
```bash
curl -H "Cookie: next-auth.session-token=..." \
  https://your-domain.com/api/v1/api-keys/{id}/usage?days=30
```

응답 예시:
```json
{
  "apiKeyId": "abc123",
  "period": {
    "days": 30,
    "from": "2024-10-13T00:00:00.000Z",
    "to": "2024-11-12T00:00:00.000Z"
  },
  "stats": {
    "totalRequests": 1523,
    "successRate": 98.5,
    "requestsByDay": [
      { "date": "2024-11-12", "count": 87 },
      { "date": "2024-11-11", "count": 132 }
    ],
    "requestsByEndpoint": [
      { "endpoint": "/api/v1/projects", "count": 450 },
      { "endpoint": "/api/v1/cards", "count": 380 }
    ]
  }
}
```

## 🔧 기술 상세

### API 키 형식
```
kb_{environment}_{random}

예시 (실제 값 아님):
- kb_live_XXXXXXXXXXXXXXXXXXXXXXXX  (운영 환경)
- kb_test_YYYYYYYYYYYYYYYYYYYYYYYY  (테스트 환경)
```

### 데이터베이스 스키마

#### api_keys 테이블
```sql
- id: 고유 ID
- user_id: 소유자 사용자 ID
- name: 사용자 지정 이름
- key_prefix: 키 앞 12자 (식별용)
- key_hash: SHA-256 해시 (실제 키는 저장 안 함!)
- scopes: 권한 범위 (쉼표 구분)
- is_active: 활성 상태 (0=비활성, 1=활성)
- last_used_at: 마지막 사용 시간
- usage_count: 총 사용 횟수
- created_at: 생성 시간
- expires_at: 만료 시간 (선택사항)
```

#### api_key_usage_logs 테이블
```sql
- id: 로그 ID
- api_key_id: API 키 ID
- method: HTTP 메서드 (GET, POST, etc.)
- endpoint: API 엔드포인트
- status_code: 응답 상태 코드
- ip_address: 요청 IP
- user_agent: User-Agent
- timestamp: 요청 시간
```

### 인증 흐름

1. 클라이언트가 `Authorization: Bearer sk_live_...` 헤더와 함께 요청
2. 미들웨어가 API 키 추출 및 해싱
3. 데이터베이스에서 해시 조회
4. 활성 상태 및 만료 여부 확인
5. 권한 범위 검증
6. 인증 성공 시 `req.auth` 객체에 사용자 정보 추가
7. 사용량 카운터 증가 및 로그 기록

## 🎯 다음 단계

### 기존 API에 API 키 인증 추가하기

기존 API 라우트에 API 키 인증을 추가하려면:

#### 방법 1: 고차 함수 사용 (권장)
```typescript
import { withApiKeyAuth } from '@/lib/api-v1/middleware/api-key-auth';

export default withApiKeyAuth(
  async (req, res) => {
    const userId = req.auth!.userId; // API 키 또는 세션의 사용자 ID
    // ... 기존 로직
  },
  { scope: 'write' } // 필요한 권한 지정
);
```

#### 방법 2: 수동 인증
```typescript
import { requireAuthWithScope } from '@/lib/api-v1/middleware/api-key-auth';
import { withErrorHandler } from '@/lib/error-handler';

export default withErrorHandler(async (req, res) => {
  // API 키 또는 세션으로 인증
  const auth = await requireAuthWithScope(req, res, 'write');

  const userId = auth.userId;
  // ... 기존 로직
});
```

### 선택적 인증 (공개 + 인증 모두 지원)
```typescript
import { optionalAuth } from '@/lib/api-v1/middleware/api-key-auth';

export default withErrorHandler(async (req, res) => {
  const auth = await optionalAuth(req, res);

  if (auth) {
    // 인증된 사용자 - 전체 데이터 반환
  } else {
    // 비인증 사용자 - 공개 데이터만 반환
  }
});
```

## 🐛 버그 수정

이번 작업에서 함께 수정된 버그:

### 1. WIP 제한 버그
- **문제**: WIP 제한이 0일 때 카드 추가 불가
- **원인**: `wipLimit > 0` 체크 누락
- **수정**: `hooks/useKanbanAPI.ts:397`에 조건 추가
- **결과**: 0 = 무제한으로 정상 작동

### 2. 카드 수정 검증 오류
- **문제**: 카드 수정 시 "Validation failed" 에러
- **원인**: 프론트엔드가 label 객체 배열을 전송하지만, 백엔드는 문자열 배열 기대
- **수정**:
  1. `lib/validation.ts`: 스키마를 union 타입으로 업데이트 (string[] | object[])
  2. `pages/api/cards/[cardId].ts`: 객체 배열을 ID 배열로 정규화하는 로직 추가
- **결과**: 양쪽 형식 모두 지원하여 호환성 문제 해결

## 📚 참고 자료

### API 문서
- REST API v1 엔드포인트는 `/api/v1/` 경로에 있습니다
- API 키 관리 엔드포인트: `/api/v1/api-keys/`

### 관련 파일
```
lib/
├── migrations/
│   └── 002_add_api_keys.sql
├── services/
│   └── api-key.service.ts
├── api-v1/
│   └── middleware/
│       └── api-key-auth.ts
└── validation.ts

pages/
├── api/v1/api-keys/
│   ├── index.ts
│   ├── [id].ts
│   └── [id]/
│       ├── revoke.ts
│       └── usage.ts
└── settings/
    └── api-keys.tsx

components/
├── ApiKeyList.tsx
└── CreateApiKeyModal.tsx

scripts/
└── run-migrations.ts
```

## ✅ 완료 체크리스트

- [x] 데이터베이스 스키마 생성
- [x] API 키 서비스 구현
- [x] 인증 미들웨어 구현
- [x] API 엔드포인트 구현
- [x] 사용자 인터페이스 구현
- [x] 마이그레이션 실행
- [x] WIP 제한 버그 수정
- [x] 카드 수정 검증 오류 수정
- [x] 문서 작성

## 🎉 결론

AWS 스타일의 강력하고 안전한 API 키 인증 시스템이 성공적으로 구현되었습니다. 이제 외부 시스템에서 REST API를 안전하게 사용할 수 있습니다!

**다음 작업**: 실제 사용 시나리오에서 테스트하고 필요에 따라 추가 기능을 구현하세요.
