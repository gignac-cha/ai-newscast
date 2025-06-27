# AI 뉴스캐스트 프로젝트 - Claude Code 컨텍스트

## 📋 프로젝트 개요
빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하여 AI 기반 뉴스캐스트를 완전 자동화 생성하는 고급 모노레포 프로젝트

**현재 버전**: v3.2.0 (2025-06-27 AI 뉴스 생성기 완성)  
**상태**: 40% 완성 (2/10 패키지 완전 구현, 4단계 AI 뉴스 파이프라인 작동)

## 🏗️ 핵심 아키텍처

### 📦 패키지 구조와 구현 상태 (v3.2.0 AI 뉴스 생성기 완성)
```
packages/
├── news-crawler/            # ✅ 완성 - 3단계 크롤링 파이프라인 (Python + UV)
│   ├── news-topics          # ✅ 완성 - 트렌딩 토픽 추출 (10개 토픽, 중복 제거)
│   ├── news-list            # ✅ 완성 - 토픽별 뉴스 목록 수집 (최대 100개)
│   └── news-details         # ✅ 완성 - 개별 뉴스 상세 정보 추출
├── news-generator/          # ✅ 완성 - AI 뉴스 통합 (Google Gemini 1.5 Flash, 프롬프트 템플릿)
├── core/                    # 🚧 계획 - 공통 타입, 유틸리티 (TypeScript + Zod)
├── script-generator/        # 🚧 계획 - 뉴스캐스트 스크립트 생성 (TTS 호환)
├── audio-generator/         # 🚧 계획 - TTS 음성 생성 (Google Cloud TTS Chirp HD)
├── audio-processor/         # 🚧 계획 - 오디오 병합/후처리 (FFmpeg 기반)
├── api-server/              # 🚧 계획 - Cloudflare Workers API (KV 기반 배치 ID 관리)
├── cli/                     # 🚧 계획 - 통합 CLI (ai-newscast 바이너리)
├── newscast-generator/      # 🚧 계획 - 스크립트/오디오/병합 통합 제너레이터
└── web/                     # 🚧 계획 - 뉴스캐스트 플레이어 웹 인터페이스
```

## 🔄 개발 변경 이력

### ✅ v3.2.0 완성된 주요 기능 (2025-06-27)
- **4단계 AI 뉴스 파이프라인**: news-topics → news-list → news-details → **news-generation** 완전 자동화
- **Google Gemini AI 통합**: 다중 뉴스 기사를 하나의 통합된 뉴스로 자동 생성
- **듀얼 출력 포맷**: JSON 메타데이터 + 인간 친화적 TXT 포맷
- **파일 기반 프롬프트 관리**: prompts/news-consolidation.txt로 AI 프롬프트 템플릿 분리
- **스킵 기능**: --skip-topics, --skip-lists, --skip-details, --skip-generation으로 단계별 건너뛰기
- **재개 기능**: --output-dir로 기존 출력 디렉터리에서 작업 재개
- **환경변수 관리**: .env 파일 자동 로딩 및 Turbo 환경변수 전파

### ✅ v3.1.0 완성된 크롤링 기능 (2025-06-27)
- **3단계 크롤링 파이프라인**: news-topics → news-list → news-details 완전 자동화
- **토픽 중복 제거**: BigKinds 3개 UI 섹션에서 동일 토픽 감지 및 정리 (30개 → 10개)
- **JSON 로그 시스템**: --print-log-format json과 --print-log-file로 깔끔한 메타데이터 추출
- **jq 파싱 통합**: 임시 파일 기반 JSON 파싱으로 Turbo 출력 분리
- **전체 토픽 처리**: 모든 토픽(10개)의 뉴스 리스트와 상세 정보 수집
- **실시간 진행 표시**: 단계별 성공/실패 상태 및 통계 정보 표시

### 🔧 기술적 진화 과정
- **모노레포 아키텍처**: 단일 스크립트 → Turbo + pnpm workspace 기반 10개 패키지 구조
- **파이프라인 시스템**: 기본 토픽 추출 → 4단계 AI 파이프라인 (topics → lists → details → **generation**)
- **AI 통합**: 크롤링 전용 → Google Gemini API로 지능형 뉴스 통합 
- **데이터 품질**: 중복 토픽 문제 해결 (30개 → 10개 고유 토픽 자동 필터링)
- **출력 시스템**: 텍스트 로그 → JSON 메타데이터 + jq 파싱 + Turbo 출력 분리
- **개발자 경험**: 개별 실행 → 스킵/재개 기능이 있는 `scripts/run-all.sh` 통합 파이프라인

## 🛠️ 개발 환경 및 도구

### 📦 패키지 관리자 및 런타임
- **Python**: UV 패키지 매니저 (10-100배 빠른 의존성 설치)
  - `.venv` 가상환경 자동 생성 및 관리
  - `uv pip install -r requirements.txt` 고속 설치
- **Node.js**: pnpm@10.12.2 + Turbo 모노레포
  - workspace 기반 패키지 간 의존성 관리
  - 병렬 빌드 및 캐시 최적화

### 🔧 명령행 도구
- **JSON 파싱**: `jq` (Turbo 출력에서 깔끔한 JSON 추출)
- **파일 검색**: `ripgrep` (grep 대신, 더 빠른 코드 검색)
- **파일 탐색**: `find` 보다는 `fd` 권장
- **HTTP 테스트**: `curl` (BigKinds API 연결 확인용)

### 📁 파일 시스템 구조
```bash
# 실행 가능한 스크립트들
scripts/
├── run-all.sh              # 🚀 전체 4단계 AI 파이프라인 실행 (스킵/재개 기능)
├── setup-env.sh            # 환경 설정 자동화
└── sync-to-r2.sh           # Cloudflare R2 동기화 (계획)

# 출력 데이터 구조  
output/
└── {ISO_TIMESTAMP}/        # 2025-06-27T15-52-44-934067
    ├── topic-list.json     # 10개 고유 토픽
    ├── topic-01/           # 1순위 토픽
    │   ├── news-list.json  # 최대 100개 뉴스
    │   ├── news/           # 개별 뉴스 상세 폴더
    │   ├── news.json       # 🆕 AI 통합 뉴스 (JSON 메타데이터)
    │   └── news.txt        # 🆕 AI 통합 뉴스 (인간 친화적 텍스트)
    └── topic-{N}/          # N순위 토픽 (최대 10개)
```

### ⚡ 성능 최적화 설정
- **Python**: `PYTHONOPTIMIZE=1` 환경변수로 바이트코드 최적화
- **Node.js**: Turbo 병렬 빌드로 5-10배 속도 향상 + TypeScript 실험적 타입 제거
- **AI**: Google Gemini 1.5 Flash 모델로 빠른 응답 시간 (평균 2-5초)
- **JSON**: `jq` 스트리밍 파싱으로 대용량 데이터 처리
- **네트워크**: BigKinds API 요청 간격 1초로 서버 부하 최소화

## 📚 문서 및 컨텍스트 관리

### 📋 핵심 문서 구조
```bash
# 프로젝트 루트 문서들
├── README.md              # 사용자 가이드 및 프로젝트 소개
├── CLAUDE.md              # Claude Code 컨텍스트 (이 파일)
├── API.md                 # BigKinds + Google API 사용법
├── DEPLOYMENT.md          # Cloudflare 배포 가이드
├── TROUBLESHOOTING.md     # 문제 해결 가이드
├── CHANGELOG.md           # 버전별 변경 이력
├── MIGRATION.md           # 프로젝트 진화 과정
└── COMMIT_STYLE.md        # Git 커밋 규칙

# 개발 문서들
docs/
├── PROJECT_CONTEXT_GUIDE.md    # 신규 개발자 온보딩
└── CLI_USAGE.md                # 명령어 상세 사용법
```

### 🎯 Claude Code 특화 설정
- **컨텍스트 파일**: `CLAUDE.md` (현재 파일) - 프로젝트 상태 및 개발 가이드
- **무시 파일**: `.claudeignore` - 불필요한 파일 제외 (node_modules, output 등)
- **메모리 기능**: 개발 진행 상황 및 중요 결정사항 자동 기록
- **도구 우선순위**: Task > Grep/Glob > Read (효율적 검색 패턴)

---
*최종 업데이트: 2025-06-27 v3.2.0 - AI 뉴스 생성기 완성*