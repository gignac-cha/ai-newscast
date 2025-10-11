# News Crawler Worker

Cloudflare Workers 기반 빅카인드 뉴스 크롤링 API

## 개요

빅카인드(BigKinds)에서 트렌딩 뉴스를 자동으로 크롤링하여 Cloudflare R2 스토리지에 저장하는 서버리스 API입니다.

## 주요 기능

- **자동 스케줄링**: Cron Triggers로 매일 오전 9시 자동 실행
- **큐 기반 배치**: 40개씩 배치 처리로 효율적인 크롤링
- **토픽 수집**: 트렌딩 토픽 10개 자동 추출
- **R2 스토리지**: 구조화된 뉴스 데이터 저장
- **상태 관리**: KV로 처리 진행상황 추적

## 빠른 시작

### 배포

```bash
# 의존성 설치
pnpm install

# Worker 빌드 및 배포
pnpm run deploy
```

### API 사용

```bash
# 트렌딩 토픽 수집
curl "https://your-worker.workers.dev/topics?save=true"

# 뉴스 상세정보 배치 처리
curl "https://your-worker.workers.dev/details?newscast-id=2025-10-05T10-00-00-000Z"

# 서비스 상태 확인
curl "https://your-worker.workers.dev/status"
```

## 출력 예시

### 성공 응답

```json
{
  "success": true,
  "newscast_id": "2025-10-05T10-00-00-000Z",
  "total_items": 364,
  "processed_batch_size": 40,
  "current_index": 0,
  "new_index": 40,
  "message": "Successfully processed 40/40 news items"
}
```

### 출력 구조

```
newscasts/{newscast-id}/
├── topics.json              # 10개 트렌딩 토픽
├── news-list.json           # 플랫한 뉴스 목록
└── topic-{01-10}/
    ├── news-list.json       # 토픽별 뉴스 목록
    └── news/
        └── {news-id}.json   # 개별 뉴스 상세정보
```

## 기술 스택

- **Runtime**: Cloudflare Workers (TypeScript + esbuild)
- **Storage**: Cloudflare R2 + KV
- **Crawler**: @ai-newscast/news-crawler (TypeScript)
- **Parser**: Cheerio (서버사이드 HTML 파싱)

## 동작 방식

1. **토픽 수집** (09:05): 빅카인드에서 트렌딩 토픽 10개 추출
2. **배치 처리** (09:10-09:40): 뉴스 상세정보 40개씩 배치 처리
3. **R2 저장**: 구조화된 데이터 저장
4. **KV 추적**: 큐 인덱스로 진행상황 관리

## 자동 스케줄

매일 자동 실행:
- **09:05**: 토픽 수집
- **09:10-09:40**: 뉴스 상세정보 배치 처리 (31분간)

## 환경 설정

`wrangler.toml`에서 설정:

```toml
[triggers]
crons = [
  "5 9 * * *",      # 토픽 수집
  "10-40 9 * * *"   # 뉴스 상세정보 처리
]
```

## 개발 가이드

상세한 API 명세, 코딩 규칙, 큐 기반 처리 방법은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/news-crawler**: 핵심 크롤링 로직
- **@ai-newscast/news-generator-worker**: 다음 단계 (뉴스 통합)

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
