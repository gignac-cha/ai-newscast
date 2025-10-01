# Newscast Scheduler Worker Package - AI Development Guide

Claude에게: 이 패키지는 Cloudflare Workers 무료 플랜의 cron 제한(5개)을 극복하기 위한 통합 스케줄러입니다. 사용자 친화적 정보는 README.md를 참조하세요. 이 문서는 스케줄 매핑 전략, 워커 오케스트레이션, 에러 처리에 집중합니다.

## 🏗️ 아키텍처 설계

**핵심 원칙:**
- **Cron 통합**: 각 워커의 개별 cron을 하나로 모아 5개 제한 준수
- **시간 기반 매핑**: cron 시간(시:분)으로 실행할 작업 결정
- **Service Binding 오케스트레이션**: 내부 호출로 다른 워커들 실행 (HTTP 대비 빠르고 비용 무료)
- **실패 격리**: 한 단계 실패해도 다음 cron 계속 실행

**설계 배경:**
- Cloudflare Workers 무료 플랜: cron 최대 5개
- 기존: 각 워커마다 cron 설정 (총 10개 이상)
- 해결: 통합 스케줄러 1개로 모든 작업 조율

## 📋 스케줄 매핑 전략

### Cron Schedule (5개)
```toml
[triggers]
crons = [
  "5 9 * * *",      # 1. 09:05 - Crawl Topics
  "10-40 9 * * *",  # 2. 09:10-09:40 - Crawl News Details (31분)
  "41-50 9 * * *",  # 3. 09:41-09:50 - Generate News (10분, 토픽 1-10)
  "51-59 9 * * *",  # 4. 09:51-09:59 - Generate Script (9분, 토픽 1-9)
  "0 10 * * *"      # 5. 10:00 - Generate Script (토픽 10)
]
```

### 시간별 작업 매핑

#### 09:05 - Crawl Topics
```typescript
if (hour === 9 && minute === 5) {
  await handleCrawlTopics(request, env);
}
```
- 호출: `news-crawler-worker/topics?save=true`
- 결과: KV에 `last-working-newscast-id` 저장

#### 09:10-09:40 - Crawl News Details (매분)
```typescript
if (hour === 9 && minute >= 10 && minute <= 40) {
  await handleCrawlNewsDetails(request, env);
}
```
- 호출: `news-crawler-worker/news-details?newscast-id={id}`
- 처리: 매분 40개 뉴스 배치 처리
- 총량: 31분 × 40개 = 최대 1,240개

#### 09:41-09:50 - Generate News (토픽별)
```typescript
if (hour === 9 && minute >= 41 && minute <= 50) {
  const topicIndex = minute - 40; // 41분 → 1, 50분 → 10
  await handleGenerateNews(request, env, topicIndex);
}
```
- 호출: `news-generator-worker/generate?newscast-id={id}&topic-index={N}`
- 분산: 분당 1개 토픽 (09:41 → 토픽 1, ..., 09:50 → 토픽 10)

#### 09:51-09:59 - Generate Script (토픽 1-9)
```typescript
if (hour === 9 && minute >= 51 && minute <= 59) {
  const topicIndex = minute - 50; // 51분 → 1, 59분 → 9
  await handleGenerateScript(request, env, topicIndex);
}
```
- 호출: `newscast-generator-worker/script?newscast-id={id}&topic-index={N}`
- 분산: 분당 1개 토픽 (09:51 → 토픽 1, ..., 09:59 → 토픽 9)

#### 10:00 - Generate Script (토픽 10)
```typescript
if (hour === 10 && minute === 0) {
  await handleGenerateScript(request, env, 10);
}
```
- 호출: `newscast-generator-worker/script?newscast-id={id}&topic-index=10`
- 이유: 09:51-09:59 범위로 토픽 10 커버 불가

## 🔧 핸들러 구조

### handlers/crawl-topics.ts
```typescript
export async function handleCrawlTopics(request: Request, env: Env): Promise<Response> {
  // Service Binding을 통한 내부 호출 (HTTP 대비 빠름)
  const response = await env.NEWS_CRAWLER_WORKER.fetch('http://internal/topics?save=true', {
    method: 'GET',
  });
  const result = await response.json();

  return new Response(JSON.stringify({ success: true, result }));
}
```

**책임:**
- Service Binding으로 news-crawler-worker의 `/topics` 엔드포인트 호출
- 결과 로깅 및 반환

### handlers/crawl-news-details.ts
```typescript
export async function handleCrawlNewsDetails(request: Request, env: Env): Promise<Response> {
  const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

  // Service Binding을 통한 내부 호출
  const response = await env.NEWS_CRAWLER_WORKER.fetch(`http://internal/news-details?newscast-id=${newscastID}`, {
    method: 'GET',
  });
  const result = await response.json();

  return new Response(JSON.stringify({ success: true, result }));
}
```

**책임:**
- KV에서 최신 newscast-id 읽기
- Service Binding으로 news-crawler-worker의 `/news-details` 엔드포인트 호출

### handlers/generate-news.ts
```typescript
export async function handleGenerateNews(
  request: Request,
  env: Env,
  topicIndex?: number
): Promise<Response> {
  const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
  const topic = topicIndex ?? getTopicFromRequest(request);

  // Service Binding을 통한 내부 호출
  const response = await env.NEWS_GENERATOR_WORKER.fetch(`http://internal/generate?newscast-id=${newscastID}&topic-index=${topic}`, {
    method: 'POST',
  });
  const result = await response.json();

  return new Response(JSON.stringify({ success: true, result }));
}
```

**책임:**
- 시간 기반 토픽 인덱스 계산 (09:41 → 1, 09:42 → 2, ...)
- Service Binding으로 news-generator-worker의 `/generate` 엔드포인트 호출

### handlers/generate-script.ts
```typescript
export async function handleGenerateScript(
  request: Request,
  env: Env,
  topicIndex?: number
): Promise<Response> {
  const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
  const topic = topicIndex ?? getTopicFromRequest(request);

  // Service Binding을 통한 내부 호출
  const response = await env.NEWSCAST_GENERATOR_WORKER.fetch(`http://internal/script?newscast-id=${newscastID}&topic-index=${topic}`, {
    method: 'GET',
  });
  const result = await response.json();

  return new Response(JSON.stringify({ success: true, result }));
}
```

**책임:**
- 시간 기반 토픽 인덱스 계산 (09:51 → 1, ..., 10:00 → 10)
- Service Binding으로 newscast-generator-worker의 `/script` 엔드포인트 호출

## 🚨 에러 처리 전략

### Cron 실행 격리
```typescript
async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
  try {
    // 각 시간대별 작업 실행
    if (hour === 9 && minute === 5) {
      await handleCrawlTopics(request, env);
    }
    // ...
  } catch (error) {
    console.error('[Scheduler] Error:', error);
    // 에러를 삼켜서 다음 cron 계속 실행
  }
}
```

**원칙:**
- **실패 격리**: 한 단계 실패해도 다음 cron은 계속 실행
- **로깅**: 모든 에러는 CloudWatch Logs에 기록
- **재시도 없음**: 다음날 동일 시간에 자동 재시도

### 핸들러별 에러 응답
```typescript
try {
  // Service Binding을 통한 내부 호출
  const response = await env.SOME_WORKER.fetch('http://internal/endpoint');
  const result = await response.json();
  return new Response(JSON.stringify({ success: true, result }));
} catch (error) {
  return new Response(JSON.stringify({
    success: false,
    error: error.message,
    timestamp: new Date().toISOString(),
  }), { status: 500 });
}
```

## 🔄 수동 트리거 (테스트용)

### HTTP 엔드포인트
```typescript
// Manual trigger endpoints
if (url.pathname === '/trigger/crawl-topics') {
  return handleCrawlTopics(request, env);
}

if (url.pathname === '/trigger/generate-news') {
  return handleGenerateNews(request, env);
}
```

**사용 예시:**
```bash
# 토픽 크롤링 수동 실행
curl https://newscast-scheduler-worker.workers.dev/trigger/crawl-topics

# 뉴스 생성 수동 실행 (토픽 1)
curl https://newscast-scheduler-worker.workers.dev/trigger/generate-news?topic-index=1

# 스크립트 생성 수동 실행 (토픽 5)
curl https://newscast-scheduler-worker.workers.dev/trigger/generate-script?topic-index=5
```

## 📊 모니터링

### CloudWatch Logs 패턴
```typescript
console.log(`[Scheduler] Triggered at ${hour}:${minute} UTC`);
console.log('[Scheduler] Executing: Crawl Topics');
console.log(`[Scheduler] Executing: Generate News (topic ${topicIndex})`);
console.error('[Scheduler] Error:', error);
```

### 로그 검색 쿼리
```bash
# 특정 단계 실행 확인
wrangler tail --format pretty | grep "Executing: Crawl Topics"

# 에러만 필터링
wrangler tail --format pretty | grep "Error"

# 특정 토픽 처리 확인
wrangler tail --format pretty | grep "topic 5"
```

## 🔐 환경변수 관리

### wrangler.toml
```toml
[vars]
NEWS_CRAWLER_WORKER_URL = "https://ai-newscast-news-crawler-worker.r-s-account.workers.dev"
NEWS_GENERATOR_WORKER_URL = "https://ai-newscast-news-generator-worker.r-s-account.workers.dev"
NEWSCAST_GENERATOR_WORKER_URL = "https://ai-newscast-newscast-generator-worker.r-s-account.workers.dev"
```

**보안:**
- Worker URL은 public (인증 불필요)
- KV는 바인딩으로 자동 주입
- API 키는 각 워커에서 개별 관리

## 🚀 배포

### 초기 배포
```bash
# 1. 빌드
pnpm build

# 2. Cloudflare 배포
pnpm run deploy

# 3. 배포 확인
curl https://newscast-scheduler-worker.workers.dev/health
```

### 업데이트 배포
```bash
# 코드 수정 후
pnpm build && pnpm run deploy
```

## 🔄 개발 워크플로우

### 로컬 테스트
```bash
# 1. 개발 서버 시작
pnpm run dev

# 2. 수동 트리거 테스트
curl http://localhost:8787/trigger/crawl-topics
curl http://localhost:8787/trigger/generate-news?topic-index=1

# 3. 헬프 메시지 확인
curl http://localhost:8787/
```

### Cron 시뮬레이션
```bash
# scheduled 이벤트는 로컬에서 테스트 불가
# 수동 트리거로 각 단계 개별 테스트
```

## 💡 설계 결정 사항

### Q: 왜 시간 기반 토픽 매핑인가?
**A:** Cron 표현식으로 토픽 인덱스를 직접 전달할 수 없어서 시간(분)으로 매핑

### Q: 왜 토픽 10만 별도 cron인가?
**A:** `51-59 9 * * *`는 9분 범위로 토픽 10을 커버할 수 없음

### Q: 왜 에러를 삼키는가?
**A:** 한 단계 실패해도 다음 cron은 실행되어야 파이프라인 지속 가능

### Q: 왜 재시도 로직이 없는가?
**A:** 매일 동일 시간 cron으로 자동 재시도됨

---
*최종 업데이트: 2025-09-30 - Newscast Scheduler Worker 초기 구현*
