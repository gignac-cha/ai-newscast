# AI 뉴스캐스트 프로젝트 - Claude Code 컨텍스트

## 📋 프로젝트 개요
빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하여 AI 기반 뉴스캐스트를 완전 자동화 생성하는 고급 모노레포 프로젝트

**현재 버전**: v3.7.1 (2025-07-03 성능 최적화 및 메모이제이션 완성)  
**상태**: 98% 완성 (5/10 패키지 완전 구현, 7단계 완전 자동화 파이프라인 + TypeScript Cloudflare Workers + React 19 웹 플레이어 + 모듈화 아키텍처 + 성능 최적화 완성)

## 🏗️ 핵심 아키텍처

### 📦 패키지 구조와 구현 상태 (v3.6.1 웹 플레이어 UI/UX 완성)
```
packages/
├── news-crawler/            # ✅ 완성 - 3단계 크롤링 + Typer CLI (Python + UV)
│   ├── news-topics          # ✅ 완성 - 트렌딩 토픽 추출 (10개 토픽, 중복 제거)
│   ├── news-list            # ✅ 완성 - 토픽별 뉴스 목록 수집 (최대 100개)
│   └── news-details         # ✅ 완성 - 개별 뉴스 상세 정보 추출
├── news-generator/          # ✅ 완성 - AI 뉴스 통합 + Commander.js CLI (Google Gemini 2.5 Pro)
├── newscast-generator/      # ✅ 완성 - AI 뉴스캐스트 스크립트 + TTS 오디오 + FFmpeg 병합
├── core/                    # 🚧 계획 - 공통 타입, 유틸리티 (TypeScript + Zod)
├── audio-generator/         # 🚧 계획 - TTS 음성 생성 (Google Cloud TTS Chirp HD)
├── audio-processor/         # 🚧 계획 - 오디오 병합/후처리 (FFmpeg 기반)
├── newscast-latest-id/      # ✅ 완성 - Cloudflare Workers API (KV 기반 최신 뉴스캐스트 ID 관리)
├── newscast-web/            # ✅ 완성 - React 웹 플레이어 (TypeScript + Radix UI + TanStack Query)
├── api-server/              # 🚧 계획 - Cloudflare Workers API (확장된 API 기능)
├── cli/                     # 🚧 계획 - 통합 CLI (ai-newscast 바이너리)
└── web/                     # 🚧 계획 - [DEPRECATED: newscast-web로 대체됨]
```

## 🔄 개발 변경 이력

### ✅ v3.7.1 완성된 주요 기능 (2025-07-03)
- **성능 최적화 완성**: React 메모이제이션 및 리렌더링 최적화로 웹 플레이어 성능 대폭 향상
  - **React.memo 전면 적용**: 모든 컴포넌트에 메모이제이션 적용 (15개 컴포넌트)
  - **useCallback 최적화**: 함수 참조 안정화로 불필요한 리렌더링 방지
  - **useMemo 최적화**: 계산 비용이 높은 값들 메모이제이션 (topicIds, toggleHandlers 등)
  - **hooks 의존성 배열 최적화**: useAudioController, useSimpleScrollSpy 효율성 개선
  - **TypeScript 완전 검증**: 타입 안전성 확보 및 빌드 성공 (33.97초)
- **번들 크기 최적화**: 벤더 청크 분리로 초기 로딩 성능 향상
  - react-vendor (11.83 kB), radix-vendor (85.64 kB), main (195.55 kB)
- **코드 품질 향상**: 안정된 이벤트 핸들러 및 함수 참조로 메모리 효율성 개선

### ✅ v3.7.0 완성된 주요 기능 (2025-07-03)
- **컴포넌트 리팩토링 완성**: 대형 컴포넌트들을 작은 모듈로 분해 및 유지보수성 향상
  - AudioPlayer (354줄) → 5개 하위 컴포넌트로 분리
  - TopicCard (346줄) → 4개 하위 컴포넌트로 분리
  - NewscastViewer → 헤더/바텀플레이어 컴포넌트 분리
- **React 19 완전 적용**: forwardRef 제거하고 ref as prop 방식으로 현대화
- **스타일 아키텍처 개선**: 중앙화된 styles.ts 제거, 각 컴포넌트별 스타일 관리
- **코드 품질 향상**: 전체 프로젝트에서 `||` → `??` (nullish coalescing) 완전 전환
- **빌드 최적화**: Vite 설정 경량화 및 불필요한 옵션 제거
- **환경변수 현대화**: Cloudflare Pages secrets → KV 스토리지 기반 빌드 시스템
- **UI/UX 완성도 향상**:
  - 토픽 카드 3행 구조 복원 (번호+제목, 요약, 소스)
  - 스무스한 뉴스 본문 접기/펼치기 애니메이션
  - 소스 목록 접기/펼치기 기능 추가
  - 하단 바 제목 스크롤링 효과 복원
  - 재생 버튼 덜거덕거림 현상 해결

### ✅ v3.6.1 완성된 주요 기능 (2025-01-02)
- **웹 플레이어 UI/UX 완성**: 완전한 사용자 경험을 위한 모든 인터페이스 요소 구현
- **고급 오디오 플레이어**: 재생/일시정지, 진행 바, 시간 표시, 하단 바 고정 플레이어
- **반응형 카드 시스템**: 접기/펼치기 애니메이션, 호버 효과, 클릭 영역 최적화
- **Markdown 콘텐츠 렌더링**: react-markdown으로 뉴스 내용 완전 렌더링
- **동적 텍스트 애니메이션**: 재생 중 제목 marquee 효과, 일시정지 시 말줄임표 처리
- **세밀한 상호작용**: 펼친/접힌 상태별 차별화된 클릭 영역 및 호버 효과
- **데이터 표시 최적화**: 소스 개수 뱃지, 가로 소스 목록, 날짜 포맷팅 (dayjs)
- **성능 최적화**: 토픽 변경 시 오디오 정리, 파일 감지 개선 (WSL 환경)
- **접근성 향상**: 키보드 네비게이션, 스크린 리더 지원, 적절한 ARIA 속성

### ✅ v3.6.0 완성된 주요 기능 (2025-07-01)
- **React 웹 플레이어 완성**: TypeScript 기반 newscast-web 패키지 완전 구현
- **무한 렌더링 문제 해결**: useEffect 의존성 배열 최적화 및 React.memo 적용
- **API 통합 완성**: Cloudflare Workers API 연동 및 실제 파일 구조 매칭
- **TypeScript 타입 시스템**: 실제 데이터 구조에 맞는 완전한 타입 정의
- **모던 React 아키텍처**: React 19 + Vite + TanStack Query + Radix UI + Emotion
- **성능 최적화**: 빌드 시간 단축 (90초+ → 1분 48초) 및 의존성 사전 번들링
- **스크롤 스파이**: 뷰포트 기반 활성 토픽 자동 감지
- **반응형 디자인**: 모바일/데스크톱 대응 완료
- **에러 처리**: API 연결 실패 및 데이터 누락 상황 완전 대응
- **개발자 경험**: TypeScript strict 모드 + ESLint + 실시간 HMR

### ✅ v3.5.1 완성된 주요 기능 (2025-06-29)
- **Cloudflare Workers API 완성**: TypeScript 기반 newscast-latest-id 패키지 완전 구현
- **KV 기반 ID 관리**: 최신 뉴스캐스트 ID 저장/조회 API 완성
- **TypeScript 완전 전환**: JavaScript → TypeScript with esbuild 컴파일
- **REST API 엔드포인트**: GET /latest, POST /update, GET / (worker info) 완성
- **타입 안전성 확보**: Cloudflare Workers 타입 정의 및 인터페이스 완성
- **CORS 지원**: 크로스 오리진 요청 완전 지원
- **Input 검증**: ISO timestamp 형식 검증 및 에러 처리
- **히스토리 관리**: KV에 업데이트 히스토리 자동 저장
- **프로덕션 배포**: https://your-worker-name.your-account.workers.dev/ 정상 동작

### ✅ v3.5.0 완성된 주요 기능 (2025-06-29)
- **7단계 AI 파이프라인 완성**: topics → lists → details → news → newscast-script → newscast-audio → **newscast** 완전 자동화
- **Google Cloud TTS 완전 통합**: 실제 MP3 오디오 파일 생성 (193개 파일 성공적 생성 확인)
- **모듈화 아키텍처 완성**: `types.ts`, `utils.ts` 공통 모듈로 코드 중복 제거 및 유지보수성 향상
- **완전한 오디오 파이프라인**: 스크립트 → TTS → MP3 파일 자동 생성 (host1/host2 구분)
- **파일명 표준화**: `{sequence}-{host1|host2}.mp3` 규칙으로 일관된 네이밍
- **음성 품질 확보**: Google Cloud TTS Chirp HD로 자연스러운 한국어 음성 생성
- **환경변수 분리**: `GOOGLE_GEN_AI_API_KEY` (Gemini) / `GOOGLE_CLOUD_API_KEY` (TTS) 구분 관리
- **Step 6 병렬 처리**: 10개 토픽 동시 오디오 생성으로 시간 단축 (3초 지연으로 API 제한 준수)
- **오디오 메타데이터**: audio-files.json으로 생성 통계 및 파일 정보 관리
- **FFmpeg 오디오 병합**: @ffmpeg-installer/ffmpeg으로 개별 MP3를 `newscast.mp3`로 병합
- **완전한 Skip 명령어**: `--skip newscast-audio`, `--skip newscast`로 단계별 건너뛰기 지원
- **병렬 오디오 병합**: GNU Parallel로 로컬 FFmpeg 작업 동시 처리 (지연 없음)
- **프로그램명 변경**: "오늘의 뉴스 브리핑" → "AI 뉴스캐스트"로 자연스러운 클로징
- **메타 표현 제거**: TTS 부자연스러운 발음 표기 및 제작 과정 언급 제거

### ✅ v3.3.0 완성된 주요 기능 (2025-06-29)
- **5단계 AI 파이프라인 완성**: topics → lists → details → news → **newscast-script** 완전 자동화
- **코드 모듈화 완성**: news-crawler.py 419줄 → 118줄 (70% 감소) + 4개 기능별 모듈 분리
- **뉴스캐스트 스크립트 생성**: Google Gemini 2.5 Pro로 두 명의 진행자 대화 형식 스크립트 자동 생성
- **랜덤 TTS 호스트 선택**: 남녀 페어 조합을 매번 랜덤 선택으로 다양성 확보 (8명 아나운서 풀)
- **Google Cloud TTS 연동**: Chirp HD Premium 모델 8개 음성 with 한국인 아나운서 캐릭터
- **Markdown 기반 프롬프트**: 구조화된 .md 파일로 프롬프트 관리 및 가독성 향상
- **듀얼 출력 시스템**: newscast-script.json (TTS API용) + newscast-script.md (인간 친화적)
- **Commander.js CLI**: script/audio/newscast 서브명령어로 확장 가능한 구조
- **병렬 처리 확장**: Step 2 (news-list) + Step 5 (newscast-script) 병렬 처리 지원
- **통합 Skip 명령어**: `--skip news-topics|news-list|news-details|news|newscast-script` 일관성

### ✅ v3.2.5 완성된 주요 기능 (2025-06-28)
- **Commander.js CLI 통합**: TypeScript news-generator에 현대적 CLI 프레임워크 적용
- **단축 옵션 지원**: `-i`, `-o`, `-f`, `-l` 단축 명령어로 개발자 편의성 대폭 향상
- **자동 Help 생성**: `--help`, `-h`로 아름다운 사용법 안내 자동 생성 (Python Typer와 동일)
- **CLI 일관성 확보**: Python Typer ↔ TypeScript Commander.js 동일한 개발자 경험 제공
- **타입 안전성**: Commander.js TypeScript 완전 지원으로 개발 시 타입 검증
- **Nullish Coalescing**: `??` 연산자로 더 정확한 undefined/null 처리

### ✅ v3.2.4 완성된 주요 기능 (2025-06-28)
- **GNU Parallel 통합**: 병렬 뉴스 생성으로 처리 시간 대폭 단축 (최대 CPU 코어 수만큼 동시 처리)
- **자동 동시성 감지**: `--max-concurrency -1`으로 CPU 코어 수 자동 감지 및 최적화
- **환경 변수 전파**: GNU Parallel에서 GOOGLE_GEN_AI_API_KEY 자동 전달
- **Dry-run 모드**: `--dry-run` 옵션으로 API 비용 없이 파이프라인 테스트
- **진행률 모니터링**: 실시간 병렬 작업 진행 상황 표시
- **성능 향상**: 10개 토픽 순차 처리 450초 → 병렬 처리 120초 (75% 시간 단축)

### ✅ v3.2.1 완성된 주요 기능 (2025-06-28)
- **Typer CLI 프레임워크**: argparse → Typer 완전 마이그레이션으로 현대적 CLI 경험
- **타입 안전한 인터페이스**: 타입 힌트 기반 자동 검증 및 Rich 기반 아름다운 help 출력
- **개발자 경험 향상**: 컬러풀한 명령어 도움말, 자동완성 지원, Enum 기반 타입 안전 선택지
- **100% 호환성 유지**: 기존 파이프라인 (`pnpm run:crawler:*`) 완전 동일하게 작동
- **코드 품질 개선**: 100줄 복잡한 argparse → 간결한 데코레이터 기반 구조

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
- **파이프라인 시스템**: 기본 토픽 추출 → **7단계 AI 파이프라인** (topics → lists → details → news → newscast-script → newscast-audio → **newscast**)
- **AI 통합**: 크롤링 전용 → Google Gemini API로 지능형 뉴스 통합 + 뉴스캐스트 스크립트 생성 + TTS + 오디오 병합
- **코드 구조**: 모놀리식 파일 → 모듈화된 아키텍처 (news-crawler 70% 코드 감소)
- **데이터 품질**: 중복 토픽 문제 해결 (30개 → 10개 고유 토픽 자동 필터링)
- **출력 시스템**: 텍스트 로그 → JSON 메타데이터 + Markdown 문서 + jq 파싱 + Turbo 출력 분리
- **개발자 경험**: 개별 실행 → 병렬 처리 + 스킵/재개 기능이 있는 `scripts/run-all.sh` 통합 파이프라인

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
├── run-all.sh              # 🚀 전체 5단계 AI 파이프라인 실행 (스킵/재개 기능)
├── setup-env.sh            # 환경 설정 자동화
└── sync-to-r2.sh           # Cloudflare R2 동기화 (계획)

# 출력 데이터 구조  
output/
└── {ISO_TIMESTAMP}/        # 2025-06-29T01-43-09-804026
    ├── topic-list.json     # 10개 고유 토픽
    ├── topic-01/           # 1순위 토픽
    │   ├── news-list.json  # 최대 100개 뉴스
    │   ├── news/           # 개별 뉴스 상세 폴더
    │   ├── news.json       # AI 통합 뉴스 (JSON 메타데이터)
    │   ├── news.md         # AI 통합 뉴스 (Markdown 문서)
    │   ├── newscast-script.json # AI 뉴스캐스트 스크립트 (TTS API용)
    │   ├── newscast-script.md   # AI 뉴스캐스트 스크립트 (Markdown 문서)
    │   ├── newscast.mp3    # 🆕 최종 병합된 뉴스캐스트 오디오
    │   ├── newscast-audio-info.json # 🆕 오디오 병합 메타데이터
    │   └── audio/          # 🆕 TTS 오디오 파일들
    │       ├── 001-music.mp3    # 🆕 오프닝 음악 (스킵됨)
    │       ├── 002-host1.mp3    # 🆕 호스트1 음성 파일 
    │       ├── 003-host2.mp3    # 🆕 호스트2 음성 파일
    │       ├── 004-host1.mp3    # 🆕 호스트1 음성 파일
    │       ├── ...              # 🆕 대화 순서대로 생성
    │       ├── 019-host2.mp3    # 🆕 마지막 대사
    │       └── audio-files.json # 🆕 오디오 생성 메타데이터
    └── topic-{N}/          # N순위 토픽 (최대 10개, 각각 오디오 폴더 포함)
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

### 📝 Git 커밋 스타일 가이드
프로젝트의 일관된 커밋 메시지를 위한 규칙:

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
*최종 업데이트: 2025-07-03 v3.7.1 - 성능 최적화 및 메모이제이션 완성 (React.memo + useCallback + useMemo 전면 적용)*