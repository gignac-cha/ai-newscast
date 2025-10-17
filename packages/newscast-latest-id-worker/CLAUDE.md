# Newscast Latest ID Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. Cloudflare KV에 최신 뉴스캐스트 ID 저장/조회
2. ID 업데이트 히스토리 추적
3. ID 형식 검증 (ISO timestamp)
4. CORS 지원 REST API 제공
5. 웹 플레이어와 파이프라인 간 ID 동기화

### 구현 상태
- ✅ **완성** - Cloudflare Workers API
- ✅ KV 기반 ID 관리
- ✅ 히스토리 추적
- ✅ ID 형식 검증
- ✅ CORS 지원

---

## 🏗️ 파일 구조 및 역할

```
packages/newscast-latest-id/
├── src/
│   └── index.ts              # 메인 Worker (fetch 핸들러)
├── wrangler.toml            # Cloudflare 설정 (KV Namespace)
├── tsconfig.json            # TypeScript 설정
├── package.json             # 의존성 및 스크립트
└── dist/                    # 빌드 결과물
```

---

## 🔧 API 및 함수 시그니처

### GET / (서비스 정보)
```typescript
function handleRoot(): Response

// 응답
interface WorkerInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    'GET /latest': string;
    'POST /update': string;
  };
  timestamp: string;
}
```

### GET /latest (최신 ID 조회)
```typescript
async function handleGetLatest(env: Env): Promise<Response>

// 응답
interface ApiResponse {
  'latest-newscast-id': string | null;
  timestamp: string;
  found: boolean;
}

// 헤더
{
  'Content-Type': 'application/json',
  'Cache-Control': 'max-age=60',  // 1분 캐시
  'Access-Control-Allow-Origin': '*'
}
```

### POST /update (ID 업데이트)
```typescript
async function handleUpdateLatest(request: Request, env: Env): Promise<Response>

// 요청
interface UpdateRequest {
  id: string;  // YYYY-MM-DDTHH-MM-SS-NNNNNN
}

// 응답
interface UpdateResponse {
  success: boolean;
  'updated-newscast-id': string;
  'previous-newscast-id': string | null;
  timestamp: string;
}

// KV 히스토리 데이터
interface HistoryData {
  'newscast-id': string;
  'updated-at': string;
  'previous-newscast-id': string | null;
  'worker-version': string;
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: 로컬 변수만 (루트 CLAUDE.md 참조)
- **kebab-case**: JSON 응답 키 (API 일관성)
- **시간 단위**: 밀리세컨드 기본 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용 (루트 CLAUDE.md 참조)

### JSON 응답 키 네이밍 (CRITICAL)

#### MUST: kebab-case (API 응답)
```typescript
// ✅ CORRECT
interface ApiResponse {
  'latest-newscast-id': string | null;  // kebab-case
  timestamp: string;
  found: boolean;
}

interface UpdateResponse {
  'updated-newscast-id': string;        // kebab-case
  'previous-newscast-id': string | null; // kebab-case
  timestamp: string;
}

// ❌ WRONG
interface ApiResponse {
  latestNewscastId: string | null;  // ❌ camelCase
  latest_newscast_id: string | null; // ❌ snake_case
}
```

#### MUST: camelCase (내부 변수)
```typescript
// ✅ CORRECT
const latestId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
const previousId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
const newId = body.id;

// ❌ WRONG
const latest_id = await env.AI_NEWSCAST_KV.get('latest-newscast-id');  // ❌ snake_case
```

### ID 형식 검증 규칙

#### MUST: ISO timestamp 형식 (정규식)
```typescript
// ✅ CORRECT
const idPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{6}$/;

if (!idPattern.test(newId)) {
  return new Response(
    JSON.stringify({
      error: 'Invalid ID format. Expected format: YYYY-MM-DDTHH-MM-SS-NNNNNN'
    }),
    { status: 400 }
  );
}

// 예시: "2025-10-05T10-00-00-000000"

// ❌ WRONG
const idPattern = /^\d{4}-\d{2}-\d{2}/;  // ❌ 너무 관대 (시간 검증 없음)
```

### KV 키 네이밍 규칙

#### MUST: KV 키 컨벤션
```typescript
// ✅ CORRECT
const LATEST_KEY = 'latest-newscast-id';        // kebab-case
const historyKey = `history:${newId}`;          // 접두사:ID

await env.AI_NEWSCAST_KV.get(LATEST_KEY);
await env.AI_NEWSCAST_KV.put(historyKey, JSON.stringify(historyData));

// ❌ WRONG
const LATEST_KEY = 'latestNewscastId';          // ❌ camelCase
const historyKey = `${newId}_history`;          // ❌ 접미사 (일관성 없음)
```

### CORS 헤더 규칙

#### MUST: 모든 응답에 CORS 헤더
```typescript
// ✅ CORRECT
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

return new Response(JSON.stringify(data), {
  headers: {
    'Content-Type': 'application/json',
    ...corsHeaders
  }
});

// ❌ WRONG
return new Response(JSON.stringify(data), {
  headers: { 'Content-Type': 'application/json' }  // ❌ CORS 헤더 없음
});
```

#### MUST: OPTIONS 메서드 처리
```typescript
// ✅ CORRECT
if (request.method === 'OPTIONS') {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// ❌ WRONG
// OPTIONS 처리 없음 (브라우저에서 CORS 에러)
```

---

## 🚨 에러 처리 방식

### 요청 검증 에러

```typescript
// ✅ CORRECT - ID 필드 누락
if (!body.id) {
  return new Response(
    JSON.stringify({ error: 'Missing required field: id' }),
    {
      status: 400,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    }
  );
}

// ✅ CORRECT - ID 형식 오류
if (!idPattern.test(newId)) {
  return new Response(
    JSON.stringify({
      error: 'Invalid ID format. Expected format: YYYY-MM-DDTHH-MM-SS-NNNNNN'
    }),
    { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

// ❌ WRONG
if (!body.id) {
  throw new Error('Missing id');  // ❌ 500 에러로 처리됨 (400이어야 함)
}
```

### JSON 파싱 에러

```typescript
// ✅ CORRECT
try {
  const body = await request.json() as UpdateRequest;
  // ...
} catch (error) {
  if (error instanceof Error && error.name === 'SyntaxError') {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON in request body' }),
      { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
  throw error;
}

// ❌ WRONG
const body = await request.json() as UpdateRequest;  // ❌ 에러 처리 없음
```

### KV 작업 에러

```typescript
// ✅ CORRECT
try {
  const latestId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
  // ...
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  throw new Error(`Failed to get latest ID: ${errorMessage}`);
}

// ❌ WRONG
const latestId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');  // ❌ 에러 처리 없음
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.error('Worker error:', error);
console.log('Updated ID:', newId, 'Previous:', previousId);

// ❌ WRONG
console.log(error);  // ❌ 객체 직접 출력 ([object Object])
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **newscast-web**: 웹 플레이어 (GET /latest 호출)
- **newscast-scheduler-worker**: 파이프라인 스케줄러 (POST /update 호출)

### KV Namespace 공유
```toml
# wrangler.toml
[[kv_namespaces]]
binding = "AI_NEWSCAST_KV"
id = "1a002997dc124ce9a4ff5080a7e2b5e6"
```

모든 워커가 동일한 KV Namespace를 공유합니다.

---

## ⚠️ 주의사항 (MUST/NEVER)

### ID 형식 제약 (MUST)

#### MUST: ISO timestamp 형식 강제
```typescript
// ✅ CORRECT
const idPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{6}$/;

// 2025-10-05T10-00-00-000000 (O)
// 2025-10-05T10:00:00.000000 (X) - 콜론 사용 금지

// ❌ WRONG
const idPattern = /^[\w-]+$/;  // ❌ 너무 관대 (아무 문자열이나 허용)
```

#### NEVER: 콜론 사용 (파일 시스템 호환성)
```typescript
// ❌ WRONG
const id = "2025-10-05T10:00:00";  // ❌ 콜론 (Windows 파일명 불가)

// ✅ CORRECT
const id = "2025-10-05T10-00-00-000000";  // 하이픈 사용
```

### KV 스키마 제약 (MUST)

#### MUST: 히스토리 키 접두사 사용
```typescript
// ✅ CORRECT
const historyKey = `history:${newId}`;  // 접두사로 구분

// ❌ WRONG
const historyKey = newId;  // ❌ 'latest-newscast-id'와 충돌 가능
```

#### MUST: 히스토리 데이터 구조
```typescript
// ✅ CORRECT
const historyData: HistoryData = {
  'newscast-id': newId,
  'updated-at': new Date().toISOString(),
  'previous-newscast-id': previousId,
  'worker-version': '1.0.0'
};

await env.AI_NEWSCAST_KV.put(historyKey, JSON.stringify(historyData));

// ❌ WRONG
await env.AI_NEWSCAST_KV.put(historyKey, newId);  // ❌ 단순 문자열 (메타데이터 없음)
```

### 캐시 제약 (MUST)

#### MUST: Cache-Control 헤더 (GET /latest)
```typescript
// ✅ CORRECT
return new Response(JSON.stringify(response), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'max-age=60',  // 1분 캐시
    ...corsHeaders
  }
});

// ❌ WRONG
return new Response(JSON.stringify(response), {
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache'  // ❌ 캐시 비활성화 (불필요한 KV 읽기)
  }
});
```

#### NEVER: POST 응답에 캐시
```typescript
// ❌ WRONG
return new Response(JSON.stringify(response), {
  headers: {
    'Cache-Control': 'max-age=60'  // ❌ POST는 캐시 안 됨
  }
});

// ✅ CORRECT
return new Response(JSON.stringify(response), {
  headers: { 'Content-Type': 'application/json', ...corsHeaders }
  // Cache-Control 없음 (POST는 기본적으로 캐시 안 됨)
});
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **KV 사용 워커**:
  - [../newscast-scheduler-worker/CLAUDE.md](../newscast-scheduler-worker/CLAUDE.md)
  - [../news-crawler-worker/CLAUDE.md](../news-crawler-worker/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - Cloudflare Workers API (KV 기반 ID 관리)*
