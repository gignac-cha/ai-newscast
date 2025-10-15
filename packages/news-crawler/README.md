# News Crawler

빅카인드(BigKinds)에서 실시간 뉴스를 자동으로 수집하는 TypeScript 크롤링 패키지

## 개요

빅카인드 뉴스 포털에서 트렌딩 토픽과 관련 뉴스를 3단계로 수집합니다.

## 주요 기능

- **트렌딩 토픽 추출**: 실시간 인기 토픽 10개를 중복 제거하여 추출
- **뉴스 목록 수집**: 각 토픽별 최대 100개 뉴스 기사 자동 수집
- **상세 정보 추출**: 제목, 본문, 요약, 언론사, 기자명 등 완전한 메타데이터 추출
- **CLI 지원**: Commander.js 기반 명령줄 인터페이스

## 빠른 시작

### 설치

```bash
# 루트에서 전체 설치
pnpm install
```

### 실행 방법

```bash
# 1. 토픽 추출 (루트에서 turbo를 통해 실행 - 권장)
pnpm run:crawler:news-topics -- --output outputs

# 2. 뉴스 목록 수집 (루트에서 turbo를 통해 실행 - 권장)
pnpm run:crawler:news-list -- \
  --topics-file outputs/{TIMESTAMP}/topics.json \
  --topic-index 1 \
  --output outputs/{TIMESTAMP}/topic-01

# 3. 상세 정보 추출 (패키지 디렉토리에서 jq로 news-list.json에서 ID 자동 추출)
cd packages/news-crawler && \
node command.ts details \
  --news-ids "$(jq -r '.newsIDs | join(",")' ../../outputs/{TIMESTAMP}/topic-01/news-list.json)" \
  --output ../../outputs/{TIMESTAMP}/topic-01 \
  --topic-index 1

# 또는 개별 뉴스 추출
cd packages/news-crawler && \
node command.ts detail \
  --news-id "01500051.20251015190423003" \
  --output ../../outputs/{TIMESTAMP}/topic-01 \
  --topic-index 1
```

**주의**: `{TIMESTAMP}`는 실제 생성된 타임스탬프로 교체하세요 (예: `2025-10-15T06-43-36-209Z`)

## 출력 예시

### 디렉터리 구조

```
outputs/2025-10-15T06-43-36-209Z/
├── topics.html                 # HTML 원본
├── topics.json                 # 10개 트렌딩 토픽
├── topic-01/
│   ├── news-list.json         # 뉴스 ID 목록
│   └── news/                  # 상세 크롤링 후 생성
│       ├── 01100201.json      # 개별 뉴스 상세정보
│       └── ...
└── topic-02/                   # 2순위 토픽 (동일 구조)
```

### 토픽 목록 (topics.json)

```json
{
  "topics": [
    {
      "rank": 1,
      "title": "이종섭 전 장관과 한학자 총재 조사",
      "keywords": ["한학자", "통일교", "김건희"],
      "news_count": 59,
      "href": "https://bigkinds.or.kr/..."
    }
  ],
  "count": 10,
  "timestamp": "2025-10-05T19:53:26.599Z"
}
```

### 뉴스 상세정보 (news/{id}.json)

```json
{
  "newsId": "02100701.20250917164815001",
  "title": "뉴스 제목",
  "content": "뉴스 본문 전체...",
  "summary": "뉴스 요약...",
  "category": "정치",
  "media": "연합뉴스",
  "reporter": "홍길동 기자",
  "publishedAt": "2025-09-17T16:48:15.000Z",
  "url": "https://bigkinds.or.kr/v2/news/..."
}
```

## 기술 스택

- **Node.js**: 24+
- **CLI**: Commander.js
- **HTTP/파싱**: fetch + Cheerio
- **타입 검증**: Zod schemas

## 프로그래밍 방식 사용

다른 패키지에서 함수를 직접 import하여 사용할 수 있습니다:

```typescript
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics';
import { crawlNewsList } from '@ai-newscast/news-crawler/crawl-news-list';
import { crawlNewsDetail } from '@ai-newscast/news-crawler/crawl-news-detail';

const topics = await crawlNewsTopics('./output/topic-list.json');
```

## 참고사항

- BigKinds 공개 API를 사용하며, 서버 보호를 위해 1초 간격으로 크롤링합니다
- `--output` 옵션으로 출력 경로 지정 가능 (기본: 패키지 기준 상대 경로)
- 출력 파일은 `{지정경로}/{ISO_TIMESTAMP}/` 구조로 자동 저장됩니다
- 중복 토픽은 자동으로 제거되어 항상 10개의 유니크한 토픽만 추출됩니다

## 개발 가이드

상세한 개발 규칙, API 명세, 코딩 컨벤션은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
