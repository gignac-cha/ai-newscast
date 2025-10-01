# News Crawler Package

BigKinds 뉴스 크롤링 - Python (Typer) + TypeScript (Commander.js) 듀얼 구현

## 🎯 패키지 역할

- 트렌딩 토픽 추출 (10개 고유, 중복 제거)
- 토픽별 뉴스 목록 수집 (최대 100개/토픽)
- 개별 뉴스 상세 정보 추출
- 다른 패키지에서 import 가능한 함수 export

## 🛠️ 기술 스택

### Python 구현
- **버전**: Python 3.11+
- **패키지 매니저**: UV (10-100배 빠른 pip)
- **CLI**: Typer
- **HTTP**: requests + lxml
- **실행**: `uv run python news_crawler.py {command}`

### TypeScript 구현
- **버전**: Node.js 24+
- **빌드**: experimental type stripping (no build step)
- **CLI**: Commander.js
- **HTTP**: fetch + Cheerio
- **타입**: Zod 스키마
- **실행**: `node --experimental-strip-types command.ts {command}`

## 📁 파일 구조

```
packages/news-crawler/
├── Python 구현
│   ├── news_crawler.py          # 메인 CLI
│   ├── crawl_news_topics.py     # 토픽 추출
│   ├── crawl_news_list.py       # 뉴스 목록
│   ├── crawl_news_details.py    # 상세정보
│   ├── output_manager.py        # 출력 관리
│   ├── requirements.txt         # 의존성
│   └── .venv/                   # 가상환경
├── TypeScript 구현
│   ├── command.ts               # 메인 CLI
│   ├── crawl-news-topics.ts     # 토픽 추출
│   ├── crawl-news-detail.ts     # 상세정보
│   └── schemas.ts               # Zod 타입
└── output/                      # 크롤링 결과
```

## 📋 CLI 명령어

### Python (pnpm scripts)
```bash
pnpm run crawl:news-topics    # 토픽 추출
pnpm run crawl:news-list      # 뉴스 목록
pnpm run crawl:news-details   # 상세정보
```

### TypeScript (pnpm scripts)
```bash
pnpm run crawl:ts-topics      # 토픽 추출
pnpm run crawl:ts-full        # 전체 파이프라인
```

### 직접 실행
```bash
# Python
uv run python news_crawler.py news-topics
uv run python news_crawler.py news-list
uv run python news_crawler.py news-details

# TypeScript
node --experimental-strip-types command.ts topics
node --experimental-strip-types command.ts full-crawl
```

## 📊 출력 구조

### 디렉터리 구조
```
output/{ISO_TIMESTAMP}/
├── topic-list.json              # 10개 토픽
├── topic-01/
│   ├── news-list.json          # 최대 100개 뉴스
│   └── news/
│       ├── {newsId}.json       # 개별 상세정보
│       └── ...
└── topic-{NN}/                 # N순위 토픽
```

### topic-list.json 스키마
```typescript
{
  topics: Array<{
    rank: number;                    // 1-10
    title: string;                   // 토픽 제목
    issue_name: string;              // 이슈명
    keywords: string[];              // 키워드 배열
    news_count: number;              // 뉴스 개수
    news_ids: string[];              // 뉴스 ID 배열
    href: string;                    // BigKinds 링크
  }>;
  count: number;                     // 항상 10
  timestamp: string;                 // ISO 8601
}
```

### news/{id}.json 스키마
```typescript
{
  newsId: string;                    // BigKinds ID
  title: string;                     // 제목
  content: string;                   // 본문
  summary: string;                   // 요약
  category: string;                  // 카테고리
  media: string;                     // 언론사
  reporter: string;                  // 기자명
  publishedAt: string;               // ISO 8601
  url: string;                       // BigKinds URL
}
```

## 🔧 개발 명령어

```bash
pnpm build              # TypeScript 빌드
pnpm dev                # watch 모드
pnpm typecheck          # 타입 체크
npm run postinstall     # Python venv + deps 재설치
```

## 📦 패키지 Export

다른 패키지에서 사용 가능:
```typescript
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics';
import { crawlNewsDetail } from '@ai-newscast/news-crawler/crawl-news-detail';
```

## 🎨 코딩 규칙

### 공통
- Nullish coalescing 사용: `??` (O), `||` (X)
- 파일 인코딩: UTF-8
- JSON 포맷: 2-space indent

### Python
- 함수명: `snake_case`
- CLI: Typer decorators
- 타입: Pydantic validation

### TypeScript
- 함수명: `camelCase`
- 변수명: `camelCase` (예: `newsID`, `topicIndex`)
- API 파라미터: `kebab-case` (예: `newscast-id`)
- JSON 필드: `snake_case` (예: `news_id`)
- CLI: Commander.js
- 타입: Zod schemas

## ⚠️ 크롤링 규칙

### Rate Limiting
- **간격**: 1초 (BigKinds 서버 보호)
- **처리**: 순차적 (동시 요청 금지)
- **재시도**: 자동 없음 (에러 시 중단)

### 에러 처리
- **Python**: Typer 구조화된 에러
- **TypeScript**: Commander.js + try/catch
- **로깅**: 콘솔 출력 (상세)

### 출력 관리
- **경로**: `output/{ISO_TIMESTAMP}/` (자동 생성)
- **덮어쓰기**: 금지 (타임스탬프로 분리)
- **파일명**: 고정 (`topic-list.json`, `news-list.json`)

## 🔍 BigKinds API

### 엔드포인트
- 토픽: `/search/topicMain.do`
- 뉴스 목록: `/search/news` (query params)
- 뉴스 상세: `/v2/news/...` (HTML 파싱)

### 파싱 규칙
- **Python**: lxml + XPath
- **TypeScript**: Cheerio + CSS selectors
- **인코딩**: UTF-8 강제

---
*Claude: 이 패키지는 듀얼 구현(Python + TypeScript)을 유지하세요. 코드 수정 시 두 구현 모두 동기화해야 합니다.*
