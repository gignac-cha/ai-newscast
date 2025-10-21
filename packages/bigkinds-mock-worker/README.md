# BigKinds Mock Worker

Cloudflare Workers 기반 BigKinds API 목업 서버

## 개요

뉴스 크롤러 테스트를 위해 실제 BigKinds API 대신 사용할 수 있는 목업 서버입니다. R2에 저장된 실제 HTML 파일을 프록시하여 응답합니다.

## 주요 기능

- **목업 엔드포인트**: `/1`, `/2`, `/3` 경로로 각기 다른 날짜의 topics.raw.html 제공
- **R2 Binding**: R2 bucket에 직접 접근 (internal network, egress 비용 없음)
- **CORS 지원**: 모든 오리진에서 접근 가능
- **장기 캐싱**: 1년 public 캐시로 성능 최적화 (static 파일)
- **core-worker 패턴**: 프로젝트 표준 Worker 유틸리티 사용

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
# 서비스 정보
curl https://your-worker.workers.dev/

# 목업 엔드포인트 1 (2025-10-18 데이터)
curl https://your-worker.workers.dev/1

# 목업 엔드포인트 2 (2025-10-19 데이터)
curl https://your-worker.workers.dev/2

# 목업 엔드포인트 3 (2025-10-20 데이터)
curl https://your-worker.workers.dev/3
```

## 엔드포인트 매핑

| 경로 | R2 파일 경로 |
|------|-------------|
| `/1` | `newscasts/2025-10-18T09-06-02-142Z/topics.raw.html` |
| `/2` | `newscasts/2025-10-19T09-05-38-085Z/topics.raw.html` |
| `/3` | `newscasts/2025-10-20T09-05-32-895Z/topics.raw.html` |

## 출력 예시

### GET / (서비스 정보)

```json
{
  "name": "BigKinds Mock Worker",
  "version": "1.0.0",
  "description": "Mock server for BigKinds API testing - proxies R2 HTML files",
  "endpoints": {
    "GET /1": "Proxy to newscasts/2025-10-18T09-06-02-142Z/topics.raw.html",
    "GET /2": "Proxy to newscasts/2025-10-19T09-05-38-085Z/topics.raw.html",
    "GET /3": "Proxy to newscasts/2025-10-20T09-05-32-895Z/topics.raw.html"
  },
  "timestamp": "2025-10-21T00:00:00.000Z"
}
```

### GET /1, /2, /3 (HTML 응답)

실제 BigKinds topics 페이지의 HTML 콘텐츠를 그대로 반환합니다.

```html
<!DOCTYPE html>
<html>
...
</html>
```

## 기술 스택

- **Runtime**: Cloudflare Workers (TypeScript + esbuild)
- **Storage**: Cloudflare R2 (R2 Binding - internal network access)
- **Utilities**: @ai-newscast/core-worker (CORS, error handling, caching)
- **Cache**: 1-year public cache (immutable static files)

## 개발

```bash
# 로컬 개발 서버 실행
pnpm run dev

# TypeScript 타입 체크
pnpm run type-check

# 빌드만 실행
pnpm run build
```

## 관련 패키지

- **@ai-newscast/news-crawler**: 이 목업 서버를 사용하는 크롤러
- **@ai-newscast/news-crawler-worker**: 크롤러 Worker API

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
