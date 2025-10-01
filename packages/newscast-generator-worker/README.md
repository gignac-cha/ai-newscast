# Newscast Generator Worker

자동 AI 뉴스캐스트 스크립트 생성을 위한 Cloudflare Workers API

## 🌟 이게 뭔가요?

Google Gemini AI를 사용하여 통합 뉴스에서 뉴스캐스트 스크립트를 생성하는 서버리스 API입니다. 자동 스케줄링 및 토픽 기반 분산 처리와 함께 Cloudflare Workers에서 실행됩니다.

## ✨ 핵심 기능

- **AI 스크립트 생성**: Google Gemini 2.5 Pro가 듀얼 호스트 뉴스캐스트 대화 생성
- **자동 스케줄링**: 토픽 기반 cron 트리거 (매일 오전 9:51-10:00)
- **토픽 분산**: 리소스 최적화를 위해 분당 1개 토픽
- **R2 통합**: 뉴스 데이터 읽기 및 스크립트 출력 저장
- **다중 형식 출력**: JSON 및 Markdown

## 🚀 빠른 시작

### Cloudflare에 배포

```bash
# 의존성 설치
pnpm install

# Worker 빌드
pnpm build

# Cloudflare에 배포
pnpm run deploy
```

### API 엔드포인트 테스트

```bash
# 토픽의 스크립트 생성
curl "https://your-worker.workers.dev/script?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"

# 오디오 생성 (플레이스홀더)
curl "https://your-worker.workers.dev/audio?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"

# 전체 파이프라인
curl "https://your-worker.workers.dev/full?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"
```

## ⏰ 자동 스케줄

매일 자동 스크립트 생성:
- **오전 9:51-9:59**: 토픽 1-9 (분당 1개 토픽)
- **오전 10:00**: 토픽 10

이 스케줄은 뉴스 통합 완료 후 실행됩니다 (오전 9:41-9:50).

## 📊 동작 방식

1. **읽기**: R2에서 토픽의 통합 뉴스 가져오기
2. **생성**: Gemini AI를 사용하여 듀얼 호스트 뉴스캐스트 스크립트 생성
3. **저장**: JSON 및 Markdown 출력을 R2에 저장
4. **추적**: 메타데이터에 생성 상태 기록

## 🎯 출력 구조

```
newscasts/{newscast-id}/topic-{01-10}/
├── newscast-script.json       # TTS 메타데이터 포함 스크립트
└── newscast-script.md         # 사람이 읽기 쉬운 스크립트
```

## 📦 응답 예제

```json
{
  "success": true,
  "newscast_id": "2025-09-19T10-00-00-000Z",
  "topic_index": 1,
  "message": "Generated newscast script for topic 1",
  "output_files": {
    "json": "newscasts/.../newscast-script.json",
    "markdown": "newscasts/.../newscast-script.md"
  },
  "timestamp": "2025-09-19T10:05:00.000Z"
}
```

## 🔧 설정

`wrangler.toml`에서 설정:

```toml
[vars]
GOOGLE_GEN_AI_API_KEY = "your_gemini_api_key"
GOOGLE_CLOUD_API_KEY = "your_cloud_tts_api_key"

[triggers]
crons = [
  "51-59 9 * * *",  # 토픽 1-9
  "0 10 * * *"      # 토픽 10
]
```

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **라이브러리 문서**: `@ai-newscast/newscast-generator` 패키지 참조
- **스케줄링 세부사항**: CLAUDE.md의 "⏰ 스케줄링 시스템" 섹션

## 🔗 관련 패키지

- **@ai-newscast/newscast-generator**: 핵심 라이브러리
- **@ai-newscast/news-generator-worker**: 이전 파이프라인 단계
- **@ai-newscast/core**: 공유 타입

---

Cloudflare Workers + Google Gemini 2.5 Pro로 구축
