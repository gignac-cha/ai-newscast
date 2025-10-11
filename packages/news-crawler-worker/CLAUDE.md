# News Crawler Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. 빅카인드에서 트렌딩 토픽 10개 추출
2. 토픽별 뉴스 목록 수집
3. 개별 뉴스 상세정보 크롤링 (큐 기반 배치)
4. R2에 구조화된 데이터 저장
5. KV로 처리 진행상황 추적

### 구현 상태
- ✅ **완성** - Cloudflare Workers API
- ✅ 토픽 자동 수집
- ✅ 큐 기반 배치 처리
- ✅ R2 + KV 통합
- ✅ Cron Triggers 스케줄링

---

## 🏗️ 파일 구조 및 역할

```
packages/news-crawler-worker/
├── worker.ts               # 메인 Worker 엔트리포인트 (라우팅)
├── wrangler.toml          # Cloudflare 설정 (R2, KV, Cron)
├── build.ts               # esbuild 번들링 설정
├── handlers/              # API 핸들러
│   ├── help.ts           # GET / - 헬프 메시지
│   ├── status.ts         # GET /status - 서비스 상태
│   ├── topics.ts         # GET /topics - 토픽 수집
│   └── details.ts        # GET /details - 뉴스 상세정보 배치
└── package.json          # 의존성 및 스크립트
```

---

## 🔧 API 및 함수 시그니처

### GET /status (handlers/status.ts)
```typescript
export async function handleStatus(
  request: Request,
  env: Env
): Promise<Response>

// 응답 예시
{
  status: "healthy",
  service: "news-crawler-worker",
  version: "1.0.0",
  timestamp: "2025-10-05T10:00:00.000Z",
  environment: {
    hasBucket: true,
    hasKV: true
  }
}
```

### GET /topics (handlers/topics.ts)
```typescript
export async function handleTopics(
  request: Request,
  env: Env
): Promise<Response>

// 쿼리 파라미터
interface TopicsParams {
  save?: boolean;  // ?save=true (R2 저장 여부)
}

// R2 출력 경로
newscasts/{newscastID}/topics.json
newscasts/{newscastID}/news-list.json
newscasts/{newscastID}/topic-{NN}/news-list.json
```

### GET /details (handlers/details.ts)
```typescript
export async function handleDetails(
  request: Request,
  env: Env
): Promise<Response>

// 필수 파라미터
interface DetailsParams {
  newscastID: string;  // ?newscast-id=2025-10-05T10-00-00-000Z
}

// R2 출력 경로
newscasts/{newscastID}/topic-{NN}/news/{newsID}.json
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newscastID`, `topicIndex` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### 크롤링 함수 import 규칙

#### MUST: @ai-newscast/news-crawler import
```typescript
// ✅ CORRECT
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics.ts';
import { crawlNewsDetails } from '@ai-newscast/news-crawler/crawl-news-detail.ts';
import type { CrawlTopicsResult, NewsDetail } from '@ai-newscast/news-crawler/crawl-news-topics.ts';

// ❌ WRONG
import { crawlNewsTopics } from '@ai-newscast/news-crawler';  // ❌ .ts 생략
```

### R2 경로 규칙

#### MUST: newscastID 생성 (ISO 타임스탬프)
```typescript
// ✅ CORRECT
const now = new Date();
const newscastID = now.toISOString().replace(/:/g, '-').replace(/\./g, '-');
// 예: "2025-10-05T10-00-00-000Z"

// ❌ WRONG
const newscastID = Date.now().toString();  // ❌ Unix timestamp (가독성 낮음)
```

#### MUST: 토픽 패딩
```typescript
// ✅ CORRECT
const topicPadded = topicIndex.toString().padStart(2, '0');  // 01, 02, ..., 10
const r2Path = `newscasts/${newscastID}/topic-${topicPadded}/news-list.json`;

// ❌ WRONG
const r2Path = `newscasts/${newscastID}/topic-${topicIndex}/news-list.json`;  // ❌ topic-1 (패딩 없음)
```

### KV 큐 관리 규칙

#### MUST: 큐 인덱스 읽기/쓰기
```typescript
// ✅ CORRECT
const KV_KEY = `${newscastID}:last-working-news-queue-index`;

// 읽기
const lastIndexStr = await env.AI_NEWSCAST_KV.get(KV_KEY);
const currentIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : 0;

// 쓰기
const newIndex = currentIndex + BATCH_SIZE;
await env.AI_NEWSCAST_KV.put(KV_KEY, newIndex.toString());

// ❌ WRONG
const currentIndex = await env.AI_NEWSCAST_KV.get(KV_KEY);  // ❌ 타입 불일치 (string|null)
const newIndex = currentIndex + BATCH_SIZE;  // ❌ NaN 위험
```

#### MUST: 배치 크기 제한
```typescript
// ✅ CORRECT
const BATCH_SIZE = 40;  // Workers 제약과 성능 균형

const batch = newsListItems.slice(currentIndex, currentIndex + BATCH_SIZE);

if (batch.length === 0) {
  return new Response(JSON.stringify({
    message: 'All items processed',
    current_index: currentIndex,
    total_items: newsListItems.length
  }), { status: 200 });
}

// ❌ WRONG
const batch = newsListItems;  // ❌ 전체 처리 (타임아웃 위험)
```

### 배치 처리 병렬화 규칙

#### MUST: 서브 배치 병렬 처리 (Workers Subrequest 제한)
```typescript
// ✅ CORRECT
const SUB_BATCH_SIZE = 10;  // Subrequest 제한 (50개) 준수

for (let i = 0; i < batch.length; i += SUB_BATCH_SIZE) {
  const subBatch = batch.slice(i, i + SUB_BATCH_SIZE);

  const results = await Promise.allSettled(
    subBatch.map(item => crawlNewsDetails(item.newsID, newscastID, item.topicIndex))
  );

  for (const result of results) {
    if (result.status === 'fulfilled') {
      successCount++;
      await saveToR2(env, result.value);
    } else {
      failureCount++;
      console.error(`[ERROR] Failed to crawl: ${result.reason}`);
    }
  }
}

// ❌ WRONG
const results = await Promise.allSettled(
  batch.map(item => crawlNewsDetails(...))  // ❌ 40개 동시 처리 (Subrequest 초과)
);
```

### Cron Triggers 규칙

#### MUST: Cron 타입별 핸들러 분기
```typescript
// ✅ CORRECT
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    const cron = event.cron;  // "5 9 * * *" 또는 "10-40 9 * * *"

    if (cron === '5 9 * * *') {
      // 토픽 수집
      const request = new Request('https://dummy.local/topics?save=true');
      return handleTopics(request, env);
    } else if (cron.startsWith('10-40')) {
      // 뉴스 상세정보 배치 처리
      const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
      const request = new Request(`https://dummy.local/details?newscast-id=${newscastID}`);
      return handleDetails(request, env);
    }
  }
}

// ❌ WRONG
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    await handleTopics(...);  // ❌ 모든 Cron에서 토픽 수집 (중복 실행)
  }
}
```

---

## 🚨 에러 처리 방식

### Workers 표준 에러 응답

```typescript
// ✅ CORRECT
export async function handleDetails(request: Request, env: Env): Promise<Response> {
  try {
    // 파라미터 검증
    const url = new URL(request.url);
    const newscastID = url.searchParams.get('newscast-id');

    if (!newscastID) {
      return new Response(JSON.stringify({
        error: 'Missing required parameter: newscast-id'
      }), { status: 400 });
    }

    // R2에서 news-list.json 읽기
    const newsListPath = `newscasts/${newscastID}/news-list.json`;
    const newsListObject = await env.AI_NEWSCAST_BUCKET.get(newsListPath);

    if (!newsListObject) {
      return new Response(JSON.stringify({
        error: `File not found: ${newsListPath}`
      }), { status: 404 });
    }

    // 배치 처리
    const batch = await processBatch(env, newscastID);

    return new Response(JSON.stringify({
      success: true,
      processed_batch_size: batch.length
    }), { status: 200 });

  } catch (error) {
    console.error('[ERROR]', error.message);
    return new Response(JSON.stringify({
      error: error.message,
      status: 500
    }), { status: 500 });
  }
}

// ❌ WRONG
export async function handleDetails(request: Request, env: Env): Promise<Response> {
  const result = await processBatch(...);  // ❌ try/catch 없음
  return new Response(JSON.stringify(result));
}
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.log(`[INFO] Processing newscast: ${newscastID}`);
console.log(`[INFO] Current index: ${currentIndex}, batch size: ${BATCH_SIZE}`);
console.log(`[INFO] Processing batch: ${currentIndex}-${currentIndex + batch.length - 1}`);
console.log(`[INFO] Success: ${successCount}, Failure: ${failureCount}`);
console.error(`[ERROR] Failed to crawl news ${newsID}: ${error.message}`);

// ❌ WRONG
console.log('Processing...');  // ❌ 구체적 정보 없음
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **@ai-newscast/news-crawler**: TypeScript 크롤링 함수 (crawlNewsTopics, crawlNewsDetails)
- **@ai-newscast/core**: 공통 타입 정의
- **news-generator-worker**: 다음 파이프라인 단계 (뉴스 통합)

### Import 패턴

```typescript
// ✅ CORRECT
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics.ts';
import { crawlNewsDetails } from '@ai-newscast/news-crawler/crawl-news-detail.ts';
import type { CrawlTopicsResult } from '@ai-newscast/news-crawler/crawl-news-topics.ts';

// ❌ WRONG
import { crawlNewsTopics } from '@ai-newscast/news-crawler';  // ❌ .ts 생략
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Cloudflare Workers 제약 (MUST)

#### MUST: CPU 시간 제한 (30초)
```typescript
// ✅ CORRECT
const BATCH_SIZE = 40;  // 30초 내 처리 가능한 배치 크기

// ❌ WRONG
const BATCH_SIZE = 1000;  // ❌ 타임아웃 위험
```

#### MUST: Subrequest 제한 (50개/요청)
```typescript
// ✅ CORRECT
const SUB_BATCH_SIZE = 10;  // 서브 배치로 분산

for (let i = 0; i < batch.length; i += SUB_BATCH_SIZE) {
  await Promise.allSettled(subBatch.map(...));  // 10개씩 병렬
}

// ❌ WRONG
await Promise.allSettled(batch.map(...));  // ❌ 40개 동시 (Subrequest 초과)
```

### R2 스토리지 규칙 (MUST)

#### MUST: JSON httpMetadata 설정
```typescript
// ✅ CORRECT
await env.AI_NEWSCAST_BUCKET.put(
  path,
  JSON.stringify(data),
  { httpMetadata: { contentType: 'application/json' } }
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(path, JSON.stringify(data));  // ❌ Content-Type 없음
```

#### MUST: 토픽별 디렉터리 구조
```typescript
// ✅ CORRECT
const newsPath = `newscasts/${newscastID}/topic-${topicPadded}/news/${newsID}.json`;

// ❌ WRONG
const newsPath = `newscasts/${newscastID}/news/${newsID}.json`;  // ❌ 토픽 구분 없음
```

### KV 스토리지 규칙 (MUST)

#### MUST: 키 네이밍 컨벤션
```typescript
// ✅ CORRECT
const KV_NEWSCAST_ID = 'last-working-newscast-id';
const KV_QUEUE_INDEX = `${newscastID}:last-working-news-queue-index`;

// ❌ WRONG
const KV_KEY = 'queue';  // ❌ 너무 일반적 (충돌 위험)
```

#### NEVER: KV 값을 숫자로 직접 저장
```typescript
// ❌ WRONG
await env.AI_NEWSCAST_KV.put(key, newIndex);  // ❌ 타입 에러 (number)

// ✅ CORRECT
await env.AI_NEWSCAST_KV.put(key, newIndex.toString());  // string으로 변환
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **핵심 크롤러**: [../news-crawler/CLAUDE.md](../news-crawler/CLAUDE.md)
- **Core 타입**: [../core/CLAUDE.md](../core/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - Cloudflare Workers API (큐 기반 배치 크롤링)*
