# News Crawler Worker Package

빅카인드 뉴스 크롤링 기능을 제공하는 Cloudflare Workers API 서비스

## 📋 개요

이 패키지는 Cloudflare Workers 환경에서 실행되는 뉴스 크롤링 API 서버입니다. `@ai-newscast/news-crawler` 패키지의 TypeScript 구현을 활용하여 웹 API 형태로 크롤링 기능을 제공합니다.

**핵심 기능:**
- 트렌딩 토픽 추출 및 R2 스토리지 저장
- 큐 기반 뉴스 상세정보 배치 처리 (40개씩)
- 스케줄링 기반 자동 크롤링 (오전 9시 집중 크롤링)
- CORS 지원 및 에러 처리

## 🛠️ 기술 스택

### Cloudflare Workers 환경
- **Runtime**: TypeScript + esbuild 번들링
- **스토리지**: R2 Bucket (뉴스 데이터) + KV Namespace (메타데이터)
- **스케줄링**: Cron Triggers (오전 9시 집중 실행)
- **빌드**: ESBuild (최적화된 번들링)

### 의존성
- **@ai-newscast/core**: 공통 타입 정의
- **@ai-newscast/news-crawler**: TypeScript 크롤링 함수
- **cheerio**: HTML 파싱 (서버사이드)

## 🚀 배포 및 설정

### 환경 요구사항
- **Wrangler CLI**: Cloudflare Workers 배포 도구
- **Node.js**: 24+ (TypeScript experimental stripping)

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
  "5 9 * * *",       # 매일 오전 9시 5분 - topics 수집
  "10-40 9 * * *"    # 매일 오전 9시 10-40분 - news details 처리
]
```

## 📋 API 엔드포인트

### GET /
헬프 메시지 및 사용 가능한 엔드포인트 목록

### GET /topics?save=true
```bash
curl "https://ai-newscast-news-crawler-worker.r-s-account.workers.dev/topics?save=true"
```

**기능:**
- 빅카인드에서 트렌딩 토픽 10개 추출
- R2에 구조화된 데이터 저장
- KV에 newscast ID 및 큐 인덱스 초기화

**출력 구조:**
```
newscasts/{newscast-id}/
├── topics.json              # 토픽 메타데이터
├── topics.raw.html          # 원본 HTML (save=true 시)
├── news-list.json           # 플랫한 뉴스 목록
└── topic-{01-10}/
    └── news-list.json       # 토픽별 뉴스 목록
```

### GET /news-details?newscast-id={id}
```bash
curl "https://ai-newscast-news-crawler-worker.r-s-account.workers.dev/news-details?newscast-id=2025-09-17T16-50-13-648Z"
```

**기능:**
- 큐 기반 배치 처리 (40개씩)
- KV에서 마지막 처리 인덱스 읽기/업데이트
- 병렬 처리 (10개씩 서브 배치)

**응답 예시:**
```json
{
  "success": true,
  "newscast_id": "2025-09-17T16-50-13-648Z",
  "total_items": 364,
  "processed_batch_size": 40,
  "current_index": 0,
  "new_index": 40,
  "success_count": 40,
  "failure_count": 0,
  "message": "Successfully processed 40/40 news items (index 0-39)"
}
```

### GET /news-detail?news-id={id}&newscast-id={id}&topic-index={n}
개별 뉴스 상세정보 추출 (내부 호출용)

## ⏰ 스케줄링 시스템

### 자동 실행 스케줄
- **매일 오전 9시 5분**: Topics 수집 (`handleTopics`)
- **매일 오전 9시 10-40분**: News Details 처리 (`handleNewsDetails`)
- **일일 처리량**: 최대 1,240개 (31분 × 40개)

### 스케줄 최적화 배경
- **분석 결과**: 오전 9시부터 뉴스 내용이 크게 변화 (경제/주식 중심)
- **효율성**: 야간 시간대 리소스 절약, 중요 시간대 집중 크롤링
- **증시 연동**: 한국 증시 개장(09:00) 시점과 맞춘 뉴스 수집

### 큐 기반 처리 흐름
1. **Topics 수집**: 플랫한 news-list.json 생성 + 큐 인덱스 0으로 초기화
2. **배치 처리**: KV에서 `last-working-news-queue-index` 읽기
3. **40개 처리**: 현재 인덱스부터 40개 아이템 처리
4. **인덱스 업데이트**: 새 인덱스를 KV에 저장
5. **반복**: 모든 뉴스 처리 완료까지

## 📁 파일 구조

```
packages/news-crawler-worker/
├── worker.ts                # 메인 Worker 엔트리포인트
├── wrangler.toml           # Cloudflare Workers 설정
├── build.ts                # esbuild 설정
├── handlers/               # API 핸들러
│   ├── help.ts            # 헬프 엔드포인트
│   ├── topics.ts          # 토픽 수집 핸들러
│   └── news-detail.ts     # 뉴스 상세정보 핸들러
├── utils/                 # 유틸리티 함수
│   ├── cors.ts           # CORS 헤더 처리
│   ├── error.ts          # 에러 응답 생성
│   ├── json.ts           # JSON 응답 생성
│   ├── response.ts       # HTTP 응답 래퍼
│   └── fetch.ts          # 확장된 fetch 유틸리티
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
- **Cron 설정**: wrangler.toml에서 스케줄 관리

### 코딩 패턴
- **모든 핸들러**: async/await + try/catch 에러 처리
- **CORS**: 모든 응답에 CORS 헤더 자동 적용
- **타입 안전성**: Cloudflare Workers Types + Zod 검증
- **JSON 응답**: 일관된 response 구조 유지

## 🚨 운영 고려사항

### Cloudflare Workers 제한사항
- **CPU 시간**: 30초 (크롤링 시간 고려)
- **메모리**: 128MB (배치 크기 조정 필요시)
- **Subrequest**: 50개/요청 (10개씩 서브 배치 처리)

### 에러 처리 및 모니터링
- **실패한 배치**: 로그에 기록, 다음날 9시에 재시도
- **KV 상태**: `last-working-news-queue-index`로 진행상황 추적
- **R2 저장**: 실패 시 이전 데이터 유지

### 성능 최적화
- **배치 크기**: 40개 (Workers 제한과 성능 균형)
- **병렬 처리**: 10개씩 서브 배치로 Subrequest 한도 준수
- **캐싱**: KV를 통한 상태 관리로 중복 처리 방지

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
curl "https://ai-newscast-news-crawler-worker.r-s-account.workers.dev/news-details?newscast-id=latest"

# R2 스토리지 확인 (wrangler r2 object list)
```

## 🔄 업데이트 이력

### v1.1.0 (2025-09-19)
- 뉴스 내용 분석 기반 스케줄 최적화 (오전 9시 집중 크롤링)
- 큐 기반 배치 처리 시스템 구현
- TypeScript 크롤링 함수 통합

---
*최종 업데이트: 2025-09-19 - 데이터 분석 기반 스케줄 최적화 완성*