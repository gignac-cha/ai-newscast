# News Generator

Google Gemini 2.5 Pro를 활용하여 여러 뉴스 기사를 하나의 통합 뉴스로 생성하는 AI 패키지

## 개요

같은 주제에 대한 여러 언론사의 뉴스 기사를 Google Gemini AI가 분석하여 하나의 종합적인 뉴스 스토리로 통합합니다.

## 주요 기능

- **AI 기반 통합**: Google Gemini 2.5 Pro가 여러 기사를 지능적으로 합성
- **순수 함수 설계**: CLI와 라이브러리 양쪽에서 재사용 가능
- **다중 포맷 출력**: JSON과 Markdown 형식 동시 지원
- **소스 추적**: 원본 기사 출처 및 링크 자동 관리
- **타입 안전**: TypeScript + Zod 스키마 검증

## 빠른 시작

### 설치

```bash
# 루트에서 전체 설치
pnpm install
```

### CLI 사용

```bash
# 루트에서 turbo를 통해 실행 (권장)
export GOOGLE_GEN_AI_API_KEY="$(grep GOOGLE_GEN_AI_API_KEY .env | head -1 | cut -d '=' -f2)" && \
pnpm run:generator:news -- \
  --input-folder outputs/{TIMESTAMP}/topic-01/news \
  --output-file outputs/{TIMESTAMP}/topic-01/news.json

# 또는 패키지 디렉토리에서 직접 실행
cd packages/news-generator && \
export GOOGLE_GEN_AI_API_KEY="$(grep GOOGLE_GEN_AI_API_KEY ../../.env | head -1 | cut -d '=' -f2)" && \
node command.ts \
  --input-folder ../../outputs/{TIMESTAMP}/topic-01/news \
  --output-file ../../outputs/{TIMESTAMP}/topic-01/news.json
```

**주의**: `{TIMESTAMP}`는 실제 생성된 타임스탬프로 교체하세요 (예: `2025-10-15T06-43-36-209Z`)

### 라이브러리로 사용

```typescript
import { generateNews, formatAsMarkdown } from '@ai-newscast/news-generator';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

// 뉴스 데이터 준비
const newsDetails: NewsDetail[] = [...];

// 통합 뉴스 생성
const result = await generateNews(
  newsDetails,
  newsConsolidationPrompt,
  process.env.GOOGLE_GEN_AI_API_KEY
);

console.log(`생성 완료: ${result.executionTime}ms`);
console.log(formatAsMarkdown(result.generatedNews));
```

## 출력 예시

### JSON 출력 (news.json)

```json
{
  "title": "이종섭 전 장관과 한학자 총재 조사 - 통일교 연루 의혹 심화",
  "summary": "검찰이 이종섭 전 국방부 장관과 한학자 통일교 총재를 조사하면서...",
  "content": "검찰 조사 결과 500자 이상의 상세한 통합 뉴스 본문...",
  "sources_count": 3,
  "sources": {
    "연합뉴스": [
      {
        "title": "이종섭 전 장관 검찰 조사",
        "url": "https://bigkinds.or.kr/v2/news/..."
      }
    ],
    "조선일보": [...],
    "한겨레": [...]
  },
  "generation_timestamp": "2025-10-05T19:53:26.599Z",
  "input_articles_count": 15
}
```

### Markdown 출력 (news.md)

```markdown
# 이종섭 전 장관과 한학자 총재 조사 - 통일교 연루 의혹 심화

**요약**: 검찰이 이종섭 전 국방부 장관과 한학자 통일교 총재를 조사하면서...

## 본문

검찰 조사 결과 상세한 통합 뉴스 본문...

## 출처 (15개 기사)

- **연합뉴스**: [이종섭 전 장관 검찰 조사](https://bigkinds.or.kr/...)
- **조선일보**: ...
- **한겨레**: ...
```

## 기술 스택

- **Node.js**: 24+ (experimental type stripping)
- **AI 모델**: Google Gemini 2.5 Pro API
- **CLI**: Commander.js
- **타입 검증**: TypeScript + Zod schemas

## 프로그래밍 방식 사용

Cloudflare Workers나 다른 패키지에서 직접 import하여 사용:

```typescript
import { generateNews } from '@ai-newscast/news-generator';

const result = await generateNews(newsDetails, promptTemplate, apiKey);
```

## 참고사항

- Google Gemini API 키가 필요합니다 (환경 변수 `GOOGLE_GEN_AI_API_KEY`)
- API rate limit 준수를 위해 3초 지연 권장
- 프롬프트는 `prompts/news-consolidation.md`에서 커스터마이징 가능

## 개발 가이드

상세한 API 명세, 아키텍처 원칙, 코딩 규칙은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/news-generator-worker**: Cloudflare Workers API 래퍼
- **@ai-newscast/core**: 공통 타입 정의

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
