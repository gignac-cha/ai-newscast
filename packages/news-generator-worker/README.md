# News Generator Worker

Cloudflare Workers 기반 AI 뉴스 통합 API

## 개요

Google Gemini AI를 활용하여 크롤링된 여러 뉴스 기사를 하나의 통합 뉴스 스토리로 생성하는 서버리스 API입니다.

## 주요 기능

- **AI 기반 통합**: Google Gemini 2.5 Pro가 여러 기사를 하나로 합성
- **자동 스케줄링**: Cron Triggers로 토픽별 자동 생성 (매일 09:41-09:50)
- **R2 스토리지**: 뉴스 데이터 읽기 및 결과 저장
- **다중 형식**: JSON 및 Markdown 출력
- **토픽 기반**: 1-10번 토픽 개별 처리

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
# 토픽별 뉴스 통합 생성
curl -X POST "https://your-worker.workers.dev/news?newscast-id=2025-10-05T10-00-00-000Z&topic-index=1"

# 생성 상태 확인
curl "https://your-worker.workers.dev/status?newscast-id=2025-10-05T10-00-00-000Z"
```

## 출력 예시

### 성공 응답

```json
{
  "success": true,
  "newscast_id": "2025-10-05T10-00-00-000Z",
  "topic_index": 1,
  "input_articles_count": 25,
  "sources_count": 8,
  "execution_time_ms": 15420,
  "output_files": {
    "json": "newscasts/.../news.json",
    "markdown": "newscasts/.../news.md"
  }
}
```

### 에러 응답

```json
{
  "error": "Missing required parameter: newscast-id",
  "status": 400
}
```

## 기술 스택

- **Runtime**: Cloudflare Workers (TypeScript + esbuild)
- **AI**: Google Gemini 2.5 Pro API
- **Storage**: Cloudflare R2 + KV
- **Library**: @ai-newscast/news-generator (순수 함수)

## 동작 방식

1. **읽기**: R2에서 토픽별 크롤링된 뉴스 기사 읽기
2. **통합**: Gemini AI로 통합 뉴스 스토리 생성
3. **저장**: R2에 JSON 및 Markdown 저장
4. **추적**: KV에 생성 상태 기록

## 자동 스케줄

매일 자동 실행:
- **09:41-09:49**: 토픽 1-9 생성 (분당 1개 토픽)
- **09:50**: 토픽 10 생성

뉴스 크롤링 완료 후 순차 실행됩니다.

## 환경 설정

`wrangler.toml`에서 설정:

```toml
[vars]
# Wrangler Secrets로 설정
# wrangler secret put GOOGLE_GEN_AI_API_KEY

[triggers]
crons = [
  "41-49 9 * * *",  # 토픽 1-9
  "50 9 * * *"      # 토픽 10
]
```

## 개발 가이드

상세한 API 명세, 코딩 규칙, 순수 함수 활용법은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/news-generator**: 핵심 뉴스 생성 로직
- **@ai-newscast/news-crawler-worker**: 이전 단계 (뉴스 크롤링)
- **@ai-newscast/newscast-generator-worker**: 다음 단계 (스크립트 생성)

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
