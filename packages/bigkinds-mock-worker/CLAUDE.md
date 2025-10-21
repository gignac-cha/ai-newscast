# BigKinds Mock Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. BigKinds API 목업 서버 (테스트용)
2. R2에 저장된 실제 topics.raw.html 파일 프록시
3. 뉴스 크롤러 테스트 환경 제공
4. 실제 BigKinds 서버 호출 없이 로컬/CI 테스트 가능

### 구현 상태
- ✅ **완성** - Cloudflare Workers 목업 API
- ✅ R2 Binding (internal network)
- ✅ 3개 목업 엔드포인트
- ✅ CORS 지원
- ✅ 장기 캐싱 (1년)

---

## 🏗️ 파일 구조 및 역할

```
packages/bigkinds-mock-worker/
├── worker.ts              # 메인 Worker 엔트리포인트
├── wrangler.toml         # Cloudflare 설정 (R2 Binding)
├── build.ts              # esbuild 번들링 설정
├── package.json          # 의존성 및 스크립트
├── README.md             # 사용자 문서
└── CLAUDE.md             # AI 개발 가이드 (이 파일)
```

---

## 🔧 API 및 함수 시그니처

### GET / (서비스 정보)
```typescript
function handleRoot(): Response

// 응답
{
  name: "BigKinds Mock Worker",
  version: "1.0.0",
  description: "Mock server for BigKinds API testing - proxies R2 HTML files",
  endpoints: {
    "GET /1": "Proxy to newscasts/2025-10-18T09-06-02-142Z/topics.raw.html",
    "GET /2": "Proxy to newscasts/2025-10-19T09-05-38-085Z/topics.raw.html",
    "GET /3": "Proxy to newscasts/2025-10-20T09-05-32-895Z/topics.raw.html"
  },
  timestamp: "2025-10-21T00:00:00.000Z"
}
```

### GET /1, /2, /3 (목업 HTML 응답)
```typescript
async function handleMockRequest(path: string, env: Env): Promise<Response>

// 응답 헤더
{
  'Content-Type': 'text/html; charset=utf-8',
  'Cache-Control': 'public, max-age=31536000, immutable',  // 1년 캐시
  'Access-Control-Allow-Origin': '*'
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: 로컬 변수, 함수명 (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용 (루트 CLAUDE.md 참조)

### core-worker 사용 규칙 (CRITICAL)

#### MUST: core-worker 유틸리티 사용
```typescript
// ✅ CORRECT
import {
  createCORSPreflightResponse,
  response,
  cors,
  json,
  error,
  longCache
} from '@ai-newscast/core-worker';

// OPTIONS 처리
if (request.method === 'OPTIONS') {
  return createCORSPreflightResponse();
}

// JSON 응답
return response(cors(json(info)));

// 에러 응답
return response(cors(error('Not Found', 'Path not available')));

// HTML 응답 (장기 캐싱)
return response(longCache(cors({
  data: htmlContent,
  options: {
    contentType: 'text/html; charset=utf-8'
  }
})));

// ❌ WRONG
return new Response(JSON.stringify(info), {
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'  // ❌ core-worker 사용 안 함
  }
});
```

### R2 Binding 규칙

#### MUST: R2 Binding 사용 (Public URL 금지)
```typescript
// ✅ CORRECT
const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);
if (r2Object === null) {
  return response(cors(error('File not found in R2', `R2 path: ${r2FilePath}`)));
}
const htmlContent = await r2Object.text();

// ❌ WRONG
const r2URL = `https://pub-xxx.r2.dev/${r2FilePath}`;
const r2Response = await fetch(r2URL);  // ❌ egress 비용 발생
```

#### MUST: null 체크
```typescript
// ✅ CORRECT
const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);

if (r2Object === null) {
  console.error(`R2 object not found: ${r2FilePath}`);
  return response(cors(error('File not found in R2', `R2 path: ${r2FilePath}`)));
}

const htmlContent = await r2Object.text();

// ❌ WRONG
const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);
const htmlContent = await r2Object.text();  // ❌ null일 경우 크래시
```

### 캐싱 규칙

#### MUST: 장기 캐시 사용 (Static 파일)
```typescript
// ✅ CORRECT
// 목업 HTML 파일은 변경되지 않으므로 1년 캐시
return response(longCache(cors({
  data: htmlContent,
  options: {
    contentType: 'text/html; charset=utf-8'
  }
})));

// ❌ WRONG
return response(cors({  // ❌ 캐시 없음 (불필요한 R2 읽기)
  data: htmlContent,
  options: {
    contentType: 'text/html; charset=utf-8'
  }
}));
```

### 엔드포인트 매핑 규칙

#### MUST: 상수로 매핑 관리
```typescript
// ✅ CORRECT
const MOCK_FILES: Record<string, string> = {
  '/1': 'newscasts/2025-10-18T09-06-02-142Z/topics.raw.html',
  '/2': 'newscasts/2025-10-19T09-05-38-085Z/topics.raw.html',
  '/3': 'newscasts/2025-10-20T09-05-32-895Z/topics.raw.html',
};

if (path in MOCK_FILES) {
  return await handleMockRequest(path, env);
}

// ❌ WRONG
if (path === '/1') {
  const r2Path = 'newscasts/2025-10-18T09-06-02-142Z/topics.raw.html';  // ❌ 하드코딩
  // ...
}
```

---

## 🚨 에러 처리 방식

### R2 에러 처리

```typescript
// ✅ CORRECT
async function handleMockRequest(path: string, env: Env): Promise<Response> {
  const r2FilePath = MOCK_FILES[path];

  console.log(`Reading mock data from R2: ${r2FilePath}`);

  try {
    const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);

    if (r2Object === null) {
      console.error(`R2 object not found: ${r2FilePath}`);
      return response(cors(error('File not found in R2', `R2 path: ${r2FilePath}`)));
    }

    const htmlContent = await r2Object.text();

    return response(longCache(cors({
      data: htmlContent,
      options: {
        contentType: 'text/html; charset=utf-8'
      }
    })));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to read from R2: ${errorMessage}`);
    throw new Error(`Failed to read mock data: ${errorMessage}`);
  }
}

// ❌ WRONG
async function handleMockRequest(path: string, env: Env): Promise<Response> {
  const r2Object = await env.AI_NEWSCAST_R2.get(MOCK_FILES[path]);  // ❌ try/catch 없음
  const htmlContent = await r2Object.text();  // ❌ null 체크 없음
  return new Response(htmlContent);
}
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.log(`Reading mock data from R2: ${r2FilePath}`);
console.error(`R2 object not found: ${r2FilePath}`);
console.error(`Failed to read from R2: ${errorMessage}`);

// ❌ WRONG
console.log('Reading...');  // ❌ 구체적 정보 없음
console.log(r2Object);      // ❌ 객체 직접 출력 ([object Object])
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **@ai-newscast/core-worker**: 공통 Worker 유틸리티 (CORS, 에러 응답, 캐싱)
- **@ai-newscast/news-crawler**: 이 목업 서버를 사용하는 테스트

### Import 패턴

```typescript
// ✅ CORRECT
import {
  createCORSPreflightResponse,
  response,
  cors,
  json,
  error,
  longCache
} from '@ai-newscast/core-worker';

// ❌ WRONG
import * as coreWorker from '@ai-newscast/core-worker';  // ❌ namespace 금지
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### R2 접근 방식 (MUST)

#### MUST: R2 Binding 사용
```typescript
// ✅ CORRECT
const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);

// ❌ WRONG
const response = await fetch(`https://pub-xxx.r2.dev/${r2FilePath}`);  // ❌ egress 비용
```

#### NEVER: Public URL fetch
```typescript
// ❌ WRONG
const r2URL = 'https://pub-44c9a2edf4414428955d5c84edca5fc5.r2.dev/...';
const response = await fetch(r2URL);  // ❌ 느리고 비용 발생

// ✅ CORRECT
const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);  // 빠르고 무료
```

### 캐싱 전략 (MUST)

#### MUST: 목업 파일은 장기 캐시
```typescript
// ✅ CORRECT
return response(longCache(cors({  // 1년 캐시
  data: htmlContent,
  options: {
    contentType: 'text/html; charset=utf-8'
  }
})));

// ❌ WRONG
return response(noCache(cors({  // ❌ no-cache (불필요한 R2 읽기)
  data: htmlContent,
  options: {
    contentType: 'text/html; charset=utf-8'
  }
})));
```

### 에러 응답 (MUST)

#### MUST: core-worker error() 사용
```typescript
// ✅ CORRECT
return response(cors(error('Not Found', 'Path not available')));

// ❌ WRONG
return new Response(JSON.stringify({ error: 'Not Found' }), {  // ❌ core-worker 미사용
  status: 404,
  headers: { 'Content-Type': 'application/json' }
});
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Core Worker 유틸리티**: [../core-worker/README.md](../core-worker/README.md)
- **뉴스 크롤러 (사용 패키지)**: [../news-crawler/CLAUDE.md](../news-crawler/CLAUDE.md)

---

*최종 업데이트: 2025-10-21 - Cloudflare Workers 목업 서버 (R2 Binding + core-worker 패턴)*
