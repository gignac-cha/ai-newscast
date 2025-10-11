# Newscast Generator Worker Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. R2에서 토픽별 통합 뉴스 읽기
2. Gemini AI로 듀얼 호스트 뉴스캐스트 스크립트 생성
3. TTS API로 개별 오디오 파일 생성
4. AWS Lambda API 호출로 FFmpeg 오디오 병합
5. Cron Triggers로 토픽별 자동 생성 스케줄링

### 구현 상태
- ✅ **완성** - Cloudflare Workers API
- ✅ Gemini AI 스크립트 생성
- ✅ TTS 오디오 합성
- ✅ Lambda FFmpeg 통합
- ✅ 토픽별 분산 스케줄링 (09:51-10:00)

---

## 🏗️ 파일 구조 및 역할

```
packages/newscast-generator-worker/
├── worker.ts               # 메인 Worker 엔트리포인트 (라우팅)
├── wrangler.toml          # Cloudflare 설정 (R2, KV, Cron)
├── build.ts               # esbuild 번들링 설정
├── handlers/              # API 핸들러
│   ├── help.ts           # GET / - 헬프 메시지
│   ├── status.ts         # GET /status - 서비스 상태
│   ├── script.ts         # GET /script - 스크립트 생성
│   ├── audio.ts          # GET /audio - TTS 오디오 생성
│   └── newscast.ts       # GET /newscast - Lambda 병합 호출
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
  service: "newscast-generator-worker",
  version: "1.0.0",
  timestamp: "2025-10-05T10:00:00.000Z",
  environment: {
    hasGeminiAPIKey: true,
    hasTTSAPIKey: true,
    hasBucket: true,
    hasKV: true
  }
}
```

### GET /script (handlers/script.ts)
```typescript
export async function handleScript(
  request: Request,
  env: Env
): Promise<Response>

// 필수 파라미터
interface ScriptParams {
  newscastID: string;      // ?newscast-id=2025-10-05T10-00-00-000Z
  topicIndex: number;      // ?topic-index=1
}

// R2 입력 경로
newscasts/{newscastID}/topic-{NN}/news.json

// R2 출력 경로
newscasts/{newscastID}/topic-{NN}/newscast-script.json
newscasts/{newscastID}/topic-{NN}/newscast-script.md
```

### GET /audio (handlers/audio.ts)
```typescript
export async function handleAudio(
  request: Request,
  env: Env
): Promise<Response>

// R2 입력 경로
newscasts/{newscastID}/topic-{NN}/newscast-script.json

// R2 출력 경로
newscasts/{newscastID}/topic-{NN}/audio/001-music.mp3
newscasts/{newscastID}/topic-{NN}/audio/002-host1.mp3
...
newscasts/{newscastID}/topic-{NN}/audio/audio-files.json
```

### GET /newscast (handlers/newscast.ts)
```typescript
export async function handleNewscast(
  request: Request,
  env: Env
): Promise<Response>

// Lambda API 호출 (snake_case)
POST {LAMBDA_AUDIO_MERGE_URL}
{
  newscast_id: string,    // snake_case
  topic_index: number,    // snake_case
  dry_run: false          // snake_case
}

// R2 출력 경로
newscasts/{newscastID}/topic-{NN}/newscast.mp3
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newscastID`, `topicIndex` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### Cloudflare Workers 특화 규칙

#### MUST: URL 파라미터 검증
```typescript
// ✅ CORRECT
const url = new URL(request.url);
const newscastID = url.searchParams.get('newscast-id');
const topicIndexParam = url.searchParams.get('topic-index');

if (!newscastID || !topicIndexParam) {
  return new Response(JSON.stringify({
    error: 'Missing required parameters: newscast-id, topic-index'
  }), { status: 400 });
}

const topicIndex = parseInt(topicIndexParam, 10);
if (isNaN(topicIndex) || topicIndex < 1 || topicIndex > 10) {
  return new Response(JSON.stringify({
    error: 'Invalid topic-index: must be 1-10'
  }), { status: 400 });
}

// ❌ WRONG
const topicIndex = parseInt(url.searchParams.get('topic-index'));  // ❌ null 체크 없음
```

#### MUST: R2 경로 패딩
```typescript
// ✅ CORRECT
const topicPadded = topicIndex.toString().padStart(2, '0');  // 01, 02, ..., 10
const r2Path = `newscasts/${newscastID}/topic-${topicPadded}/news.json`;

// ❌ WRONG
const r2Path = `newscasts/${newscastID}/topic-${topicIndex}/news.json`;  // ❌ topic-1 (패딩 없음)
```

#### MUST: R2 객체 존재 확인
```typescript
// ✅ CORRECT
const r2Object = await env.AI_NEWSCAST_BUCKET.get(r2Path);

if (!r2Object) {
  return new Response(JSON.stringify({
    error: `File not found: ${r2Path}`
  }), { status: 404 });
}

const data = await r2Object.json();

// ❌ WRONG
const r2Object = await env.AI_NEWSCAST_BUCKET.get(r2Path);
const data = await r2Object.json();  // ❌ null일 경우 크래시
```

### Lambda API 통합 규칙

#### MUST: snake_case 요청 (Lambda는 Python)
```typescript
// ✅ CORRECT
const lambdaRequest = {
  newscast_id: newscastID,     // snake_case
  topic_index: topicIndex,     // snake_case
  dry_run: false               // snake_case
};

const response = await fetch(env.LAMBDA_AUDIO_MERGE_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(lambdaRequest)
});

// ❌ WRONG
const lambdaRequest = {
  newscastID: newscastID,      // ❌ camelCase (Lambda에서 인식 안 됨)
  topicIndex: topicIndex,      // ❌ camelCase
  dryRun: false                // ❌ camelCase
};
```

#### MUST: Lambda 응답 처리 (snake_case)
```typescript
// ✅ CORRECT
const lambdaResult = await response.json();

// Lambda는 snake_case로 응답
const audioBase64 = lambdaResult.audio_base64;        // snake_case
const outputFileSize = lambdaResult.output_file_size; // snake_case
const inputFiles = lambdaResult.input_files;          // snake_case

// ❌ WRONG
const audioBase64 = lambdaResult.audioBase64;         // ❌ camelCase (존재하지 않음)
```

#### MUST: Base64 디코딩 후 R2 저장
```typescript
// ✅ CORRECT
const audioBuffer = Buffer.from(lambdaResult.audio_base64, 'base64');

await env.AI_NEWSCAST_BUCKET.put(
  `newscasts/${newscastID}/topic-${topicPadded}/newscast.mp3`,
  audioBuffer,
  { httpMetadata: { contentType: 'audio/mpeg' } }
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(
  outputPath,
  lambdaResult.audio_base64  // ❌ Base64 문자열 그대로 저장 (재생 불가)
);
```

### Cron Triggers 규칙

#### MUST: 토픽 인덱스 계산 (시간 기반)
```typescript
// ✅ CORRECT
const currentHour = new Date().getUTCHours();
const currentMinute = new Date().getUTCMinutes();

let topicIndex: number;

if (currentHour === 9 && currentMinute >= 51 && currentMinute <= 59) {
  topicIndex = currentMinute - 50;  // 51→1, 52→2, ..., 59→9
} else if (currentHour === 10 && currentMinute === 0) {
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
export async function handleScript(request: Request, env: Env): Promise<Response> {
  try {
    // 파라미터 검증
    const { newscastID, topicIndex } = validateParams(request);

    // R2 데이터 읽기
    const newsData = await readFromR2(env, newscastID, topicIndex);

    // Gemini API 호출
    const result = await generateNewscastScript({...});

    // R2에 저장
    await saveToR2(env, newscastID, topicIndex, result);

    return new Response(JSON.stringify({
      success: true,
      newscast_id: newscastID,
      topic_index: topicIndex,
      message: `Generated newscast script for topic ${topicIndex}`
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
export async function handleScript(request: Request, env: Env): Promise<Response> {
  const result = await generateNewscastScript({...});  // ❌ try/catch 없음
  return new Response(JSON.stringify(result));
}
```

### 로깅 패턴

```typescript
// ✅ CORRECT
console.log(`[INFO] Processing newscast: ${newscastID}, topic: ${topicIndex}`);
console.log(`[INFO] Calling Gemini API...`);
console.log(`[INFO] Generated script: ${result.script.dialogues.length} dialogues`);
console.error(`[ERROR] Lambda request failed: ${error.message}`);

// ❌ WRONG
console.log('Processing...');  // ❌ 구체적 정보 없음
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **@ai-newscast/newscast-generator**: 스크립트/오디오 생성 로직 import
- **newscast-generator-lambda**: Lambda FFmpeg 병합 API 호출
- **@ai-newscast/core**: 공통 타입 정의
- **news-generator-worker**: 이전 파이프라인 단계 (뉴스 통합)

### Import 패턴

```typescript
// ✅ CORRECT
import { generateNewscastScript } from '@ai-newscast/newscast-generator/generate-newscast-script.ts';
import { generateNewscastAudio } from '@ai-newscast/newscast-generator/generate-newscast-audio.ts';
import type { GeneratedNews, NewscastScript } from '@ai-newscast/core';

// ❌ WRONG
import { generateNewscastScript } from '@ai-newscast/newscast-generator';  // ❌ .ts 생략
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### Cloudflare Workers 제약 (MUST)

#### MUST: CPU 시간 제한 (30초)
```typescript
// ✅ CORRECT
// Gemini API 응답 시간은 보통 5-15초
const result = await generateNewscastScript({...});

// ❌ WRONG
// 100개 파일 순차 처리 (30초 초과 위험)
for (let i = 0; i < 100; i++) {
  await processFile(i);  // ❌ 타임아웃 위험
}
```

#### NEVER: 바이너리 실행
```typescript
// ❌ WRONG
import { execSync } from 'child_process';
execSync('ffmpeg -i input.mp3 output.mp3');  // ❌ Workers에서 불가능

// ✅ CORRECT - Lambda API 호출
const response = await fetch(env.LAMBDA_AUDIO_MERGE_URL, {
  method: 'POST',
  body: JSON.stringify({ newscast_id, topic_index })
});
```

### R2 스토리지 규칙 (MUST)

#### MUST: JSON과 Markdown 둘 다 저장
```typescript
// ✅ CORRECT
await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/newscast-script.json`,
  JSON.stringify(scriptJSON)
);

await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/newscast-script.md`,
  scriptMarkdown
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(
  `${basePath}/newscast-script.json`,
  JSON.stringify(scriptJSON)
);  // ❌ Markdown 누락
```

#### MUST: httpMetadata 설정
```typescript
// ✅ CORRECT
await env.AI_NEWSCAST_BUCKET.put(
  path,
  audioBuffer,
  { httpMetadata: { contentType: 'audio/mpeg' } }
);

// ❌ WRONG
await env.AI_NEWSCAST_BUCKET.put(path, audioBuffer);  // ❌ Content-Type 없음
```

### 환경변수 관리 (MUST)

#### MUST: Wrangler Secrets 사용 (API 키)
```bash
# ✅ CORRECT
wrangler secret put GOOGLE_GEN_AI_API_KEY
wrangler secret put GOOGLE_CLOUD_API_KEY

# ❌ WRONG
# wrangler.toml에 평문으로 저장 (보안 위험)
[vars]
GOOGLE_GEN_AI_API_KEY = "AIzaSy..."  # ❌ 절대 금지
```

#### MUST: wrangler.toml에 공개 가능한 값만
```toml
# ✅ CORRECT
[vars]
LAMBDA_AUDIO_MERGE_URL = "https://your-api-gateway-url/prod/newscast"

# ❌ WRONG
[vars]
GOOGLE_GEN_AI_API_KEY = "AIzaSy..."  # ❌ API 키는 Secrets로
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **핵심 라이브러리**: [../newscast-generator/CLAUDE.md](../newscast-generator/CLAUDE.md)
- **Lambda 통합**: [../newscast-generator-lambda/CLAUDE.md](../newscast-generator-lambda/CLAUDE.md)

---

*최종 업데이트: 2025-10-11 - Cloudflare Workers API (Gemini + TTS + Lambda 통합)*
