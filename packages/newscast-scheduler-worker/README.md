# Newscast Scheduler Worker

통합 Cron 스케줄러로 AI 뉴스캐스트 파이프라인 전체를 조율하는 Cloudflare Workers 서비스

## 🌟 이게 뭔가요?

Cloudflare Workers 무료 플랜의 cron 제한(5개)을 극복하기 위해 모든 파이프라인 단계의 스케줄을 하나의 워커에서 통합 관리합니다.

## ✨ 핵심 기능

- **통합 스케줄링**: 5개 cron으로 전체 파이프라인 조율 (09:05-10:20)
- **Service Binding**: 워커 간 내부 호출로 빠르고 비용 효율적
- **토픽 분산 처리**: 10개 토픽을 시간별로 분산 처리
- **수동 트리거**: 테스트용 HTTP 엔드포인트 제공

## 🚀 빠른 시작

### 배포

```bash
# 의존성 설치
pnpm install

# 빌드
pnpm build

# Cloudflare에 배포
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

## ⏰ 자동 스케줄

| 시간 | 작업 | 설명 |
|------|------|------|
| 09:05 | Crawl Topics | 트렌딩 토픽 10개 추출 |
| 09:10-09:40 | Crawl News Details | 뉴스 상세정보 배치 처리 (매분) |
| 09:41-09:50 | Generate News | AI 뉴스 통합 (토픽 1-10) |
| 09:51-10:00 | Generate Script | 뉴스캐스트 스크립트 생성 (토픽 1-10) |
| 10:01-10:10 | Generate Audio | TTS 오디오 생성 (토픽 1-10) |
| 10:11-10:20 | Merge Newscast | FFmpeg 오디오 병합 (토픽 1-10) |

## 🎯 워커 통합

이 스케줄러가 호출하는 워커들:

- **news-crawler-worker**: 뉴스 크롤링
- **news-generator-worker**: AI 뉴스 통합
- **newscast-generator-worker**: 뉴스캐스트 스크립트 생성

## 📦 API 엔드포인트

- `GET /` - 헬프 메시지
- `GET /health` - 헬스 체크
- `GET /trigger/crawl-topics` - 토픽 크롤링 수동 실행
- `GET /trigger/crawl-news-details` - 뉴스 상세정보 수동 실행
- `GET /trigger/generate-news?topic-index=N` - 뉴스 생성 수동 실행
- `GET /trigger/generate-script?topic-index=N` - 스크립트 생성 수동 실행
- `GET /trigger/generate-audio?topic-index=N` - 오디오 생성 수동 실행
- `GET /trigger/merge-newscast?topic-index=N` - 오디오 병합 수동 실행

## 🔧 Service Bindings

`wrangler.toml`에서 설정:

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
```

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **아키텍처**: CLAUDE.md의 "스케줄 매핑 전략" 섹션

## 🔗 관련 패키지

- **@ai-newscast/news-crawler-worker**: 뉴스 크롤링
- **@ai-newscast/news-generator-worker**: AI 뉴스 통합
- **@ai-newscast/newscast-generator-worker**: 스크립트 생성

---

Cloudflare Workers + KV + Cron Triggers로 구축
