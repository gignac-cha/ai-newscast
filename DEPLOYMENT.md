# 배포 가이드

> v3.6.0 웹 플레이어 완성 버전 기준 Cloudflare 배포 가이드

## 📋 개요

AI 뉴스캐스트 프로젝트의 Cloudflare 플랫폼 기반 배포 가이드입니다. Cloudflare Workers, R2 Object Storage, KV Store, Pages를 활용한 전체 인프라 구성을 다룹니다.

## ☁️ Cloudflare 아키텍처 계획

### 전체 구성도
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cloudflare    │    │   Cloudflare    │    │   Cloudflare    │
│      Pages      │    │    Workers      │    │   R2 Storage    │
│                 │    │                 │    │                 │
│ • 뉴스캐스트     │◄──►│ • API 서버      │◄──►│ • 오디오 파일    │
│   웹 플레이어    │    │ • 배치 관리     │    │ • JSON 데이터    │
│ • 사용자 UI     │    │ • 메타데이터    │    │ • 백업 스토리지  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Cloudflare    │
                       │    KV Store     │
                       │                 │
                       │ • 배치 ID 관리   │
                       │ • 캐시 데이터    │
                       │ • 설정 정보     │
                       └─────────────────┘
```

## 🔧 1. Cloudflare Workers (API 서버)

### 목적
- 배치 ID 관리 및 최신 뉴스캐스트 메타데이터 제공
- R2 Storage와 KV Store 간 데이터 동기화
- 웹 플레이어용 API 엔드포인트 제공

### 예상 구조
```typescript
// packages/api-server/src/worker.ts (계획)
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/latest':
        return handleLatestBatch(env);
      case '/batch/:id':
        return handleBatchDetails(url.pathname.split('/')[2], env);
      case '/health':
        return new Response('OK', { status: 200 });
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
};

async function handleLatestBatch(env: Env): Promise<Response> {
  // KV에서 최신 배치 ID 조회
  const latestBatchId = await env.NEWSCAST_KV.get('latest-batch-id');
  
  if (!latestBatchId) {
    return new Response('No batches available', { status: 404 });
  }
  
  // R2에서 배치 메타데이터 조회
  const metadata = await env.NEWSCAST_R2.get(`batches/${latestBatchId}/metadata.json`);
  
  return new Response(await metadata?.text(), {
    headers: { 'Content-Type': 'application/json' }
  });
}
```

### 배포 명령어 (계획)
```bash
# Workers 개발 환경
cd packages/api-server
npm run dev

# Workers 배포
npm run deploy

# 환경 변수 설정
wrangler secret put GOOGLE_AI_API_KEY
```

### wrangler.toml 설정 예시
```toml
# packages/api-server/wrangler.toml (계획)
name = "ai-newscast-api"
main = "src/worker.ts"
compatibility_date = "2024-06-01"

[[kv_namespaces]]
binding = "NEWSCAST_KV"
id = "your-kv-namespace-id"

[[r2_buckets]]
binding = "NEWSCAST_R2"
bucket_name = "ai-newscast-storage"

[vars]
ENVIRONMENT = "production"
```

## 🗄️ 2. Cloudflare R2 Object Storage

### 목적
- 생성된 뉴스캐스트 오디오 파일 저장
- 크롤링된 JSON 데이터 백업
- 정적 에셋 호스팅

### 예상 폴더 구조
```
ai-newscast-storage/
├── batches/
│   ├── 2025-06-27T15-52-44-934067/
│   │   ├── metadata.json              # 배치 정보
│   │   ├── topic-list.json            # 토픽 목록
│   │   ├── topics/
│   │   │   ├── topic-01/
│   │   │   │   ├── news-list.json     # 뉴스 리스트
│   │   │   │   ├── news.json          # AI 통합 뉴스
│   │   │   │   ├── newscast-script.json # 뉴스캐스트 스크립트
│   │   │   │   ├── audio/
│   │   │   │   │   ├── 001-김민준.mp3  # 개별 TTS 파일
│   │   │   │   │   └── 002-이서연.mp3
│   │   │   │   └── newscast-final.mp3  # 완성된 뉴스캐스트
│   │   │   └── topic-02/
│   │   └── summary.json               # 전체 배치 요약
│   └── 2025-06-28T12-30-45-123456/
├── templates/                         # 프롬프트 템플릿들
│   ├── news-consolidation.md
│   └── newscast-script.md
└── assets/                           # 정적 에셋들
    ├── intro-music.mp3
    └── outro-music.mp3
```

### CLI 사용법 (계획)
```bash
# R2 버킷 생성
wrangler r2 bucket create ai-newscast-storage

# 파일 업로드
wrangler r2 object put ai-newscast-storage/batches/latest/metadata.json --file ./output/latest/metadata.json

# 파일 다운로드
wrangler r2 object get ai-newscast-storage/batches/latest/metadata.json --file ./downloaded-metadata.json

# 파일 목록 조회
wrangler r2 object list ai-newscast-storage --prefix batches/
```

### 데이터 동기화 스크립트 (계획)
```typescript
// scripts/sync-to-r2.ts (계획)
import { R2Bucket } from '@cloudflare/workers-types';

async function syncBatchToR2(localBatchPath: string, batchId: string) {
  // 로컬 output 폴더를 R2로 동기화
  const files = await glob(`${localBatchPath}/**/*`);
  
  for (const file of files) {
    const key = `batches/${batchId}/${path.relative(localBatchPath, file)}`;
    await uploadToR2(key, await fs.readFile(file));
  }
  
  // KV에 최신 배치 ID 업데이트
  await updateLatestBatchId(batchId);
}
```

## 🔑 3. Cloudflare KV Store

### 목적
- 최신 배치 ID 추적
- 자주 조회되는 메타데이터 캐싱
- 사용자 설정 및 세션 관리

### KV 데이터 구조 (계획)
```javascript
// KV 키-값 구조 예시

// 최신 배치 추적
"latest-batch-id" → "2025-06-27T15-52-44-934067"

// 배치 리스트 캐시 (최근 100개)
"recent-batches" → JSON.stringify([
  {
    "id": "2025-06-27T15-52-44-934067",
    "timestamp": "2025-06-27T15:52:44.934067",
    "topics": 10,
    "status": "completed"
  }
])

// 토픽별 메타데이터 캐시
"batch:2025-06-27T15-52-44-934067:topics" → JSON.stringify([
  { "rank": 1, "title": "이재명", "news_count": 97 }
])

// 시스템 설정
"config:tts-voices" → JSON.stringify([
  { "name": "ko-KR-Wavenet-A", "gender": "FEMALE" },
  { "name": "ko-KR-Wavenet-D", "gender": "MALE" }
])
```

### CLI 사용법 (계획)
```bash
# KV 네임스페이스 생성
wrangler kv:namespace create "NEWSCAST_KV"

# 값 설정
wrangler kv:key put --binding NEWSCAST_KV "latest-batch-id" "2025-06-27T15-52-44-934067"

# 값 조회
wrangler kv:key get --binding NEWSCAST_KV "latest-batch-id"

# 키 목록
wrangler kv:key list --binding NEWSCAST_KV
```

## 🌐 4. Cloudflare Pages (웹 플레이어) ✅ 완성

### 목적
- React 19 기반 뉴스캐스트 플레이어 웹 인터페이스
- 토픽별 인터랙티브 카드 및 스크롤 네비게이션
- 반응형 모바일 친화적 UI (Radix UI + Emotion)

### 실제 구조 (구현 완료)
```
packages/newscast-web/                 # React 19 + Vite 앱
├── src/
│   ├── components/
│   │   ├── NewscastViewer.tsx         # 메인 뉴스캐스트 뷰어
│   │   ├── TopicCard.tsx              # 토픽 카드 컴포넌트
│   │   ├── AudioPlayer.tsx            # 오디오 플레이어 (예정)
│   │   └── App.tsx                    # 루트 앱 컴포넌트
│   ├── hooks/
│   │   ├── useNewscast.ts             # API 데이터 패칭
│   │   ├── useAudioPlayer.ts          # 오디오 재생 상태 관리
│   │   └── useSimpleScrollSpy.ts      # 스크롤 스파이
│   ├── types/
│   │   └── newscast.ts                # TypeScript 타입 정의
│   └── main.tsx                       # 앱 엔트리포인트
├── public/
│   └── output/                        # 뉴스캐스트 데이터 폴더
└── dist/                              # 빌드 출력
```

### 배포 설정 (실제 구현)
```bash
# Pages 프로젝트 생성
wrangler pages project create ai-newscast-web

# 빌드 및 배포
cd packages/newscast-web
pnpm build
wrangler pages publish dist

# 환경 변수 설정
wrangler pages secret put VITE_WORKER_API_URL
wrangler pages secret put VITE_NEWSCAST_STORAGE
```

### vite.config.ts 설정 (구현 완료)
```typescript
// packages/newscast-web/vite.config.ts
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['react', 'react-dom', '@radix-ui/themes']
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'radix-vendor': ['@radix-ui/themes', '@radix-ui/react-collapsible'],
          'emotion-vendor': ['@emotion/react', '@emotion/styled'],
          'tanstack-vendor': ['@tanstack/react-query']
        }
      }
    }
  }
});
```

### 현재 배포 상태
- ✅ **로컬 개발**: `pnpm dev` 완전 동작
- ✅ **빌드 최적화**: 90초+ → 1분 48초로 단축
- ✅ **API 통합**: Cloudflare Workers API 연동 완료
- 🚧 **프로덕션 배포**: Cloudflare Pages 배포 예정

## 🚀 전체 배포 프로세스

### 1. 초기 설정
```bash
# Cloudflare 계정 설정
npm install -g wrangler
wrangler login

# 리소스 생성
wrangler r2 bucket create ai-newscast-storage
wrangler kv:namespace create "NEWSCAST_KV"
wrangler pages project create ai-newscast-player
```

### 2. 개발 환경 구성
```bash
# 환경 변수 파일 생성
cp .env.example .env.production

# 필요한 환경 변수들
GOOGLE_AI_API_KEY=your_google_ai_api_key
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
R2_BUCKET_NAME=ai-newscast-storage
KV_NAMESPACE_ID=your_kv_namespace_id
```

### 3. 배포 스크립트 (계획)
```bash
#!/bin/bash
# scripts/deploy-production.sh (계획)

echo "🚀 Deploying AI Newscast to Cloudflare..."

# 1. 빌드
pnpm build

# 2. Workers 배포
cd packages/api-server
wrangler deploy
cd ../..

# 3. Pages 배포
cd packages/web
npm run build
wrangler pages publish dist
cd ../..

# 4. 최신 데이터 동기화
node scripts/sync-latest-batch.js

echo "✅ Deployment completed!"
```

### 4. 모니터링 및 로그
```bash
# Workers 로그 확인
wrangler tail ai-newscast-api

# R2 사용량 확인
wrangler r2 bucket usage ai-newscast-storage

# KV 사용량 확인
wrangler kv:key list --binding NEWSCAST_KV | wc -l
```

## 🔧 환경별 설정

### 개발 환경 (Development)
```bash
# 로컬 개발 서버
wrangler dev packages/api-server/src/worker.ts

# 로컬 R2 에뮬레이터
wrangler r2 bucket create ai-newscast-dev --local

# 로컬 KV 에뮬레이터
wrangler kv:namespace create "NEWSCAST_KV_DEV" --local
```

### 스테이징 환경 (Staging)
```bash
# 스테이징 전용 리소스
wrangler r2 bucket create ai-newscast-staging
wrangler kv:namespace create "NEWSCAST_KV_STAGING"
```

### 프로덕션 환경 (Production)
```bash
# 프로덕션 리소스 (위에서 설정)
wrangler r2 bucket create ai-newscast-storage
wrangler kv:namespace create "NEWSCAST_KV"
```

## 💰 비용 최적화

### Cloudflare 무료 티어 한도
- **Workers**: 100,000 requests/day
- **R2**: 10GB storage, 1M Class A operations/month
- **KV**: 100,000 reads/day, 1,000 writes/day
- **Pages**: Unlimited bandwidth, 500 builds/month

### 비용 절약 전략
1. **R2 스토리지**: 오래된 배치 자동 삭제 (30일 보관)
2. **KV 최적화**: 자주 조회되는 데이터만 캐싱
3. **Workers**: 불필요한 API 호출 최소화
4. **압축**: 오디오 파일 MP3 최적화

## 🔍 트러블슈팅

### 일반적인 문제들
```bash
# Workers 배포 실패
wrangler whoami  # 로그인 상태 확인
wrangler dev --compatibility-date=2024-06-01

# R2 업로드 실패
wrangler r2 bucket list  # 버킷 존재 확인
wrangler r2 object put --help

# KV 연결 실패
wrangler kv:namespace list
wrangler kv:key list --binding NEWSCAST_KV
```

### 성능 최적화
- **CDN 캐싱**: Cloudflare CDN으로 정적 파일 캐싱
- **압축**: Gzip/Brotli 압축 활성화
- **HTTP/3**: 최신 프로토콜 사용
- **이미지 최적화**: Cloudflare Images 사용 고려

---

**최종 업데이트**: v3.6.0 (2025-07-01) - React 웹 플레이어 배포 정보 완성