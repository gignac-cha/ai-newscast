# HTTP 526 에러 해결 과정 (UltraThink 분석)

## 📋 문제 정의 (Problem Definition)

**발생한 문제:**
- Cloudflare Workers에서 BigKinds API (`/news-detail`) 호출 시 HTTP 526 에러 발생
- 로컬 환경에서는 정상 작동하지만 Workers 환경에서만 실패
- topics API는 정상 작동 (HTML 스크래핑), detail API만 실패 (HTTPS API 호출)

**에러 메시지:**
```json
{"success":false,"error":"Internal Server Error","message":"HTTP 526: "}
```

## 🔍 원인 분석 (Root Cause Analysis)

### 1단계: 에러 코드 의미 파악
- **HTTP 526**: "Invalid SSL Certificate" 에러
- Cloudflare가 원본 서버의 SSL 인증서를 검증할 수 없음

### 2단계: Cloudflare Workers 특성 분석
- **핵심 발견**: Workers는 외부 API 호출 시 **Full (strict) SSL 모드 강제 적용**
- 일반적인 Cloudflare 설정과 무관하게 Workers만의 엄격한 SSL 검증 정책 존재
- BigKinds API의 SSL 인증서가 Workers의 엄격한 검증을 통과하지 못함

### 3단계: 환경별 차이점 분석
| 환경 | SSL 검증 정책 | 결과 |
|------|---------------|------|
| 로컬 (Node.js) | 기본 검증 | ✅ 성공 |
| Cloudflare Workers | Full (strict) 강제 | ❌ 526 에러 |

## 💡 해결책 탐색 (Solution Exploration)

### 방법 1: Custom Origin Trust Store
```toml
compatibility_flags = ["cots_on_external_fetch"]
```
- **장점**: 공식적인 해결 방법
- **단점**: 복잡한 인증서 관리 필요

### 방법 2: Fetch 옵션 조정
```javascript
const response = await fetch(url, {
  cf: {
    minTlsVersion: "1.0"
  }
});
```
- **장점**: 간단한 구현
- **단점**: SSL 보안 수준 낮아짐

### 방법 3: 조합 방식 (선택한 해결책)
두 방법을 동시 적용하여 최대 호환성 확보

## ⚙️ 실행 과정 (Implementation Steps)

### Step 1: wrangler.toml 설정 변경
```toml
# Before
compatibility_flags = ["nodejs_compat"]

# After
compatibility_flags = ["nodejs_compat", "cots_on_external_fetch"]
```

### Step 2: Fetch 코드 수정
```typescript
// Before
const response = await fetch(url.toString(), {
  headers
});

// After
const response = await fetch(url.toString(), {
  headers,
  cf: {
    minTlsVersion: "1.0"
  }
});
```

### Step 3: 배포 및 검증
```bash
pnpm build && pnpm exec wrangler deploy
```

## ✅ 결과 검증 (Verification)

### Before (실패)
```bash
curl "https://worker.workers.dev/news-detail?newsId=X"
# 결과: {"success":false,"error":"Internal Server Error","message":"HTTP 526: "}
```

### After (성공)
```bash
curl "https://worker.workers.dev/news-detail?newsId=01100501.20250914165009001"
# 결과: 완전한 뉴스 상세 정보 (9810 bytes)
```

### 성공 지표
- ✅ HTTP 526 에러 완전 해결
- ✅ 뉴스 상세 정보 정상 추출 (제목, 본문, 메타데이터)
- ✅ Zod 검증 통과
- ✅ 원본 URL 정상 추출: `https://www.munhwa.com/article/11532964?ref=kpf`

## 🎯 핵심 교훈 (Key Learnings)

### 1. Cloudflare Workers SSL 정책 이해
- Workers는 **독립적인 SSL 검증 정책**을 가짐
- 일반 Cloudflare 설정과는 별도로 관리됨
- 외부 API 호출 시 Full (strict) 모드 강제 적용

### 2. 디버깅 방법론
1. **환경 격리**: 로컬 vs Workers 환경 차이점 파악
2. **에러 코드 분석**: HTTP 526의 정확한 의미 조사
3. **공식 문서 검토**: Cloudflare Workers 특성 이해
4. **단계적 해결**: 여러 방법 조합으로 문제 해결

### 3. 예방법
- **초기 설계 시** Workers의 SSL 정책 고려
- **테스트 환경** Workers 배포 포함
- **모니터링** 외부 API 호출 성공률 추적

## 📚 참고 자료 (References)

1. [Cloudflare Error 526 Documentation](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-5xx-errors/error-526/)
2. [Workers Compatibility Flags](https://developers.cloudflare.com/workers/platform/compatibility-dates/)
3. [Cloudflare Workers Fetch API](https://developers.cloudflare.com/workers/runtime-apis/fetch/)

## 🔧 코드 변경 이력 (Code Changes)

### 파일 1: `wrangler.toml`
```diff
-compatibility_flags = ["nodejs_compat"]
+compatibility_flags = ["nodejs_compat", "cots_on_external_fetch"]
```

### 파일 2: `crawl-news-detail.ts`
```diff
const response = await fetch(url.toString(), {
-  headers
+  headers,
+  cf: {
+    minTlsVersion: "1.0"
+  }
});
```

---

**해결 완료일**: 2025-09-14
**소요 시간**: 약 2시간
**Worker URL**: https://ai-newscast-news-crawler-worker.r-s-account.workers.dev
**Version ID**: 81325616-b141-4829-b010-8f9d56248430