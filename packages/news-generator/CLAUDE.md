# News Generator Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. 여러 뉴스 기사를 AI가 분석하여 하나의 통합 뉴스로 생성
2. Google Gemini 2.5 Pro API 통합
3. JSON/Markdown 듀얼 포맷 출력
4. CLI와 라이브러리 양쪽에서 재사용 가능한 순수 함수 제공

### 구현 상태
- ✅ **완성** - TypeScript 구현
- ✅ 순수 함수 라이브러리 (`news-generator.ts`)
- ✅ Commander.js CLI (`command.ts`)
- ✅ Google Gemini 2.5 Pro 통합
- ✅ 프롬프트 시스템 (`prompts/`)

---

## 🏗️ 파일 구조 및 역할

### 아키텍처 원칙
**설계 철학**:
1. **순수 함수**: `news-generator.ts`는 파일 I/O 없는 순수 함수만 포함
2. **관심사 분리**: CLI 로직은 `command.ts`에서 완전 분리
3. **재사용성**: Workers 환경에서도 동일 함수 import 가능
4. **타입 안전성**: TypeScript + Zod 스키마 검증

### 파일 구조
```
packages/news-generator/
├── news-generator.ts          # 순수 함수 라이브러리 (핵심)
├── command.ts                 # CLI 인터페이스 (Commander.js)
├── prompts/                   # AI 프롬프트 템플릿
│   └── news-consolidation.md # 뉴스 통합 프롬프트
├── package.json               # 의존성 및 exports
└── CLAUDE.md                  # 이 문서
```

---

## 🔧 API 및 함수 시그니처

### 핵심 함수 (news-generator.ts)

#### generateNews()
```typescript
export async function generateNews(
  newsDetails: NewsDetail[],
  promptTemplate: string,
  apiKey: string
): Promise<GenerationResult>

interface GenerationResult {
  generatedNews: GeneratedNews;
  executionTime: number;  // 밀리세컨드
}
```

**역할**: 여러 뉴스 기사를 Google Gemini API로 통합 뉴스 생성

**파라미터**:
- `newsDetails`: 크롤링된 뉴스 상세 정보 배열
- `promptTemplate`: AI 프롬프트 템플릿 문자열
- `apiKey`: Google Gemini API 키

**반환**: 생성된 뉴스 데이터와 실행 시간

#### formatAsMarkdown()
```typescript
export function formatAsMarkdown(news: GeneratedNews): string
```

**역할**: 생성된 뉴스를 Markdown 형식으로 변환

**파라미터**:
- `news`: 생성된 뉴스 데이터

**반환**: Markdown 형식 문자열

### 타입 정의

#### NewsDetail (입력)
```typescript
interface NewsDetail {
  extraction_timestamp: string;
  original_news_id: string;
  api_news_id: string;
  content: string;
  metadata: {
    title: string;
    provider: string;
    byline: string;
    published_date: string;
    category: string;
    keywords: string;
    summary: string;
    url: string;
  };
}
```

#### GeneratedNews (출력, from @ai-newscast/core)
```typescript
interface GeneratedNews {
  title: string;
  summary: string;
  content: string;  // 500자 이상
  sources_count: number;
  sources: {
    [provider: string]: Array<{
      title: string;
      url: string;
    }>;
  };
  generation_timestamp: string;
  input_articles_count: number;
}
```

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newsID`, `apiKey` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### 순수 함수 원칙 (CRITICAL)

#### MUST: news-generator.ts는 순수 함수만
```typescript
// ✅ CORRECT (news-generator.ts)
export async function generateNews(
  newsDetails: NewsDetail[],
  promptTemplate: string,
  apiKey: string
): Promise<GenerationResult> {
  // AI API 호출만 (파일 I/O 없음)
  const result = await callGeminiAPI(newsDetails, promptTemplate, apiKey);
  return {
    generatedNews: result,
    executionTime: Date.now() - startTime
  };
}

// ❌ WRONG (news-generator.ts에서 금지)
import { writeFileSync } from 'fs';

export async function generateNews(...) {
  const result = await callGeminiAPI(...);
  writeFileSync('output.json', JSON.stringify(result));  // ❌ 파일 I/O 금지
  return result;
}
```

#### MUST: CLI 로직은 command.ts에만
```typescript
// ✅ CORRECT (command.ts)
import { writeFileSync } from 'fs';
import { generateNews } from './news-generator.ts';

program
  .action(async (options) => {
    const result = await generateNews(newsDetails, prompt, apiKey);
    writeFileSync(options.output, JSON.stringify(result.generatedNews));  // CLI에서만 파일 I/O
  });

// ❌ WRONG (news-generator.ts)
export async function generateNews(...) {
  writeFileSync(...);  // ❌ 순수 함수에서 파일 I/O 금지
}
```

### Google Gemini API 사용 규칙

#### MUST: JSON 파싱 에러 처리
```typescript
// ✅ CORRECT
const response = await model.generateContent(prompt);
const text = response.response.text();

// JSON 추출 (```json ... ``` 제거)
const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
if (!jsonMatch) {
  throw new Error('No valid JSON found in AI response');
}

const generatedNews = JSON.parse(jsonMatch[1]);

// ❌ WRONG
const generatedNews = JSON.parse(response.response.text());  // ❌ 에러 처리 없음
```

#### MUST: 프롬프트 변수 치환
```typescript
// ✅ CORRECT
const prompt = promptTemplate
  .replace('{{NEWS_COUNT}}', newsDetails.length.toString())
  .replace('{{NEWS_DATA}}', JSON.stringify(newsDetails, null, 2));

// ❌ WRONG
const prompt = promptTemplate;  // ❌ 변수 치환 없음
```

### 타입 검증

#### MUST: Zod 스키마 검증 (출력)
```typescript
// ✅ CORRECT
import { z } from 'zod';

const GeneratedNewsSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  content: z.string().min(500),  // 500자 이상 필수
  sources_count: z.number().min(1),
  sources: z.record(z.array(z.object({
    title: z.string(),
    url: z.string().url(),
  }))),
});

const validated = GeneratedNewsSchema.parse(generatedNews);

// ❌ WRONG
const generatedNews = JSON.parse(jsonText);  // ❌ 검증 없음
```

---

## 🚨 에러 처리 방식

### Google Gemini API 에러

```typescript
// ✅ CORRECT
try {
  const result = await generateNews(newsDetails, prompt, apiKey);
  return result;
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Google Gemini API key 설정 확인 필요');
    throw new Error('Invalid or missing Google Gemini API key');
  } else if (error.message.includes('No valid JSON')) {
    console.error('AI 응답 JSON 파싱 실패');
    throw new Error('Failed to parse AI response as JSON');
  } else {
    console.error('뉴스 생성 오류:', error);
    throw error;
  }
}
```

### Commander.js CLI 에러

```typescript
// ✅ CORRECT (command.ts)
program
  .action(async (options) => {
    try {
      const result = await generateNews(newsDetails, prompt, apiKey);
      console.log(`✓ 뉴스 생성 완료 (${result.executionTime}ms)`);
    } catch (error) {
      console.error('Error:', error.message);
      process.exit(1);
    }
  });
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **core**: `GeneratedNews` 타입 정의 import
- **news-crawler**: 이 패키지가 crawler의 출력을 입력으로 사용
- **news-generator-worker**: 이 패키지의 순수 함수를 Workers에서 재사용
- **newscast-generator**: 이 패키지의 출력을 입력으로 사용

### Export (다른 패키지에서 사용)

```typescript
// news-generator-worker에서 사용 예시
import { generateNews, formatAsMarkdown } from '@ai-newscast/news-generator';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

export async function handleGenerate(newsDetails, apiKey) {
  const result = await generateNews(newsDetails, newsConsolidationPrompt, apiKey);
  return {
    json: JSON.stringify(result.generatedNews),
    markdown: formatAsMarkdown(result.generatedNews),
  };
}
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### 아키텍처 원칙 (CRITICAL)

#### MUST: 순수 함수와 CLI 분리
- `news-generator.ts`: 순수 함수만 (파일 I/O 금지)
- `command.ts`: CLI 로직 및 파일 I/O

#### NEVER: 순수 함수에서 부작용
```typescript
// ❌ WRONG (news-generator.ts에서 금지)
import { writeFileSync } from 'fs';
import { existsSync } from 'fs';
import { config } from 'dotenv';

export async function generateNews(...) {
  config();  // ❌ 환경 변수 로딩 금지
  writeFileSync(...);  // ❌ 파일 쓰기 금지
  console.log(...);  // ⚠️ 로깅은 허용 (디버깅 목적)
}
```

### Google Gemini API (MUST)

#### MUST: Rate Limit 준수
```typescript
// ✅ CORRECT (3초 지연 권장)
await generateNews(newsDetails1, prompt, apiKey);
await new Promise(resolve => setTimeout(resolve, 3000));  // 3초 대기
await generateNews(newsDetails2, prompt, apiKey);

// ❌ WRONG
await Promise.all([
  generateNews(newsDetails1, prompt, apiKey),
  generateNews(newsDetails2, prompt, apiKey),
]);  // ❌ 동시 호출 금지 (rate limit 초과)
```

#### MUST: API 키 검증
```typescript
// ✅ CORRECT
if (!apiKey) {
  throw new Error('Google Gemini API key is required');
}

// ❌ WRONG
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-pro' });  // ❌ 키 검증 없음
```

### 프롬프트 시스템 (MUST)

#### MUST: 프롬프트 변수 치환
```typescript
// ✅ CORRECT
const prompt = promptTemplate
  .replace('{{NEWS_COUNT}}', newsDetails.length.toString())
  .replace('{{NEWS_DATA}}', JSON.stringify(newsDetails));

// ❌ WRONG
const prompt = promptTemplate;  // ❌ 변수 미치환
```

#### MUST: 출력 형식 검증
```typescript
// ✅ CORRECT
const GeneratedNewsSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(500),  // 500자 이상 필수
});

const validated = GeneratedNewsSchema.parse(generatedNews);

// ❌ WRONG
const generatedNews = JSON.parse(jsonText);  // ❌ 길이 검증 없음
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Core 타입 정의**: [../core/CLAUDE.md](../core/CLAUDE.md)
- **프롬프트 템플릿**: [prompts/news-consolidation.md](prompts/news-consolidation.md)

---

*최종 업데이트: 2025-10-11 - 순수 함수 아키텍처 및 분리 원칙 강화*
