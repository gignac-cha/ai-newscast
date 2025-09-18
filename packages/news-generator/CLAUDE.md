# News Generator Package

AI 기반 뉴스 통합 생성 기능을 제공하는 순수 함수 라이브러리

## 📋 개요

이 패키지는 Google Gemini 2.5 Pro를 활용하여 여러 뉴스 기사를 하나의 통합된 뉴스로 생성하는 핵심 기능을 제공합니다. 파일 I/O와 비즈니스 로직을 분리하여 다양한 환경(CLI, Cloudflare Workers 등)에서 재사용 가능한 순수 함수로 설계되었습니다.

**핵심 기능:**
- 여러 뉴스 기사를 하나의 통합 뉴스로 생성
- Google Gemini 2.5 Pro AI 모델 활용
- JSON/Markdown 형태 출력 지원
- 언론사별 소스 정리 및 메타데이터 생성
- CLI 및 라이브러리 두 가지 사용 방식 지원

## 🛠️ 기술 스택

### 런타임 환경
- **Node.js**: 24+ (experimental TypeScript type stripping)
- **AI 모델**: Google Gemini 2.5 Pro API
- **CLI 프레임워크**: Commander.js
- **타입 시스템**: TypeScript + Zod 스키마

### 의존성
- **@ai-newscast/core**: 공통 타입 정의 (`GeneratedNews`)
- **@google/genai**: Google Gemini AI SDK
- **commander**: CLI 인터페이스 (command.ts에서만 사용)

## 🚀 사용 방법

### 1. CLI 사용 (Command.js)
```bash
# 뉴스 생성 실행
node --experimental-strip-types command.ts

# 개발 모드 (watch)
pnpm dev

# 패키지 스크립트
pnpm generate         # 뉴스 생성
pnpm generate:news    # 뉴스 생성 (별칭)
```

### 2. 라이브러리 사용 (Pure Functions)
```typescript
import { generateNews, formatAsMarkdown, type NewsDetail } from '@ai-newscast/news-generator';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

// 뉴스 데이터 준비
const newsDetails: NewsDetail[] = [...];

// AI 뉴스 생성
const result = await generateNews(
  newsDetails,
  newsConsolidationPrompt,
  'your-gemini-api-key'
);

// Markdown 변환
const markdownContent = formatAsMarkdown(result.generatedNews);

console.log(`Generated in ${result.executionTime}ms`);
```

## 📋 API 참조

### 핵심 함수

#### `generateNews(newsDetails, promptTemplate, apiKey)`
여러 뉴스 기사를 하나의 통합 뉴스로 생성하는 핵심 함수

**파라미터:**
- `newsDetails: NewsDetail[]` - 크롤링된 뉴스 상세 정보 배열
- `promptTemplate: string` - AI 생성용 프롬프트 템플릿
- `apiKey: string` - Google Gemini API 키

**반환값:** `Promise<GenerationResult>`
```typescript
interface GenerationResult {
  generatedNews: GeneratedNews;
  executionTime: number;  // 밀리초
}
```

#### `formatAsMarkdown(news)`
생성된 뉴스를 Markdown 형식으로 변환

**파라미터:**
- `news: GeneratedNews` - 생성된 뉴스 데이터

**반환값:** `string` - Markdown 형식 문서

### 타입 정의

#### `NewsDetail`
```typescript
interface NewsDetail {
  extraction_timestamp: string;
  original_news_id: string;
  api_news_id: string;
  news_detail: any;
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

#### `GeneratedNews` (from @ai-newscast/core)
```typescript
interface GeneratedNews {
  title: string;
  summary: string;
  content: string;
  sources_count: number;
  sources: {
    [provider: string]: {
      title: string;
      url: string;
    }[]
  };
  generation_timestamp: string;
  input_articles_count: number;
}
```

## 📄 프롬프트 시스템

### 프롬프트 파일 위치
```
prompts/
└── news-consolidation.md    # 뉴스 통합 생성 프롬프트
```

### 프롬프트 특징
- **체계적 구조**: 입력 데이터, 작업 요구사항, 출력 형식, 출력 규칙
- **품질 가이드라인**: 제목, 요약, 본문에 대한 세부 지침
- **JSON 스키마**: 구조화된 출력 형식 정의
- **다국어 지원**: 한국어 중심 뉴스 생성 최적화

### 프롬프트 import 방법
```typescript
// esbuild 환경 (Cloudflare Workers)
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

// Node.js 환경
import { readFileSync } from 'fs';
import { join, dirname } from 'path';

const promptPath = join(__dirname, 'prompts', 'news-consolidation.md');
const prompt = readFileSync(promptPath, 'utf-8');
```

## 📁 파일 구조

```
packages/news-generator/
├── news-generator.ts        # 순수 함수 라이브러리
├── command.ts              # Commander.js CLI 인터페이스
├── package.json            # 패키지 설정
├── prompts/               # AI 프롬프트 템플릿
│   └── news-consolidation.md
└── CLAUDE.md              # 이 문서
```

## 🔧 개발 가이드

### 아키텍처 원칙
1. **순수 함수**: `news-generator.ts`는 파일 I/O 없는 순수 함수만 포함
2. **관심사 분리**: CLI 로직은 `command.ts`에서 분리 관리
3. **재사용성**: 다양한 환경에서 import하여 사용 가능
4. **타입 안전성**: TypeScript + Zod 스키마로 타입 검증

### 환경변수
```bash
# .env 파일
GOOGLE_GEN_AI_API_KEY=your_gemini_api_key_here
```

### 개발 명령어
```bash
# 타입 체크
tsc --noEmit

# 개발 실행
node --experimental-strip-types --watch command.ts

# 테스트
node --experimental-strip-types --test **/*.test.ts
```

## 🚨 운영 고려사항

### Google Gemini API
- **Rate Limit**: 3초 지연으로 API 제한 준수 권장
- **Context Length**: 매우 긴 뉴스의 경우 분할 처리 필요
- **Error Handling**: JSON 파싱 실패 시 재시도 로직 구현

### 성능 최적화
- **실행 시간 추적**: `GenerationResult.executionTime`으로 성능 모니터링
- **메모리 관리**: 대용량 뉴스 데이터 처리 시 주의
- **동시 처리**: API Rate Limit 준수하며 병렬 처리 구현

### 에러 처리
```typescript
try {
  const result = await generateNews(newsDetails, prompt, apiKey);
  console.log('Success:', result.generatedNews);
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Google AI API key 설정 확인 필요');
  } else if (error.message.includes('No valid JSON')) {
    console.error('AI 응답 JSON 파싱 실패');
  } else {
    console.error('뉴스 생성 오류:', error);
  }
}
```

## 📊 사용 예시

### CLI 워크플로우
```bash
# 1. 환경변수 설정
export GOOGLE_GEN_AI_API_KEY="your_api_key"

# 2. 뉴스 생성 실행
node --experimental-strip-types command.ts

# 3. 출력 확인
ls output/*/topic-*/news.*
```

### 라이브러리 통합 (Cloudflare Workers)
```typescript
// handlers/generate.ts
import { generateNews, formatAsMarkdown, type NewsDetail } from '@ai-newscast/news-generator/news-generator.ts';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

export async function handleGenerate(newsDetails: NewsDetail[], apiKey: string) {
  const result = await generateNews(newsDetails, newsConsolidationPrompt, apiKey);

  return {
    json: JSON.stringify(result.generatedNews, null, 2),
    markdown: formatAsMarkdown(result.generatedNews),
    executionTime: result.executionTime
  };
}
```

## 🔄 업데이트 이력

### v1.0.0 (2025-09-19)
- 순수 함수와 CLI 분리 아키텍처 구현
- `generateNews()`, `formatAsMarkdown()` 핵심 함수 완성
- Commander.js 기반 CLI 인터페이스 추가
- Cloudflare Workers 호환성 확보
- 체계적인 프롬프트 시스템 구축

---
*최종 업데이트: 2025-09-19 - 순수 함수 라이브러리 및 CLI 분리 아키텍처 완성*