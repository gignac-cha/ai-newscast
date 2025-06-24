# 🚀 AI News Cast - 통합 CLI 사용법

AI News Cast 프로젝트의 모든 기능을 **루트 폴더에서** 통합 실행할 수 있는 CLI 명령어 가이드입니다.

## 📋 사전 준비

### 1. 환경 설정 자동화

```bash
# 환경 설정 스크립트 실행 (권장)
pnpm env:setup

# 또는 수동으로 환경변수 로드
source scripts/setup-env.sh  # Linux/macOS
```

### 2. API 키 설정

`tests/claude-code/.env` 파일에 다음 내용을 추가:

```env
GOOGLE_AI_API_KEY=your_google_ai_api_key_here
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json  # 선택사항
```

## 🎯 핵심 명령어

### 환경 관리

| 명령어 | 설명 | 출력 |
|--------|------|------|
| `pnpm env:setup` | 환경 설정 자동화 | 도구 확인 + API 키 검증 |
| `pnpm env:check` | API 키 상태 확인 | SET/NOT SET |
| `pnpm env:load` | 환경변수 수동 로드 | 환경변수 활성화 |

### 개발 도구

| 명령어 | 설명 | Turbo 병렬 처리 |
|--------|------|----------------|
| `pnpm build` | 전체 패키지 빌드 | ✅ 9개 패키지 병렬 |
| `pnpm dev` | 개발 모드 (watch) | ✅ 파일 변경 감지 |
| `pnpm typecheck` | TypeScript 타입 검사 | ✅ 의존성 순서 |
| `pnpm lint` | 코드 품질 검사 | ✅ 병렬 실행 |
| `pnpm clean` | 빌드 캐시 정리 | ❌ 캐시 비활성화 |

### 뉴스 크롤링

| 명령어 | 설명 | 예상 시간 |
|--------|------|-----------|
| `pnpm crawl:topics` | 토픽 목록만 추출 | ~1초 |
| `pnpm crawl:pipeline --max-topics 3` | 3개 토픽 기본 크롤링 | ~5초 |
| `pnpm crawl:pipeline --max-topics 1 --include-details` | 상세 정보 포함 | ~3분 |

### 패키지별 실행

| 명령어 | 설명 | 의존성 | 환경변수 |
|--------|------|--------|----------|
| `pnpm news:process <folder>` | AI 뉴스 통합 | @ai-newscast/core | GOOGLE_AI_API_KEY |
| `pnpm script:generate <folder>` | 스크립트 생성 | @ai-newscast/core | GOOGLE_AI_API_KEY |
| `pnpm audio:generate <script> <output>` | TTS 음성 생성 | @ai-newscast/core | GOOGLE_AI_API_KEY |
| `pnpm audio:merge <folder>` | 오디오 병합 | @ai-newscast/core | - |

## 🎬 실용적인 워크플로우

### 1. 빠른 데모 (기존 데이터 사용)

```bash
# 환경 설정
pnpm env:setup

# 기존 데이터로 AI 통합 테스트
pnpm demo:quick

# 오디오 생성 테스트
pnpm demo:audio
```

### 2. 완전한 파이프라인 (신규 크롤링)

```bash
# 환경 설정 + 테스트 파이프라인
pnpm pipeline:test

# 환경 설정 + 완전한 파이프라인 (상세 크롤링 포함)
pnpm pipeline:full
```

### 3. 단계별 수동 실행

```bash
# 1단계: 뉴스 크롤링
pnpm env:load && pnpm crawl:pipeline --max-topics 1

# 2단계: AI 통합 (최신 출력 폴더 사용)
pnpm news:process ./output/$(ls output/ | tail -1)/topic-01

# 3단계: 스크립트 생성 (패키지 버전 미완성)
pnpm script:generate ./output/$(ls output/ | tail -1)/topic-01

# 4단계: TTS 음성 생성
pnpm audio:generate ./path/to/newscast-script.json ./audio-output --verbose

# 5단계: 오디오 병합
pnpm audio:merge ./audio-output
```

## 🔍 트러블슈팅

### 환경변수 문제

```bash
# 환경변수 상태 확인
pnpm env:check

# 출력: GOOGLE_AI_API_KEY: SET 또는 NOT SET

# 설정되지 않은 경우
pnpm env:setup  # 자동 진단 및 안내
```

### 경로 문제

```bash
# ❌ 잘못된 방법 (하위 디렉토리에서 실행)
cd packages/news-processor
pnpm process ./some/path  # 경로 오류 발생

# ✅ 올바른 방법 (루트에서 실행)
cd /path/to/ai-newscast  # 루트로 이동
pnpm news:process ./some/path  # 절대 경로로 해결
```

### 패키지 빌드 문제

```bash
# 의존성 문제 해결
pnpm install
pnpm build

# 특정 패키지만 재빌드
pnpm --filter @ai-newscast/news-processor build

# 캐시 문제 해결
pnpm clean && pnpm build
```

### Python UV 문제

```bash
# UV 설치 확인
which uv

# 설치되지 않은 경우
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# 가상환경 문제 해결
uv venv packages/news-crawler-py/.venv
```

## 🏗️ Turbo 모노레포 최적화

### 스마트 캐싱

```bash
# 캐시 상태 확인
pnpm turbo run build --dry-run

# 캐시 히트 확인
# ✅ Cached (Local) = true  # 재빌드 불필요
# ❌ Cached (Local) = false # 재빌드 필요
```

### 의존성 그래프

```
@ai-newscast/core (기반)
├── @ai-newscast/news-processor (AI 통합)
├── @ai-newscast/script-generator (스크립트 생성)
├── @ai-newscast/audio-generator (TTS)
├── @ai-newscast/audio-processor (병합)
├── @ai-newscast/news-crawler (크롤링)
└── @ai-newscast/cli (통합 CLI)
```

### 병렬 처리 최적화

- **빌드**: core → 나머지 패키지들 병렬 실행
- **환경변수**: AI 관련 태스크에만 `GOOGLE_AI_API_KEY` 전달
- **캐싱**: 빌드 결과 캐시, AI 처리는 캐시 비활성화

## 📊 성능 벤치마크

| 작업 | 이전 (레거시) | 현재 (통합 CLI) | 개선율 |
|------|---------------|-----------------|--------|
| **환경 설정** | 수동 export | `pnpm env:setup` | 자동화 |
| **빌드** | 개별 패키지 빌드 | `pnpm build` | 병렬 처리 |
| **크롤링** | 하위 폴더 이동 필요 | `pnpm crawl:pipeline` | 경로 통합 |
| **AI 처리** | 상대 경로 오류 빈발 | `pnpm news:process` | 절대 경로 |

## 🎯 권장 워크플로우

### 일상적인 개발

```bash
# 1. 프로젝트 설정 (최초 1회)
pnpm env:setup
pnpm install
pnpm build

# 2. 빠른 테스트
pnpm demo:quick

# 3. 새로운 뉴스로 테스트
pnpm pipeline:test
```

### 프로덕션 배포

```bash
# 1. 환경 검증
pnpm env:setup
pnpm typecheck
pnpm lint

# 2. 전체 빌드
pnpm build

# 3. 완전한 파이프라인 테스트
pnpm pipeline:full
```

---

💡 **팁**: 모든 명령어는 **프로젝트 루트 폴더**에서 실행해야 합니다. 경로 문제가 발생하면 `pwd`로 현재 위치를 확인하고 루트로 이동하세요.