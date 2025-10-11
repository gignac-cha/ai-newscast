# Newscast Generator Worker

Cloudflare Workers 기반 AI 뉴스캐스트 생성 API

## 개요

Google Gemini AI를 활용하여 통합 뉴스에서 듀얼 호스트 뉴스캐스트 스크립트를 생성하고, TTS 오디오를 합성하며, AWS Lambda를 통해 최종 오디오를 병합하는 서버리스 API입니다.

## 주요 기능

- **AI 스크립트 생성**: Google Gemini 2.5 Pro가 대화형 뉴스캐스트 스크립트 생성
- **TTS 오디오 합성**: Google Cloud TTS Chirp HD로 개별 오디오 파일 생성
- **Lambda 통합**: AWS Lambda FFmpeg로 최종 오디오 병합
- **자동 스케줄링**: Cron Triggers로 토픽별 자동 생성 (매일 09:51-10:00)
- **R2 스토리지**: 뉴스 데이터 읽기 및 결과 저장

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
# 서비스 상태 확인
curl "https://your-worker.workers.dev/status"

# 스크립트 생성
curl "https://your-worker.workers.dev/script?newscast-id=2025-10-05T10-00-00-000Z&topic-index=1"

# 오디오 생성
curl "https://your-worker.workers.dev/audio?newscast-id=2025-10-05T10-00-00-000Z&topic-index=1"

# 최종 병합 (Lambda 경유)
curl "https://your-worker.workers.dev/newscast?newscast-id=2025-10-05T10-00-00-000Z&topic-index=1"
```

## 출력 예시

### 성공 응답

```json
{
  "success": true,
  "newscast_id": "2025-10-05T10-00-00-000Z",
  "topic_index": 1,
  "message": "Generated newscast script for topic 1",
  "output_files": {
    "json": "newscasts/.../newscast-script.json",
    "markdown": "newscasts/.../newscast-script.md"
  },
  "timestamp": "2025-10-05T10:05:00.000Z"
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
- **TTS**: Google Cloud TTS Chirp HD
- **Storage**: Cloudflare R2 + KV
- **Audio Merge**: AWS Lambda (Python FFmpeg)

## 동작 방식

1. **읽기**: R2에서 토픽별 통합 뉴스 가져오기
2. **스크립트 생성**: Gemini AI로 듀얼 호스트 대화 생성
3. **오디오 생성**: TTS API로 개별 MP3 파일 생성
4. **병합**: Lambda FFmpeg로 최종 뉴스캐스트 병합
5. **저장**: R2에 결과 저장 (JSON + Markdown)

## 자동 스케줄

매일 자동 실행:
- **09:51-09:59**: 토픽 1-9 생성 (분당 1개 토픽)
- **10:00**: 토픽 10 생성

이전 단계인 뉴스 생성(09:41-09:50) 완료 후 순차 실행됩니다.

## 환경 설정

`wrangler.toml`에서 설정:

```toml
[vars]
LAMBDA_AUDIO_MERGE_URL = "https://your-api-gateway-url/prod/newscast"

[triggers]
crons = [
  "51-59 9 * * *",  # 토픽 1-9
  "0 10 * * *"      # 토픽 10
]
```

환경 변수:
```bash
wrangler secret put GOOGLE_GEN_AI_API_KEY
wrangler secret put GOOGLE_CLOUD_API_KEY
```

## 개발 가이드

상세한 API 명세, 코딩 규칙, Lambda 통합 방법은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/newscast-generator**: 핵심 생성 로직
- **newscast-generator-lambda**: AWS Lambda 오디오 병합
- **@ai-newscast/newscast-scheduler-worker**: 전체 파이프라인 오케스트레이션

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
