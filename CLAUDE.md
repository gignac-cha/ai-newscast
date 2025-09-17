# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**📋 패키지별 상세 가이드**: 각 패키지 폴더(`packages/*/`)에는 개별 CLAUDE.md 파일이 있을 수 있습니다. 해당 패키지에서 작업할 때는 먼저 패키지별 CLAUDE.md를 읽어 구체적인 가이드라인을 확인하세요.

## 📋 프로젝트 개요
빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하여 AI 기반 뉴스캐스트를 완전 자동화 생성하는 고급 모노레포 프로젝트

**현재 버전**: v3.7.2 (2025-07-03 실시간 자막 시스템 및 소스 링크 완성)  
**상태**: 99% 완성 (5/10 패키지 완전 구현, 7단계 완전 자동화 파이프라인 + TypeScript Cloudflare Workers + React 19 웹 플레이어 + 모듈화 아키텍처 + 성능 최적화 + 실시간 자막 시스템 완성)

## 🏗️ 핵심 아키텍처

### 📦 패키지 구조와 구현 상태 (v3.6.1 웹 플레이어 UI/UX 완성)
```
packages/
├── news-crawler/            # ✅ 완성 - 3단계 크롤링 + 듀얼 언어 (Python + TypeScript)
│   ├── news-topics          # ✅ 완성 - 트렌딩 토픽 추출 (10개 토픽, 중복 제거)
│   ├── news-list            # ✅ 완성 - 토픽별 뉴스 목록 수집 (최대 100개)
│   └── news-details         # ✅ 완성 - 개별 뉴스 상세 정보 추출
├── news-crawler-worker/     # ✅ 완성 - Cloudflare Workers 크롤링 API (큐 기반 배치 처리)
├── news-generator/          # ✅ 완성 - AI 뉴스 통합 + Commander.js CLI (Google Gemini 2.5 Pro)
├── newscast-generator/      # ✅ 완성 - AI 뉴스캐스트 스크립트 + TTS 오디오 + FFmpeg 병합
├── core/                    # ✅ 완성 - 공통 타입, 유틸리티 (TypeScript + Zod)
├── newscast-latest-id/      # ✅ 완성 - Cloudflare Workers API (KV 기반 최신 뉴스캐스트 ID 관리)
├── newscast-web/            # ✅ 완성 - React 웹 플레이어 (TypeScript + Radix UI + TanStack Query)
├── audio-generator/         # 🚧 계획 - TTS 음성 생성 (Google Cloud TTS Chirp HD)
├── audio-processor/         # 🚧 계획 - 오디오 병합/후처리 (FFmpeg 기반)
├── api-server/              # 🚧 계획 - Cloudflare Workers API (확장된 API 기능)
├── cli/                     # 🚧 계획 - 통합 CLI (ai-newscast 바이너리)
└── web/                     # 🚧 계획 - [DEPRECATED: newscast-web로 대체됨]
```

## 🛠️ 개발 환경 및 명령어

### 필수 요구사항
- **Node.js**: 24+ (pnpm@10.14.0 권장)
- **Python**: 3.11+ (UV 패키지 매니저 필수)
- **FFmpeg**: 오디오 처리용
- **API Keys**: Google Gemini 2.5 Pro, Google Cloud TTS

### 환경 설정
```bash
# UV (Python 패키지 매니저) 설치
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# 프로젝트 설치
pnpm install && pnpm build

# 환경변수 설정 (.env 파일)
GOOGLE_GEN_AI_API_KEY=your_gemini_api_key_here
GOOGLE_CLOUD_API_KEY=your_cloud_tts_api_key_here
```

### 주요 개발 명령어

#### 🚀 완전 자동화 파이프라인
```bash
# 전체 7단계 파이프라인 실행 (토픽 → 오디오 완성)
./scripts/run-all.sh

# 특정 단계 스킵
./scripts/run-all.sh --skip newscast-audio --skip newscast

# 병렬 처리 제어
./scripts/run-all.sh --max-concurrency 4
```

#### 📊 단계별 파이프라인 실행
```bash
# Step 1: 뉴스 토픽 추출 (10개 고유 토픽)
pnpm run:crawler:news-topics

# Step 2: 토픽별 뉴스 목록 수집 (최대 100개/토픽)
pnpm run:crawler:news-list

# Step 3: 개별 뉴스 상세 정보 추출
pnpm run:crawler:news-details

# Step 4: AI 뉴스 통합 (Google Gemini 2.5 Pro)
pnpm run:generator:news

# Step 5: 뉴스캐스트 스크립트 생성 (듀얼 호스트 대화형)
pnpm run:generator:newscast-script

# Step 6: TTS 오디오 생성 (Google Cloud TTS Chirp HD)
pnpm run:generator:newscast-audio

# Step 7: 최종 오디오 병합 (FFmpeg)
pnpm run:generator:newscast
```

#### 🏗️ 개발 명령어
```bash
# 모든 패키지 빌드
pnpm build

# 개발 모드 (watch)
pnpm dev

# 특정 패키지만 빌드/개발
pnpm --filter @ai-newscast/core build
pnpm --filter @ai-newscast/newscast-web dev

# TypeScript 타입 체크
pnpm typecheck

# 웹 플레이어 로컬 서버
cd packages/newscast-web && pnpm dev
```

## 🔧 기술 스택 및 패턴

### Python 패키지 (news-crawler)
- **듀얼 언어 지원**: Python (Typer) + TypeScript (Commander.js)
- **상세 정보**: `packages/news-crawler/CLAUDE.md` 참조

### TypeScript 패키지
- **빌드**: Node.js 24+ experimental type stripping
- **CLI 프레임워크**: Commander.js (news-generator, newscast-generator)
- **AI 통합**: Google Gemini 2.5 Pro API
- **TTS**: Google Cloud TTS Chirp HD (8개 한국어 프리미엄 음성)

### React 웹 플레이어 (newscast-web)
- **Framework**: React 19 + Vite + TypeScript
- **UI Components**: Radix UI + Emotion
- **State Management**: TanStack Query + AudioContext
- **특징**: 실시간 자막, 소스 링크, 반응형 오디오 플레이어

### Cloudflare Workers (newscast-latest-id)
- **Runtime**: TypeScript + esbuild
- **Storage**: KV 스토리지 (최신 뉴스캐스트 ID 관리)
- **API**: REST 엔드포인트 (GET /latest, POST /update)

## 📁 출력 데이터 구조
```
output/{ISO_TIMESTAMP}/
├── topic-list.json             # 10개 고유 토픽
├── topic-01/                   # 1순위 토픽
│   ├── news-list.json         # 최대 100개 뉴스
│   ├── news/                  # 개별 뉴스 상세 폴더
│   ├── news.json              # AI 통합 뉴스 (JSON 메타데이터)
│   ├── news.md                # AI 통합 뉴스 (Markdown 문서)
│   ├── newscast-script.json   # AI 뉴스캐스트 스크립트 (TTS API용)
│   ├── newscast-script.md     # AI 뉴스캐스트 스크립트 (Markdown 문서)
│   ├── newscast.mp3           # 최종 병합된 뉴스캐스트 오디오
│   ├── newscast-audio-info.json # 오디오 병합 메타데이터
│   └── audio/                 # TTS 오디오 파일들
│       ├── 001-music.mp3      # 오프닝 음악 (스킵됨)
│       ├── 002-host1.mp3      # 호스트1 음성 파일 
│       ├── 003-host2.mp3      # 호스트2 음성 파일
│       ├── ...                # 대화 순서대로 생성
│       └── audio-files.json   # 오디오 생성 메타데이터
└── topic-{N}/                 # N순위 토픽 (최대 10개)
```

## 🎯 개발 가이드라인

### 코드 작성 규칙
- **크롤링**: `packages/news-crawler/CLAUDE.md` 참조 (Python + TypeScript)
- **TypeScript**: Commander.js CLI, experimental type stripping, Zod 스키마
- **React**: React 19 + ref as prop (forwardRef 제거), React.memo 메모이제이션
- **공통**: Nullish coalescing (`??`) 사용, `||` 금지

### 패키지 간 의존성
- **core**: 모든 패키지가 참조하는 공통 타입 정의
- **workspace protocol**: `"@ai-newscast/core": "workspace:*"`
- **Turbo**: 병렬 빌드 및 태스크 관리

### 환경변수 관리
- **개발**: `.env` 파일 (git에 커밋 금지)
- **프로덕션**: Cloudflare KV 스토리지 기반
- **Turbo**: `globalEnv`, `env` 설정으로 환경변수 전파

### 성능 최적화
- **크롤링**: `packages/news-crawler/CLAUDE.md` 참조 (UV 최적화 등)
- **Node.js**: Turbo 병렬 빌드 + TypeScript experimental stripping
- **React**: React.memo + useCallback + useMemo 전면 적용
- **AI**: GNU Parallel로 동시 처리 (API rate limit 준수)

## 🚨 주의사항

### API Rate Limits
- **Google Gemini**: 3초 지연으로 API 제한 준수
- **Google Cloud TTS**: 개별 요청 간 지연 없음 (로컬 FFmpeg 병합)
- **BigKinds**: 크롤링 세부사항은 `packages/news-crawler/CLAUDE.md` 참조

### 에러 처리
- **크롤링**: `packages/news-crawler/CLAUDE.md` 참조
- **TypeScript**: Commander.js 오류 처리 + 재시도 로직
- **React**: ErrorBoundary + 로딩 상태 관리

### 파일 시스템
- **출력 경로**: 항상 `output/{ISO_TIMESTAMP}` 구조 유지
- **FFmpeg**: @ffmpeg-installer로 크로스 플랫폼 지원
- **WSL**: 파일 감지 개선된 설정 적용

## 🔄 개발 변경 이력

### ✅ v3.7.2 완성된 주요 기능 (2025-07-03)
- **실시간 자막 시스템 완성**: 오디오 재생에 맞춘 스크립트 자막 표시 시스템 구현
- **소스 링크 시스템 완성**: 클릭 가능한 뉴스 소스 링크 구현
- **오디오 상태 동기화 완성**: AudioContext 도입으로 컴포넌트 간 상태 동기화 해결

### Git 커밋 스타일 가이드
**커밋 접두사**:
- `feature:` - 새로운 기능 또는 주요 기능 추가
- `refactor:` - 코드 구조 개선, 재구성
- `fix:` - 버그 수정
- `document:` - 문서 업데이트 (`docs:` 아님)
- `chore:` - 유지보수 작업, 의존성 업데이트

**Claude Code 서명**:
모든 커밋은 다음으로 끝나야 함:
```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---
*최종 업데이트: 2025-07-03 v3.7.2 - 실시간 자막 시스템 및 소스 링크 완성 (시간 기반 스크립트 매칭 + Popover 소스 링크 + 오디오 상태 동기화)*