# Newscast Generator Worker Package - AI Development Guide

Claude에게: 이 패키지는 뉴스캐스트 생성 파이프라인을 Workers API로 제공합니다. 사용자 친화적 정보는 README.md를 참조하세요. 이 문서는 스케줄링 시스템, 토픽 분산 처리, Lambda 통합에 집중합니다.

## 🏗️ 아키텍처 및 스케줄링 시스템

**핵심 설계:**
- **토픽별 분산 처리**: 각 토픽을 개별 cron으로 분산 (09:51-10:00, 매분 1토픽)
- **스크립트 생성 완료**: Gemini AI 통합 (handlers/script.ts)
- **오디오 생성 제약**: TTS API 호환성 검증 필요 (Workers 환경 제약)
- **병합 처리 해결**: Lambda API 호출로 FFmpeg 실행 (handlers/newscast.ts)

**Cron 스케줄 설계:**
```toml
crons = [
  "51-59 9 * * *",  # 09:51-09:59 → 토픽 1-9 (시간 기반 매핑)
  "0 10 * * *"      # 10:00 → 토픽 10
]
```

## 🛠️ 기술 스택

### Cloudflare Workers 환경
- **Runtime**: TypeScript + esbuild 번들링
- **스토리지**: R2 Bucket (뉴스 데이터) + KV Namespace (메타데이터)
- **스케줄링**: Cron Triggers (뉴스캐스트 생성 자동화)
- **AI 통합**: Google Gemini 2.5 Pro + Google Cloud TTS

### 의존성
- **@ai-newscast/core**: 공통 타입 정의
- **@ai-newscast/news-generator**: AI 뉴스 생성 로직
- **@ai-newscast/newscast-generator**: 뉴스캐스트 생성 로직

## 🚀 배포 및 설정

### 환경 요구사항
- **Wrangler CLI**: Cloudflare Workers 배포 도구
- **Node.js**: 24+ (TypeScript experimental stripping)
- **API Keys**: Google Gemini 2.5 Pro, Google Cloud TTS

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

[triggers]
crons = [
  "51-59 9 * * *",  # 매일 오전 9시 51분~59분 - 토픽 1-9 스크립트 생성
  "0 10 * * *"      # 매일 오전 10시 정각 - 토픽 10 스크립트 생성
]
```

### 환경변수 (Secrets)
```bash
# Wrangler로 API 키 설정
wrangler secret put GOOGLE_GEN_AI_API_KEY
wrangler secret put GOOGLE_CLOUD_API_KEY
```

## 📋 API 엔드포인트

### GET /
헬프 메시지 및 사용 가능한 엔드포인트 목록

### GET /status (v3.7.3+)
서비스 상태 및 환경 변수 확인

```bash
curl "https://ai-newscast-newscast-generator-worker.example.workers.dev/status"
```

**응답 예시:**
```json
{
  "status": "healthy",
  "service": "newscast-generator-worker",
  "version": "1.0.0",
  "timestamp": "2025-10-06T11:35:00.000Z",
  "endpoints": {
    "script": "GET /script?newscast-id={id}&topic-index={n}",
    "audio": "GET /audio?newscast-id={id}&topic-index={n}",
    "newscast": "GET /newscast?newscast-id={id}&topic-index={n}"
  },
  "environment": {
    "hasGeminiAPIKey": true,
    "hasTTSAPIKey": true,
    "hasBucket": true,
    "hasKV": true
  }
}
```

### GET /script?newscast-id={id}&topic-index={n}
```bash
curl "https://ai-newscast-newscast-generator-worker.example.workers.dev/script?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"
```

**기능:**
- 토픽별 통합 뉴스(`topic-{NN}/news.json`)를 읽어 뉴스캐스트 스크립트 생성
- Google Gemini 2.5 Pro를 활용한 대화형 스크립트 작성
- R2에 `topic-{NN}/newscast-script.json` 저장

**파라미터:**
- `newscast-id`: 뉴스캐스트 ID (필수)
- `topic-index`: 토픽 인덱스 1-10 (필수)

**응답 예시:**
```json
{
  "success": true,
  "newscast_id": "2025-09-19T10-00-00-000Z",
  "topic_index": 1,
  "message": "Generated newscast script for topic 1",
  "output_files": {
    "json": "newscasts/{id}/topic-01/newscast-script.json",
    "markdown": "newscasts/{id}/topic-01/newscast-script.md"
  },
  "timestamp": "2025-09-19T10:05:00.000Z"
}
```

### GET /audio?newscast-id={id}&topic-index={n}
```bash
curl "https://ai-newscast-newscast-generator-worker.example.workers.dev/audio?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"
```

**기능:**
- 토픽별 뉴스캐스트 스크립트를 읽어 TTS 오디오 파일 생성
- Google Cloud TTS Chirp HD 사용 (30개 한국어 프리미엄 음성)
- 개별 오디오 파일들을 토픽별 디렉터리에 R2 저장

**제한사항:**
- **현재 구현 상태**: 플레이스홀더 (Workers에서 TTS API 호환성 검증 필요)
- **대안**: 외부 서비스 호출 또는 Durable Objects 활용 고려

### GET /newscast?newscast-id={id}&topic-index={n}
```bash
curl "https://ai-newscast-newscast-generator-worker.example.workers.dev/newscast?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"
```

**기능:**
- 토픽별 개별 오디오 파일들을 최종 뉴스캐스트로 병합
- FFmpeg 기반 오디오 처리

**제한사항:**
- **Workers 제약**: FFmpeg 바이너리 실행 불가
- **대안**: 외부 처리 서비스, Durable Objects, 또는 서버리스 함수 활용

### GET /full?newscast-id={id}&topic-index={n}
```bash
curl "https://ai-newscast-newscast-generator-worker.example.workers.dev/full?newscast-id=2025-09-19T10-00-00-000Z&topic-index=1"
```

**기능:**
- 토픽별 전체 파이프라인 실행: script → audio → newscast
- 각 단계별 상태 추적 및 에러 처리

**응답 예시:**
```json
{
  "success": true,
  "newscast_id": "2025-09-19T10-00-00-000Z",
  "topic_index": 1,
  "pipeline": "full",
  "steps": {
    "script": { "status": "completed", "data": {...} },
    "audio": { "status": "completed", "data": {...} },
    "newscast": { "status": "completed", "data": {...} }
  },
  "timestamp": "2025-09-19T10:35:00.000Z"
}
```

## ⏰ 스케줄링 시스템

### 자동 실행 스케줄
- **09:51-09:59**: 토픽별 스크립트 생성 (매분 1개 토픽, 토픽 1-9)
- **10:00**: 토픽 10 스크립트 생성

### 스케줄 최적화 배경
- **뉴스 수집 완료**: 오전 9:41-50 뉴스 생성 완료 후 스크립트 처리
- **토픽별 분산**: 각 토픽을 개별적으로 순차 처리하여 리소스 분산
- **시간 기반 매핑**: 09:51→토픽1, 09:52→토픽2, ..., 10:00→토픽10

### 워크플로우
1. **09:41-09:50**: 토픽별 뉴스 생성 (news-generator-worker)
2. **09:51-10:00**: 토픽별 뉴스캐스트 스크립트 생성 (10분간)
3. **향후**: TTS 오디오 생성 → 최종 병합 단계 추가 예정

## 📁 파일 구조

```
packages/newscast-generator-worker/
├── worker.ts                # 메인 Worker 엔트리포인트
├── wrangler.toml           # Cloudflare Workers 설정
├── build.ts                # esbuild 설정
├── handlers/               # API 핸들러
│   ├── help.ts            # 헬프 엔드포인트
│   ├── script.ts          # 스크립트 생성 핸들러
│   ├── audio.ts           # 오디오 생성 핸들러
│   ├── newscast.ts        # 뉴스캐스트 병합 핸들러
│   └── full.ts            # 전체 파이프라인 핸들러
├── utils/                 # 유틸리티 함수
│   ├── cors.ts           # CORS 헤더 처리
│   ├── error.ts          # 에러 응답 생성
│   ├── json.ts           # JSON 응답 생성
│   └── response.ts       # HTTP 응답 래퍼
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
- **API Keys**: Wrangler secrets로 관리

### 코딩 패턴
- **모든 핸들러**: async/await + try/catch 에러 처리
- **CORS**: 모든 응답에 CORS 헤더 자동 적용
- **타입 안전성**: Cloudflare Workers Types 활용
- **일관된 응답**: json 유틸리티로 표준화된 응답 구조

## 🚨 운영 고려사항

### Cloudflare Workers 제한사항
- **CPU 시간**: 30초 (AI 처리 시간 고려)
- **메모리**: 128MB (대용량 오디오 파일 처리 시 주의)
- **바이너리 실행**: FFmpeg 등 외부 바이너리 실행 불가

### 현재 구현 상태
- **✅ 완성**: API 엔드포인트, 라우팅, 에러 처리, 토픽별 처리 시스템
- **✅ 완성**: 스크립트 생성 (Gemini API 통합 완료)
- **⚠️ 제약**: TTS 오디오 생성 (API 호환성 검증 필요)
- **❌ 제약**: FFmpeg 오디오 병합 (Workers에서 불가)

### 대안 아키텍처
1. **하이브리드 접근**: Workers에서 스크립트 생성, 외부에서 오디오 처리
2. **Durable Objects**: 장시간 처리 작업용
3. **외부 서비스**: TTS/FFmpeg 전용 마이크로서비스
4. **Cloudflare Functions**: 더 긴 실행 시간 지원

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
# KV 상태 확인
curl "https://your-worker.workers.dev/script?newscast-id=latest"

# R2 스토리지 확인
wrangler r2 object list ai-newscast --prefix="newscasts/"
```

## 🔄 향후 개발 계획

### Phase 1: 기본 기능 완성
- [x] Gemini API 통합으로 스크립트 생성 완성
- [x] 토픽별 분산 처리 시스템 구현
- [ ] Workers 환경에서 TTS API 호환성 검증
- [ ] 외부 FFmpeg 서비스 연동 또는 대안 구현

### Phase 2: 성능 최적화
- [ ] 배치 처리 최적화
- [ ] 캐싱 전략 구현
- [ ] 에러 복구 메커니즘 강화

### Phase 3: 고급 기능
- [x] 멀티 토픽 분산 처리 (시간 기반)
- [ ] 실시간 진행상황 추적
- [ ] 음성 품질 최적화

## 📊 Metrics 시스템 (v3.7.3+)

### 자동 metrics 전달
모든 핸들러는 `newscastID`와 `topicIndex`를 자동으로 전달합니다:

**handlers/script.ts:**
```typescript
const result = await generateNewscastScript({
  news: newsData,
  promptTemplate: newscastScriptPrompt,
  voices: defaultVoices,
  apiKey,
  newscastID,           // URL 파라미터에서 전달
  topicIndex: topicIndexNumber,  // URL 파라미터에서 전달
});
```

**handlers/audio.ts:**
```typescript
const result = await generateNewscastAudio({
  newscastData,
  apiKey,
  newscastID,           // URL 파라미터에서 전달
  topicIndex: topicIndexNumber,  // URL 파라미터에서 전달
});
```

### 출력 JSON 구조
생성된 모든 JSON 파일(`newscast-script.json`, `audio-files.json`)에는 `metrics` 필드가 자동으로 포함됩니다:

```typescript
{
  timestamp: string;
  // ... 데이터 필드들
  metrics: {
    newscastID: string;
    topicIndex: number;
    timing: { ... },
    input: { ... },
    output: { ... },
    performance: { ... }
  }
}
```

---
*최종 업데이트: 2025-10-06 v3.7.3 - Metrics 시스템 추가 + /status 엔드포인트 추가*