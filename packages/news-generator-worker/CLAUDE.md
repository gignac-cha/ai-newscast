# News Generator Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. R2에서 토픽별 크롤링된 뉴스 기사 읽기
2. Gemini AI로 여러 기사를 하나의 통합 뉴스로 합성
3. @ai-newscast/news-generator 순수 함수 활용
4. R2에 JSON 및 Markdown 저장
5. Cron Triggers로 토픽별 자동 생성 스케줄링

### 구현 상태
- ✅ **완성** - Cloudflare Workers API
- ✅ Gemini AI 통합
- ✅ 순수 함수 라이브러리 활용
- ✅ 토픽별 분산 스케줄링 (09:41-09:50)

---

## 🏗️ 파일 구조 및 역할

```
packages/news-generator-worker/
├── worker.ts               # 메인 Worker 엔트리포인트 (라우팅)
├── wrangler.toml          # Cloudflare 설정 (R2, KV, Cron)
├── build.ts               # esbuild 번들링 설정 (.md import)
├── handlers/              # API 핸들러
│   ├── help.ts           # GET / - 헬프 메시지
│   ├── news.ts           # POST /news - 뉴스 통합 생성
│   └── status.ts         # GET /status - 생성 상태
└── package.json          # 의존성 및 스크립트
```

---

## 🔧 API 및 함수 시그니처

### POST /news (handlers/news.ts)
```typescript
export async function handleNews(
  request: Request,
  env: Env
): Promise<Response>

// 필수 파라미터
interface NewsParams {
  newscastID: string;      // ?newscast-id=2025-10-05T10-00-00-000Z
  topicIndex: number;      // ?topic-index=1
}

// R2 입력 경로
newscasts/{newscastID}/topic-{NN}/news/*.json

// R2 출력 경로
newscasts/{newscastID}/topic-{NN}/news.json
newscasts/{newscastID}/topic-{NN}/news.md
```

### GET /status (handlers/status.ts)
```typescript
export async function handleStatus(
  request: Request,
  env: Env
): Promise<Response>

// 응답 예시
{
  success: true,
  newscast_id: "2025-10-05T10-00-00-000Z",
  total_topics: 10,
  generated_topics: 3,
  completion_percentage: 30,
  topics: [
    {
      topic_index: 1,
      generated: true,
      has_json: true,
      has_markdown: true
    }
  ]
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newscastID`, `topicIndex` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### 순수 함수 활용 규칙 (CRITICAL)

#### MUST: @ai-newscast/news-generator import
```typescript
// ✅ CORRECT
import { generateNews, formatAsMarkdown } from '@ai-newscast/news-generator/news-generator.ts';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';
import type { NewsDetail, GeneratedNews } from '@ai-newscast/news-generator/news-generator.ts';

// ❌ WRONG
import { generateNews } from '@ai-newscast/news-generator';  // ❌ .ts 생략
```

#### MUST: 순수 함수만 호출 (Worker에서 파일 I/O 없음)
```typescript
// ✅ CORRECT
const newsDetails: NewsDetail[] = await readNewsFromR2(env, newscastID, topicIndex);

const result = await generateNews(
  newsDetails,
  newsConsolidationPrompt,
  env.GOOGLE_GEN_AI_API_KEY
);

const markdownContent = formatAsMarkdown(result.generatedNews);

// ❌ WRONG
import { generateNewsFromFiles } from '@ai-newscast/news-generator/command.ts';
await generateNewsFromFiles('./input', './output');  // ❌ CLI 함수 (파일 I/O)
```

### R2 경로 규칙

#### MUST: 토픽 패딩
```typescript
// ✅ CORRECT
const topicPadded = topicIndex.toString().padStart(2, '0');  // 01, 02, ..., 10
const newsPath = `newscasts/${newscastID}/topic-${topicPadded}/news`;

// ❌ WRONG
const newsPath = `newscasts/${newscastID}/topic-${topicIndex}/news`;  // ❌ topic-1 (패딩 없음)
```

#### MUST: R2 리스트 객체 처리
```typescript
// ✅ CORRECT
const listResult = await env.AI_NEWSCAST_BUCKET.list({
  prefix: `newscasts/${newscastID}/topic-${topicPadded}/news/`
});

const newsDetails: NewsDetail[] = [];

for (const object of listResult.objects) {
  if (object.key.endsWith('.json')) {
    const r2Object = await env.AI_NEWSCAST_BUCKET.get(object.key);
    if (r2Object) {
      const newsData = await r2Object.json();
      newsDetails.push(newsData);
    }
  }
}

if (newsDetails.length === 0) {
  return new Response(JSON.stringify({
    error: `No news articles found in ${newsPath}`
  }), { status: 404 });
}

// ❌ WRONG
const newsDetails = listResult.objects.map(obj => obj.json());  // ❌ 동기 처리 불가
```

### Gemini API 호출 규칙

#### MUST: 순수 함수로 캡슐화
```typescript
// ✅ CORRECT - news-generator.ts 순수 함수 사용
const result = await generateNews(
  newsDetails,
  newsConsolidationPrompt,
  env.GOOGLE_GEN_AI_API_KEY
);

// result.generatedNews: GeneratedNews 객체
// result.executionTime: 밀리세컨드

// ❌ WRONG - Worker에서 직접 Gemini API 호출
import { GoogleGenerativeAI } from '@google/genai';
const genAI = new GoogleGenerativeAI(env.GOOGLE_GEN_AI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-pro-exp' });
// ... 직접 프롬프트 구성 및 호출 (코드 중복, 일관성 저하)
```

### Cron Triggers 규칙

#### MUST: 토픽 인덱스 계산 (시간 기반)
```typescript
// ✅ CORRECT
const currentHour = new Date().getUTCHours();
const currentMinute = new Date().getUTCMinutes();

let topicIndex: number;

if (currentHour === 9 && currentMinute >= 41 && currentMinute <= 49) {
  topicIndex = currentMinute - 40;  // 41→1, 42→2, ..., 49→9
} else if (currentHour === 9 && currentMinute === 50) {
  topicIndex = 10;
} else {
  throw new Error('Invalid cron execution time');
}

// ❌ WRONG
const topicIndex = 1;  // ❌ 하드코딩 (모든 Cron에서 토픽 1만 생성)
```

---

## 🚨 에러 처리 방식

### Workers 표준 에러 응답

```typescript
// ✅ CORRECT
export async function handleNews(request: Request, env: Env): Promise<Response> {
  try {
    // 파라미터 검증
    const { newscastID, topicIndex } = validateParams(request);

    // R2에서 뉴스 읽기
    const newsDetails = await readNewsFromR2(env, newscastID, topicIndex);

    // 순수 함수 호출
    const result = await generateNews(
      newsDetails,
      newsConsolidationPrompt,
      env.GOOGLE_GEN_AI_API_KEY
    );

    // R2에 저장
    await saveToR2(env, newscastID, topicIndex, result);

    return new Response(JSON.stringify({
      success: true,
      newscast_id: newscastID,
      topic_index: topicIndex,
      input_articles_count: newsDetails.length,
      execution_time_ms: result.executionTime
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
export async function handleNews(request: Request, env: Env): Promise<Response> {
  const result = await generateNews({...});  // ❌ try/catch 없음
  return new Response(JSON.stringify(result));
}
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.log(`[INFO] Processing newscast: ${newscastID}, topic: ${topicIndex}`);
console.log(`[INFO] Found ${newsDetails.length} articles`);
console.log(`[INFO] Calling Gemini API...`);
console.log(`[INFO] Generated news: ${result.generatedNews.title}`);
console.log(`[INFO] Execution time: ${result.executionTime}ms`);

// ❌ WRONG
console.log('Processing...');  // ❌ 구체적 정보 없음
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **@ai-newscast/news-generator**: 순수 함수 라이브러리 (generateNews, formatAsMarkdown)
- **@ai-newscast/core**: 공통 타입 정의
- **news-crawler-worker**: 이전 파이프라인 단계 (뉴스 크롤링)
- **newscast-generator-worker**: 다음 파이프라인 단계 (스크립트 생성)

### Import 패턴

```typescript
// ✅ CORRECT
import { generateNews, formatAsMarkdown } from '@ai-newscast/news-generator/news-generator.ts';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';
import type { GeneratedNews } from '@ai-newscast/core';

// ❌ WRONG
import { generateNews } from '@ai-newscast/news-generator';  // ❌ .ts 생략
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Cloudflare Workers 제약 (MUST)

#### MUST: CPU 시간 제한 (30초)
```typescript
// ✅ CORRECT
// Gemini API 응답 시간은 보통 10-20초
const result = await generateNews(newsDetails, promptTemplate, apiKey);

// ❌ WRONG
// 100개 파일 순차 처리 (30초 초과 위험)
for (let i = 0; i < 100; i++) {
  await processFile(i);  // ❌ 타임아웃 위험
}
```

#### NEVER: 파일 시스템 접근
```typescript
// ❌ WRONG
import { readFileSync } from 'fs';
const data = readFileSync('./input.json');  // ❌ Workers에서 불가능

// ✅ CORRECT - R2 사용
const r2Object = await env.AI_NEWSCAST_BUCKET.get(path);
const data = await r2Object.json();
```

### R2 스토리지 규칙 (MUST)

#### MUST: JSON과 Markdown 둘 다 저장
```typescript
// ✅ CORRECT
await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/news.json`,
  JSON.stringify(result.generatedNews)
);

const markdownContent = formatAsMarkdown(result.generatedNews);
await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/news.md`,
  markdownContent
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/news.json`,
  JSON.stringify(result.generatedNews)
);  // ❌ Markdown 누락
```

#### MUST: httpMetadata 설정
```typescript
// ✅ CORRECT
await env.AI_NEWSCAST_BUCKET.put(
  path,
  jsonString,
  { httpMetadata: { contentType: 'application/json' } }
);

await env.AI_NEWSCAST_BUCKET.put(
  path,
  markdownString,
  { httpMetadata: { contentType: 'text/markdown' } }
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(path, data);  // ❌ Content-Type 없음
```

### 환경변수 관리 (MUST)

#### MUST: Wrangler Secrets 사용 (API 키)
```bash
# ✅ CORRECT
wrangler secret put GOOGLE_GEN_AI_API_KEY

# ❌ WRONG
# wrangler.toml에 평문으로 저장 (보안 위험)
[vars]
GOOGLE_GEN_AI_API_KEY = "AIzaSy..."  # ❌ 절대 금지
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **핵심 라이브러리**: [../news-generator/CLAUDE.md](../news-generator/CLAUDE.md)
- **Core 타입**: [../core/CLAUDE.md](../core/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - Cloudflare Workers API (Gemini 순수 함수 활용)*
