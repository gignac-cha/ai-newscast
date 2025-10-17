# Newscast Latest ID Worker

Cloudflare Workers 기반 최신 뉴스캐스트 ID 관리 API

## 개요

Cloudflare KV를 사용하여 최신 뉴스캐스트 ID를 관리하고 조회할 수 있는 서버리스 API입니다.

## 주요 기능

- **최신 ID 조회**: GET API로 최신 뉴스캐스트 ID 반환
- **ID 업데이트**: POST API로 새 뉴스캐스트 ID 저장
- **히스토리 추적**: 업데이트 이력을 KV에 자동 저장
- **ID 형식 검증**: ISO 타임스탬프 형식 강제 (YYYY-MM-DDTHH-MM-SS-NNNNNN)
- **CORS 지원**: 모든 오리진에서 접근 가능

## 빠른 시작

### 배포

```bash
# 의존성 설치
npm install

# Worker 빌드 및 배포
npm run deploy
```

### API 사용

```bash
# 최신 ID 조회
curl https://your-worker.workers.dev/latest

# ID 업데이트
curl -X POST https://your-worker.workers.dev/update \
  -H "Content-Type: application/json" \
  -d '{"id": "2025-10-05T10-00-00-000000"}'

# 서비스 정보
curl https://your-worker.workers.dev/
```

## 출력 예시

### GET /latest

```json
{
  "latest-newscast-id": "2025-10-05T10-00-00-000000",
  "timestamp": "2025-10-05T10:05:30.123Z",
  "found": true
}
```

### POST /update

```json
{
  "success": true,
  "updated-newscast-id": "2025-10-05T10-00-00-000000",
  "previous-newscast-id": "2025-10-04T10-00-00-000000",
  "timestamp": "2025-10-05T10:00:15.456Z"
}
```

### GET / (서비스 정보)

```json
{
  "name": "AI Newscast Latest ID Worker",
  "version": "1.0.0",
  "description": "Manages latest newscast ID with KV storage",
  "endpoints": {
    "GET /latest": "Get the latest newscast ID",
    "POST /update": "Update the latest newscast ID"
  },
  "timestamp": "2025-10-05T10:00:00.000Z"
}
```

## 기술 스택

- **Runtime**: Cloudflare Workers (TypeScript + esbuild)
- **Storage**: Cloudflare KV Namespace
- **Validation**: ISO timestamp format (regex)
- **CORS**: Full cross-origin support

## ID 형식

뉴스캐스트 ID는 다음 형식을 따라야 합니다:

```
YYYY-MM-DDTHH-MM-SS-NNNNNN

예시: 2025-10-05T10-00-00-000000
```

- YYYY: 4자리 연도
- MM: 2자리 월
- DD: 2자리 일
- HH: 2자리 시
- MM: 2자리 분
- SS: 2자리 초
- NNNNNN: 6자리 마이크로초

## 개발 가이드

상세한 API 명세, 코딩 규칙, KV 스키마는 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/newscast-web**: 웹 플레이어 (이 API 사용)
- **@ai-newscast/newscast-scheduler-worker**: 파이프라인 스케줄러 (ID 업데이트)

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
