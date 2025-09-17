# News Crawler Package

빅카인드(bigkinds.or.kr)에서 뉴스 데이터를 수집하는 다중 언어 크롤링 패키지

## 📋 개요

이 패키지는 Python과 TypeScript 두 가지 구현을 제공하여 다양한 환경에서 뉴스 크롤링을 수행할 수 있습니다.

**지원 기능:**
- 트렌딩 토픽 추출 (10개 고유 토픽, 중복 제거)
- 토픽별 뉴스 목록 수집 (최대 100개/토픽)
- 개별 뉴스 상세 정보 추출
- Python (Typer CLI) + TypeScript (Commander.js) 듀얼 구현

## 🛠️ 기술 스택

### Python 구현
- **패키지 매니저**: UV (10-100배 빠른 설치)
- **CLI 프레임워크**: Typer (현대적 CLI 경험)
- **HTTP 클라이언트**: requests + lxml (BigKinds 크롤링)
- **실행 방식**: `uv run python news_crawler.py {command}`

### TypeScript 구현
- **빌드**: Node.js 24+ experimental type stripping
- **CLI 프레임워크**: Commander.js
- **HTTP 클라이언트**: Node.js fetch + Cheerio
- **타입 검증**: Zod 스키마
- **실행 방식**: `node --experimental-strip-types command.ts {command}`

## 🚀 설치 및 설정

### 환경 요구사항
- **Node.js**: 24+ (TypeScript experimental stripping 지원)
- **Python**: 3.11+ (UV 패키지 매니저 필수)
- **UV 설치**: `curl -LsSf https://astral.sh/uv/install.sh | sh`

### 패키지 설치
```bash
# 의존성 설치 (Python venv + TypeScript)
pnpm install
# 또는 개별 설치
npm run postinstall  # Python venv + dependencies
pnpm build           # TypeScript 빌드
```

## 📋 사용법

### Python CLI 명령어
```bash
# 트렌딩 토픽 추출 (10개)
pnpm run crawl:news-topics
# 또는 직접 실행
uv run python news_crawler.py news-topics

# 토픽별 뉴스 목록 수집 (최대 100개/토픽)
pnpm run crawl:news-list
uv run python news_crawler.py news-list

# 개별 뉴스 상세 정보 추출
pnpm run crawl:news-details
uv run python news_crawler.py news-details
```

### TypeScript CLI 명령어
```bash
# 트렌딩 토픽 추출
pnpm run crawl:ts-topics
# 또는 직접 실행
node --experimental-strip-types command.ts topics

# 전체 크롤링 파이프라인 (토픽 → 뉴스 목록 → 상세정보)
pnpm run crawl:ts-full
node --experimental-strip-types command.ts full-crawl
```

## 📁 파일 구조

```
packages/news-crawler/
├── Python 구현
│   ├── news_crawler.py          # 메인 CLI 엔트리포인트
│   ├── crawl_news_topics.py     # 토픽 추출
│   ├── crawl_news_list.py       # 뉴스 목록 수집
│   ├── crawl_news_details.py    # 뉴스 상세정보
│   ├── output_manager.py        # 출력 관리
│   └── requirements.txt         # Python 의존성
├── TypeScript 구현
│   ├── command.ts               # CLI 엔트리포인트
│   ├── crawl-news-topics.ts     # 토픽 추출
│   ├── crawl-news-detail.ts     # 뉴스 상세정보
│   ├── schemas.ts               # Zod 타입 스키마
│   └── tsconfig.json           # TypeScript 설정
├── 공통
│   ├── package.json            # 패키지 설정
│   ├── output/                 # 크롤링 결과 저장
│   └── .venv/                  # Python 가상환경
```

## 📊 출력 데이터 구조

### 토픽 목록 (topic-list.json)
```json
{
  "topics": [
    {
      "rank": 1,
      "title": "이종섭 전 장관과 한학자 총재 조사",
      "issue_name": "한학자 통일교 김건희 총재 특검 청탁 출석",
      "keywords": ["한학자", "통일교", "김건희"],
      "news_count": 59,
      "news_ids": ["02100701.20250917164815001", ...],
      "href": "/v2/search/news?issueKeyword=..."
    }
  ],
  "count": 10,
  "timestamp": "2025-09-17T16:47:13.922Z"
}
```

### 뉴스 상세정보 (news/{id}.json)
```json
{
  "newsId": "02100701.20250917164815001",
  "title": "뉴스 제목",
  "content": "뉴스 본문 내용",
  "summary": "뉴스 요약",
  "category": "정치",
  "media": "연합뉴스",
  "reporter": "기자명",
  "publishedAt": "2025-09-17T16:48:15.000Z",
  "url": "https://bigkinds.or.kr/v2/news/..."
}
```

## 🔧 개발 가이드

### 빌드 명령어
```bash
# TypeScript 빌드
pnpm build
pnpm dev          # watch 모드

# 타입 체크
pnpm typecheck

# Python 의존성 재설치
npm run postinstall
```

### 환경변수
현재 환경변수 없이 동작하며, BigKinds의 공개 API를 사용합니다.

### 코딩 스타일
- **Python**: Typer 기반 구조화된 CLI, Pydantic 타입 검증
- **TypeScript**: Commander.js + Zod 스키마, experimental type stripping
- **공통**: Nullish coalescing (`??`) 사용, `||` 금지

## 🚨 주의사항

### API Rate Limits
- **BigKinds**: 1초 간격으로 크롤링 (서버 부하 최소화)
- **동시 요청**: 순차 처리로 안정성 확보

### 에러 처리
- **Python**: Typer 기반 구조화된 에러 메시지
- **TypeScript**: Commander.js 오류 처리 + 재시도 로직

### 출력 관리
- **출력 경로**: `output/{ISO_TIMESTAMP}` 구조 유지
- **파일 인코딩**: UTF-8
- **JSON 포맷**: 2-space 들여쓰기

## 📦 패키지 Export

이 패키지는 다른 AI Newscast 패키지에서 사용할 수 있도록 함수들을 export합니다:

```typescript
// 다른 패키지에서 사용
import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics';
import { crawlNewsDetail } from '@ai-newscast/news-crawler/crawl-news-detail';
```

---
*최종 업데이트: 2025-09-18 - TypeScript 지원 및 듀얼 언어 구현 완성*