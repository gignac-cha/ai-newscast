# News Generator

Google Gemini 2.5 Pro를 활용한 AI 기반 뉴스 통합 라이브러리

## 🌟 이게 뭔가요?

Google Gemini AI를 사용하여 여러 뉴스 기사를 하나의 종합적인 뉴스 스토리로 통합하는 순수 함수 라이브러리입니다. CLI 도구와 import 가능한 라이브러리로 모두 사용할 수 있습니다.

## ✨ 핵심 기능

- **AI 기반 통합**: Google Gemini 2.5 Pro로 지능적인 뉴스 합성
- **순수 함수**: 부작용 없이 모든 JavaScript 환경에서 동작
- **이중 인터페이스**: CLI 또는 라이브러리로 사용 가능
- **다중 형식 출력**: JSON 및 Markdown 형식
- **소스 추적**: 원본 기사 참조 유지

## 🚀 빠른 시작

### CLI로 사용

```bash
# 통합 뉴스 생성
node --experimental-strip-types command.ts

# 또는 pnpm 스크립트 사용
pnpm run generate:news
```

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
  'your-gemini-api-key'
);

console.log(`생성 완료: ${result.executionTime}ms`);
console.log(formatAsMarkdown(result.generatedNews));
```

## 📊 입출력

**입력**: 같은 주제에 대한 여러 뉴스 기사

**출력**: 다음을 포함하는 단일 통합 뉴스 스토리:
- 통합된 제목 및 요약
- 종합적인 내용 (500자 이상)
- 언론사별 소스 추적
- 생성 메타데이터

## 🔧 설정

```bash
# API 키 설정
export GOOGLE_GEN_AI_API_KEY="your_gemini_api_key"
```

## 📚 더 알아보기

- **전체 API 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **프롬프트**: `prompts/news-consolidation.md`에서 커스터마이징
- **타입**: CLAUDE.md에 모든 인터페이스 문서화

## 🔗 관련 패키지

- **@ai-newscast/news-generator-worker**: Cloudflare Workers API 래퍼
- **@ai-newscast/core**: 공유 타입 정의

---

Google Gemini 2.5 Pro + Commander.js로 구동
