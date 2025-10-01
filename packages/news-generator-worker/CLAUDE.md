# News Generator Worker Package - AI Development Guide

Claude에게: 이 패키지는 `@ai-newscast/news-generator`의 순수 함수를 Workers 환경에서 호출합니다. 사용자 친화적 정보는 README.md를 참조하세요. 이 문서는 Workers 통합 패턴과 기술 세부사항에 집중합니다.

## 🏗️ 아키텍처 패턴

**핵심 설계:**
- **순수 함수 래핑**: `@ai-newscast/news-generator`의 `generateNews()` 호출
- **중앙화된 프롬프트**: `news-consolidation.md` 공유 사용 (CLI와 Worker 일관성)
- **R2 데이터 흐름**: R2 읽기 → AI 처리 → R2 쓰기
- **esbuild 통합**: .md 파일 import 지원 (text loader)

**Workers 제약사항 대응:**
- CPU 시간 30초: AI 호출 시간 포함하여 제한 준수
- 메모리 128MB: 대용량 뉴스 데이터 처리 시 주의
- 외부 API: Google Gemini API 호출 신뢰성 확보

## 🛠️ 기술 스택

### Cloudflare Workers 환경
- **Runtime**: TypeScript + esbuild 번들링
- **AI 모델**: Google Gemini 2.5 Pro API
- **스토리지**: R2 Bucket (입력/출력 데이터) + KV Namespace (메타데이터)
- **빌드**: ESBuild (최적화된 번들링)

### 의존성
- **@ai-newscast/core**: 공통 타입 정의 (`GeneratedNews`)
- **@ai-newscast/news-generator**: 순수 함수 라이브러리 (`generateNews`, `formatAsMarkdown`)
- **@cloudflare/workers-types**: Workers 타입 정의
- **esbuild**: 번들링 및 .md 파일 import 지원

## 🚀 배포 및 설정

### 환경 요구사항
- **Wrangler CLI**: Cloudflare Workers 배포 도구
- **Node.js**: 24+ (TypeScript experimental stripping)
- **Google AI API Key**: Gemini 2.5 Pro 액세스

### 배포 명령어
```bash
# 개발 환경 빌드
pnpm build
pnpm dev          # watch 모드

# 로컬 개발 서버
pnpm run dev:worker

# 프로덕션 배포
pnpm run deploy

# 타입 체크
pnpm typecheck
```

### Cloudflare 리소스 설정
```toml
# wrangler.toml
[[r2_buckets]]
binding = "AI_NEWSCAST_BUCKET"
bucket_name = "ai-newscast"

[[kv_namespaces]]
binding = "AI_NEWSCAST_KV"
id = "1a002997dc124ce9a4ff5080a7e2b5e6"

[vars]
GOOGLE_GEN_AI_API_KEY = "your_gemini_api_key_here"
```

## 📋 API 엔드포인트

### GET /
헬프 메시지 및 사용 가능한 엔드포인트 목록

### POST /generate?newscast-id={id}&topic-index={n}
```bash
curl -X POST "https://ai-newscast-news-generator-worker.r-s-account.workers.dev/generate?newscast-id=2025-09-17T16-50-13-648Z&topic-index=1"
```

**기능:**
- 지정된 토픽의 모든 크롤링된 뉴스 기사 읽기
- Google Gemini AI로 통합 뉴스 생성
- JSON/Markdown 형태로 R2에 저장

**파라미터:**
- `newscast-id`: 뉴스캐스트 ID (필수)
- `topic-index`: 토픽 인덱스 1-10 (필수)
- `format`: 응답 형식 (json|markdown), 기본값 json

**응답 예시:**
```json
{
  "success": true,
  "newscast_id": "2025-09-17T16-50-13-648Z",
  "topic_index": 1,
  "input_articles_count": 25,
  "sources_count": 8,
  "output_files": {
    "json": "newscasts/2025-09-17T16-50-13-648Z/topic-01/news.json",
    "markdown": "newscasts/2025-09-17T16-50-13-648Z/topic-01/news.md"
  },
  "execution_time_ms": 15420,
  "message": "Successfully generated news for topic 1 from 25 articles"
}
```

**출력 구조:**
```
newscasts/{newscast-id}/topic-{01-10}/
├── news.json              # AI 통합 뉴스 (JSON)
└── news.md                # AI 통합 뉴스 (Markdown)
```

### GET /status?newscast-id={id}
```bash
curl "https://ai-newscast-news-generator-worker.r-s-account.workers.dev/status?newscast-id=2025-09-17T16-50-13-648Z"
```

**기능:**
- 뉴스캐스트의 전체 생성 상태 확인
- 토픽별 생성 완료 여부 추적
- 진행률 및 완료 정보 제공

**응답 예시:**
```json
{
  "success": true,
  "newscast_id": "2025-09-17T16-50-13-648Z",
  "total_topics": 10,
  "generated_topics": 3,
  "completion_percentage": 30,
  "is_complete": false,
  "topics": [
    {
      "topic_index": 1,
      "generated": true,
      "has_json": true,
      "has_markdown": true,
      "generation_timestamp": "2025-09-18T02:15:30.123Z",
      "input_articles_count": 25
    }
  ]
}
```

## 🤖 AI 뉴스 통합 프로세스

### 입력 데이터 구조
각 토픽의 `news/` 폴더에서 크롤링된 뉴스 파일들을 읽어옵니다:
```
newscasts/{newscast-id}/topic-{01-10}/news/
├── {news-id-1}.json
├── {news-id-2}.json
└── ...
```

### AI 통합 과정
1. **데이터 수집**: 토픽 폴더의 모든 뉴스 JSON 파일 읽기 (R2 API)
2. **순수 함수 호출**: `@ai-newscast/news-generator`의 `generateNews()` 활용
3. **중앙화된 프롬프트**: `news-consolidation.md` 공유 사용
4. **결과 처리**: `formatAsMarkdown()` 함수로 마크다운 변환
5. **저장**: JSON/Markdown 형태로 R2에 저장

### 핵심 구현 패턴
```typescript
import { generateNews, formatAsMarkdown, type NewsDetail } from '@ai-newscast/news-generator/news-generator.ts';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

// 순수 함수 라이브러리 활용
const result = await generateNews(
  newsDetails,
  newsConsolidationPrompt,
  env.GOOGLE_GEN_AI_API_KEY
);

const markdownContent = formatAsMarkdown(result.generatedNews);
```

### 출력 데이터 구조
```typescript
interface GeneratedNews {
  title: string;                    // 통합된 뉴스 제목
  summary: string;                  // 3-4문장 요약
  content: string;                  // 상세 본문 (500자 이상)
  sources_count: number;            // 참고 언론사 수
  sources: {                        // 언론사별 소스 목록
    [provider: string]: {
      title: string;
      url: string;
    }[]
  };
  generation_timestamp: string;     // 생성 시간
  input_articles_count: number;     // 입력 기사 수
}
```

## 📁 파일 구조

```
packages/news-generator-worker/
├── worker.ts                # 메인 Worker 엔트리포인트
├── wrangler.toml           # Cloudflare Workers 설정
├── build.ts                # esbuild 설정
├── handlers/               # API 핸들러
│   ├── help.ts            # 헬프 엔드포인트
│   ├── generate.ts        # 뉴스 생성 핸들러
│   └── status.ts          # 상태 확인 핸들러
├── utils/                 # 유틸리티 함수
│   ├── cors.ts           # CORS 헤더 처리
│   ├── error.ts          # 에러 응답 생성
│   ├── json.ts           # JSON 응답 생성
│   ├── response.ts       # HTTP 응답 래퍼
│   └── fetch.ts          # 확장된 fetch 유틸리티
└── dist/                 # 빌드 결과물
```

## 🔧 개발 가이드

### 로컬 개발
```bash
# 개발 서버 시작 (hot reload)
pnpm run dev:worker

# 빌드 및 배포
pnpm run deploy
```

### 환경변수 및 설정
- **R2 Bucket**: `AI_NEWSCAST_BUCKET` (ai-newscast)
- **KV Namespace**: `AI_NEWSCAST_KV` (메타데이터 저장)
- **Google AI API Key**: `GOOGLE_GEN_AI_API_KEY`

### AI 프롬프트 커스터마이징
`@ai-newscast/news-generator/prompts/news-consolidation.md` 파일을 수정하여 AI 생성 동작을 조정할 수 있습니다. 이 프롬프트는 중앙에서 관리되어 CLI와 Worker 모두에서 일관된 품질을 보장합니다.

## 🚨 운영 고려사항

### Cloudflare Workers 제한사항
- **CPU 시간**: 30초 (AI 생성 시간 고려)
- **메모리**: 128MB (대용량 뉴스 데이터 처리 시 주의)
- **외부 API 호출**: Google AI API 호출 시간 포함

### Google Gemini API 제한사항
- **Rate Limit**: API 요청 간 3초 지연 권장
- **Context Length**: 매우 긴 뉴스의 경우 분할 처리 필요
- **Cost**: API 호출 비용 모니터링 필요

### 에러 처리 및 복구
- **AI 응답 파싱 실패**: JSON 형식 검증 및 재시도 로직
- **R2 읽기/쓰기 실패**: 적절한 에러 메시지 및 상태 코드
- **API 키 오류**: 환경변수 설정 확인

### 성능 최적화
- **순수 함수 활용**: 중복 코드 제거 및 일관된 성능
- **중앙화된 프롬프트**: 프롬프트 최적화의 단일 진실 공급원
- **실행 시간 추적**: `result.executionTime`으로 성능 모니터링
- **병렬 처리**: 여러 토픽 동시 생성 가능

## 📊 모니터링 및 디버깅

### 로그 확인
```bash
# Workers 로그 실시간 확인
wrangler tail

# 특정 배포 버전 확인
wrangler deployments list
```

### 상태 확인
```bash
# 생성 상태 확인
curl "https://ai-newscast-news-generator-worker.r-s-account.workers.dev/status?newscast-id=latest"

# 특정 토픽 생성
curl -X POST "https://ai-newscast-news-generator-worker.r-s-account.workers.dev/generate?newscast-id=latest&topic-index=1"
```

## 🔄 업데이트 이력

### v1.1.0 (2025-09-19)
- `@ai-newscast/news-generator` 순수 함수 라이브러리 활용
- 중앙화된 프롬프트 시스템 구현 (news-consolidation.md)
- esbuild 플러그인으로 .md 파일 import 지원
- 코드 중복 제거 및 일관된 뉴스 생성 품질 확보

---
*최종 업데이트: 2025-09-19 - 순수 함수 라이브러리 통합 및 아키텍처 개선*