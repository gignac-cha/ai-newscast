# Newscast Scheduler Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. Cloudflare Workers cron 5개 제한 극복
2. 전체 파이프라인 7단계 스케줄 통합 관리
3. Service Binding으로 다른 워커 오케스트레이션
4. 시간 기반 토픽 분산 처리
5. 실패 격리 및 로깅

### 구현 상태
- ✅ **완성** - Cloudflare Workers 통합 스케줄러
- ✅ Service Binding 오케스트레이션
- ✅ 시간 기반 토픽 매핑
- ✅ 수동 트리거 API
- ✅ 실패 격리 에러 처리

---

## 🏗️ 파일 구조 및 역할

```
packages/newscast-scheduler-worker/
├── worker.ts                    # 메인 Worker (scheduled 이벤트 + HTTP 라우팅)
├── wrangler.toml               # Cloudflare 설정 (Service Bindings, Cron)
├── build.ts                    # esbuild 번들링 설정
├── handlers/                   # 단계별 핸들러
│   ├── crawl-topics.ts        # 토픽 크롤링 호출
│   ├── crawl-news-details.ts  # 뉴스 크롤링 호출
│   ├── generate-news.ts       # 뉴스 통합 호출
│   ├── generate-script.ts     # 스크립트 생성 호출
│   ├── generate-audio.ts      # 오디오 생성 호출
│   └── merge-newscast.ts      # 오디오 병합 호출
└── package.json               # 의존성 및 스크립트
```

---

## 🔧 API 및 함수 시그니처

### scheduled 이벤트 핸들러 (worker.ts)
```typescript
export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    const now = new Date();
    const hour = now.getUTCHours();
    const minute = now.getUTCMinutes();

    // 시간 기반 작업 매핑
    if (hour === 9 && minute === 5) {
      await handleCrawlTopics(request, env);
    } else if (hour === 9 && minute >= 10 && minute <= 40) {
      await handleCrawlNewsDetails(request, env);
    } else if (hour === 9 && minute >= 41 && minute <= 50) {
      const topicIndex = minute - 40;  // 41→1, 50→10
      await handleGenerateNews(request, env, topicIndex);
    }
    // ...
  }
}
```

### Service Binding 호출 패턴 (handlers/*.ts)
```typescript
export async function handleGenerateNews(
  request: Request,
  env: Env,
  topicIndex?: number
): Promise<Response> {
  const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
  const topic = topicIndex ?? getTopicFromRequest(request);

  // Service Binding 내부 호출
  const response = await env.NEWS_GENERATOR_WORKER.fetch(
    `https://www.example.com/news?newscast-id=${newscastID}&topic-index=${topic}`,
    { method: 'POST' }
  );

  const result = await response.json();
  return new Response(JSON.stringify({ success: true, result }));
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newscastID`, `topicIndex` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### 시간 기반 토픽 매핑 규칙 (CRITICAL)

#### MUST: UTC 시간 사용
```typescript
// ✅ CORRECT
const now = new Date();
const hour = now.getUTCHours();    // UTC 시간
const minute = now.getUTCMinutes(); // UTC 분

// ❌ WRONG
const hour = now.getHours();        // ❌ 로컬 시간 (서버마다 다름)
```

#### MUST: 토픽 인덱스 계산 (시간 → 토픽 매핑)
```typescript
// ✅ CORRECT - 뉴스 통합 (09:41-09:50)
if (hour === 9 && minute >= 41 && minute <= 50) {
  const topicIndex = minute - 40;  // 41→1, 42→2, ..., 50→10
  await handleGenerateNews(request, env, topicIndex);
}

// ✅ CORRECT - 스크립트 생성 (09:51-09:59, 10:00)
if (hour === 9 && minute >= 51 && minute <= 59) {
  const topicIndex = minute - 50;  // 51→1, 52→2, ..., 59→9
  await handleGenerateScript(request, env, topicIndex);
} else if (hour === 10 && minute === 0) {
  await handleGenerateScript(request, env, 10);  // 토픽 10
}

// ❌ WRONG
const topicIndex = 1;  // ❌ 하드코딩 (모든 시간에 토픽 1만 처리)
```

### Service Binding 호출 규칙

#### MUST: Service Binding fetch 패턴
```typescript
// ✅ CORRECT
const response = await env.NEWS_GENERATOR_WORKER.fetch(
  `http://internal/news?newscast-id=${newscastID}&topic-index=${topicIndex}`,
  { method: 'POST' }
);

if (!response.ok) {
  throw new Error(`Worker returned ${response.status}: ${await response.text()}`);
}

const result = await response.json();

// ❌ WRONG
const response = await env.NEWS_GENERATOR_WORKER.fetch(...);
const result = await response.json();  // ❌ 에러 체크 없음 (4xx/5xx에서 크래시)
```

#### MUST: 더미 URL 사용 (Service Binding은 URL 무시)
```typescript
// ✅ CORRECT
const response = await env.SOME_WORKER.fetch('https://www.example.com/endpoint');
// Service Binding은 URL 호스트를 무시하고 바인딩된 워커로 라우팅

// ✅ ALSO CORRECT
const response = await env.SOME_WORKER.fetch('http://dummy/endpoint');

// ❌ WRONG
const response = await fetch('https://some-worker.workers.dev/endpoint');
// ❌ Service Binding 대신 일반 fetch (느리고 비용 발생)
```

### KV 상태 관리 규칙

#### MUST: newscast-id 읽기 패턴
```typescript
// ✅ CORRECT
const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

if (!newscastID) {
  throw new Error('No newscast-id found in KV');
}

// ❌ WRONG
const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
const url = `http://internal/news?newscast-id=${newscastID}`;  // ❌ null 체크 없음
```

### Cron 스케줄 설계 규칙

#### MUST: 5개 cron 제한 준수
```toml
# ✅ CORRECT
[triggers]
crons = [
  "5 9 * * *",      # 1. 토픽 크롤링
  "10-40 9 * * *",  # 2. 뉴스 크롤링
  "41-50 9 * * *",  # 3. 뉴스 통합
  "51-59 9 * * *",  # 4. 스크립트 생성 (토픽 1-9)
  "0 10 * * *"      # 5. 스크립트 생성 (토픽 10)
]

# ❌ WRONG
[triggers]
crons = [
  "5 9 * * *",      # 1. 토픽 크롤링
  "10-40 9 * * *",  # 2. 뉴스 크롤링
  "41 9 * * *",     # 3. 뉴스 통합 토픽 1
  "42 9 * * *",     # 4. 뉴스 통합 토픽 2
  "43 9 * * *",     # 5. 뉴스 통합 토픽 3
  "44 9 * * *",     # ❌ 6개 (제한 초과)
]
```

#### MUST: 범위 cron 활용
```toml
# ✅ CORRECT
"10-40 9 * * *"   # 09:10-09:40 매분 실행 (31번)

# ❌ WRONG
"10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40 9 * * *"
# ❌ 너무 김 (읽기 어려움)
```

---

## 🚨 에러 처리 방식

### Cron 실행 격리 (CRITICAL)

#### MUST: try/catch로 실패 격리
```typescript
// ✅ CORRECT
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    try {
      const now = new Date();
      const hour = now.getUTCHours();
      const minute = now.getUTCMinutes();

      if (hour === 9 && minute === 5) {
        await handleCrawlTopics(request, env);
      } else if (hour === 9 && minute >= 10 && minute <= 40) {
        await handleCrawlNewsDetails(request, env);
      }
      // ...

    } catch (error) {
      console.error('[Scheduler] Error:', error);
      // ✅ 에러를 삼켜서 다음 cron 계속 실행
    }
  }
}

// ❌ WRONG
export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // ❌ try/catch 없음 (한 단계 실패 시 전체 중단)
    await handleCrawlTopics(request, env);
    await handleCrawlNewsDetails(request, env);
  }
}
```

### 핸들러별 에러 응답

```typescript
// ✅ CORRECT
export async function handleGenerateNews(
  request: Request,
  env: Env,
  topicIndex?: number
): Promise<Response> {
  try {
    const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

    if (!newscastID) {
      return new Response(JSON.stringify({
        success: false,
        error: 'No newscast-id found in KV'
      }), { status: 404 });
    }

    const response = await env.NEWS_GENERATOR_WORKER.fetch(...);

    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    const result = await response.json();

    return new Response(JSON.stringify({
      success: true,
      result
    }), { status: 200 });

  } catch (error) {
    console.error('[handleGenerateNews] Error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }), { status: 500 });
  }
}

// ❌ WRONG
export async function handleGenerateNews(...): Promise<Response> {
  const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
  const response = await env.NEWS_GENERATOR_WORKER.fetch(...);
  const result = await response.json();
  return new Response(JSON.stringify(result));  // ❌ 에러 처리 없음
}
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.log(`[Scheduler] Triggered at ${hour}:${minute} UTC`);
console.log('[Scheduler] Executing: Crawl Topics');
console.log(`[Scheduler] Executing: Generate News (topic ${topicIndex})`);
console.log(`[Scheduler] Success: ${JSON.stringify(result)}`);
console.error(`[Scheduler] Error in handleGenerateNews: ${error.message}`);

// ❌ WRONG
console.log('Executing...');  // ❌ 구체적 정보 없음
console.log(result);  // ❌ 객체 직접 출력 (CloudWatch에서 [object Object]로 표시)
```

---

## 🔗 다른 패키지와의 의존성

### Service Binding 관계
- **news-crawler-worker**: 토픽/뉴스 크롤링 호출
- **news-generator-worker**: 뉴스 통합 호출
- **newscast-generator-worker**: 스크립트/오디오 생성 호출

### wrangler.toml 설정

```toml
# ✅ CORRECT
[[services]]
binding = "NEWS_CRAWLER_WORKER"
service = "news-crawler-worker"
environment = "production"  # 옵션

[[services]]
binding = "NEWS_GENERATOR_WORKER"
service = "news-generator-worker"

[[services]]
binding = "NEWSCAST_GENERATOR_WORKER"
service = "newscast-generator-worker"

# ❌ WRONG
[[services]]
binding = "NEWS_CRAWLER"  # ❌ 일관성 없는 네이밍
service = "news-crawler-worker"
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Cron 설계 제약 (MUST)

#### MUST: 무료 플랜 5개 cron 제한
```toml
# ✅ CORRECT - 5개
[triggers]
crons = [
  "5 9 * * *",
  "10-40 9 * * *",
  "41-50 9 * * *",
  "51-59 9 * * *",
  "0 10 * * *"
]

# ❌ WRONG - 6개 (배포 실패)
[triggers]
crons = [
  "5 9 * * *",
  "10-40 9 * * *",
  "41-50 9 * * *",
  "51-59 9 * * *",
  "0 10 * * *",
  "1-10 10 * * *"  # ❌ 6번째 cron
]
```

#### MUST: 범위 표현식 활용
```toml
# ✅ CORRECT
"10-40 9 * * *"   # 1개 cron으로 31분 커버

# ❌ WRONG
"10 9 * * *"
"11 9 * * *"
...
"40 9 * * *"      # ❌ 31개 cron (제한 초과)
```

### Service Binding 제약 (MUST)

#### MUST: 바인딩 이름과 환경변수 일치
```typescript
// ✅ CORRECT
// wrangler.toml: binding = "NEWS_CRAWLER_WORKER"
const response = await env.NEWS_CRAWLER_WORKER.fetch(...);

// ❌ WRONG
// wrangler.toml: binding = "NEWS_CRAWLER_WORKER"
const response = await env.NEWS_CRAWLER.fetch(...);  // ❌ 이름 불일치
```

#### NEVER: 일반 fetch 사용 (Service Binding 대신)
```typescript
// ❌ WRONG
const response = await fetch(
  'https://news-crawler-worker.workers.dev/topics'  // ❌ 일반 fetch (느리고 비용 발생)
);

// ✅ CORRECT
const response = await env.NEWS_CRAWLER_WORKER.fetch(
  'https://www.example.com/topics'  // Service Binding 사용 (빠르고 무료)
);
```

### 에러 처리 제약 (MUST)

#### MUST: 실패 격리 (한 단계 실패해도 다음 cron 실행)
```typescript
// ✅ CORRECT
try {
  await handleCrawlTopics(request, env);
} catch (error) {
  console.error('[Scheduler] Crawl Topics failed:', error);
  // ✅ 에러를 삼켜서 다음 cron 실행 보장
}

// ❌ WRONG
await handleCrawlTopics(request, env);  // ❌ 에러 시 전체 중단
```

#### NEVER: 재시도 로직 (다음날 cron이 자동 재시도)
```typescript
// ❌ WRONG
for (let i = 0; i < 3; i++) {
  try {
    await handleCrawlTopics(request, env);
    break;
  } catch (error) {
    if (i === 2) throw error;  // ❌ 재시도 (불필요)
  }
}

// ✅ CORRECT
try {
  await handleCrawlTopics(request, env);
} catch (error) {
  console.error('[Scheduler] Failed:', error);
  // ✅ 다음날 동일 시간에 cron이 자동 재시도
}
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Service Binding 대상 워커**:
  - [../news-crawler-worker/CLAUDE.md](../news-crawler-worker/CLAUDE.md)
  - [../news-generator-worker/CLAUDE.md](../news-generator-worker/CLAUDE.md)
  - [../newscast-generator-worker/CLAUDE.md](../newscast-generator-worker/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - Cloudflare Workers 통합 스케줄러 (Service Binding 오케스트레이션)*
