# Newscast Scheduler Worker

Cloudflare Workers 기반 AI 뉴스캐스트 파이프라인 통합 스케줄러

## 개요

Cloudflare Workers 무료 플랜의 cron 제한(5개)을 극복하여 전체 AI 뉴스캐스트 파이프라인을 하나의 워커에서 조율하는 통합 스케줄러입니다.

## 주요 기능

- **통합 스케줄링**: 5개 cron으로 7단계 파이프라인 완전 자동화
- **Service Binding**: 워커 간 내부 호출로 빠르고 비용 효율적
- **시간 기반 분산**: 토픽별 작업을 시간대별로 자동 분산
- **실패 격리**: 한 단계 실패해도 다음 단계 계속 실행
- **수동 트리거**: 테스트용 HTTP 엔드포인트 제공

## 빠른 시작

### 배포

```bash
# 의존성 설치
pnpm install

# Worker 빌드 및 배포
pnpm run deploy
```

### 로컬 테스트

```bash
# 개발 서버 시작
pnpm run dev

# 수동 트리거 테스트
curl http://localhost:8787/trigger/crawl-topics
curl http://localhost:8787/trigger/generate-news?topic-index=1
curl http://localhost:8787/trigger/generate-script?topic-index=1
```

## 출력 예시

### 성공 응답

```json
{
  "success": true,
  "stage": "generate-news",
  "topic_index": 1,
  "result": {
    "newscast_id": "2025-10-05T10-00-00-000Z",
    "execution_time_ms": 15420
  }
}
```

### 자동 스케줄

| 시간 | 작업 | 설명 |
|------|------|------|
| 09:05 | 토픽 크롤링 | 트렌딩 토픽 10개 추출 |
| 09:10-09:40 | 뉴스 크롤링 | 뉴스 상세정보 배치 처리 (31분간) |
| 09:41-09:50 | 뉴스 통합 | AI 뉴스 통합 (토픽 1-10) |
| 09:51-10:00 | 스크립트 생성 | 뉴스캐스트 스크립트 생성 (토픽 1-10) |
| 10:01-10:10 | 오디오 생성 | TTS 오디오 생성 (토픽 1-10) |
| 10:11-10:20 | 오디오 병합 | FFmpeg 병합 (토픽 1-10) |

## 기술 스택

- **Runtime**: Cloudflare Workers (TypeScript + esbuild)
- **Orchestration**: Service Bindings (워커 간 내부 호출)
- **Storage**: Cloudflare KV (newscast ID 관리)
- **Scheduling**: Cron Triggers (5개)

## 동작 방식

1. **Cron 실행**: 매일 설정된 시간에 자동 실행
2. **시간 매핑**: 현재 시간(시:분)으로 실행할 작업 결정
3. **워커 호출**: Service Binding으로 해당 워커 내부 호출
4. **결과 로깅**: 실행 결과를 CloudWatch Logs에 기록

## API 엔드포인트

- `GET /` - 헬프 메시지
- `GET /health` - 헬스 체크
- `GET /trigger/crawl-topics` - 토픽 크롤링 수동 실행
- `GET /trigger/crawl-news-details` - 뉴스 상세정보 수동 실행
- `GET /trigger/generate-news?topic-index=N` - 뉴스 생성 수동 실행
- `GET /trigger/generate-script?topic-index=N` - 스크립트 생성 수동 실행
- `GET /trigger/generate-audio?topic-index=N` - 오디오 생성 수동 실행
- `GET /trigger/merge-newscast?topic-index=N` - 오디오 병합 수동 실행

## 환경 설정

`wrangler.toml`에서 Service Bindings 설정:

```toml
[[services]]
binding = "NEWS_CRAWLER_WORKER"
service = "news-crawler-worker"

[[services]]
binding = "NEWS_GENERATOR_WORKER"
service = "news-generator-worker"

[[services]]
binding = "NEWSCAST_GENERATOR_WORKER"
service = "newscast-generator-worker"

[triggers]
crons = [
  "5 9 * * *",      # 토픽 크롤링
  "10-40 9 * * *",  # 뉴스 크롤링
  "41-50 9 * * *",  # 뉴스 통합
  "51-59 9 * * *",  # 스크립트 생성 (토픽 1-9)
  "0 10 * * *"      # 스크립트 생성 (토픽 10)
]
```

## 개발 가이드

상세한 스케줄 매핑 전략, Service Binding 패턴, 에러 처리 방식은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/news-crawler-worker**: 뉴스 크롤링
- **@ai-newscast/news-generator-worker**: AI 뉴스 통합
- **@ai-newscast/newscast-generator-worker**: 스크립트 생성

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
