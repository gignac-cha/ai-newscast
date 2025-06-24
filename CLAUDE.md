# AI 뉴스캐스트 프로젝트 - Claude Code 컨텍스트

## 📋 프로젝트 개요
빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하여 AI 기반 뉴스캐스트를 완전 자동화 생성하는 고급 모노레포 프로젝트

**현재 버전**: v2.1.3 (2025-06-24 Turbo 모노레포 최적화 및 Google API 패키지 정리)  
**상태**: 85% 완성 (9/10 패키지 완전 구현, Turbo 중앙집중식 관리 완료)

## 🏗️ 핵심 아키텍처

### 📦 패키지 구조와 구현 상태
```
packages/
├── core/                    # ✅ 완성 - 공통 타입, 유틸리티 (TypeScript + Zod)
├── news-crawler-py/         # ✅ 완성 - 메인 프로덕션 크롤러 (Python + UV + Pydantic)
├── news-crawler/            # ✅ 완성 - 대안 크롤러 (TypeScript + Playwright, Strategy 패턴)
├── news-processor/          # ✅ 완성 - AI 뉴스 통합 (Pipeline 패턴, 프롬프트 템플릿 시스템)
├── script-generator/        # ✅ 완성 - 뉴스캐스트 스크립트 생성 (TTS 호환, 일관된 프롬프트 관리)
├── api-server/              # ✅ 완성 - Cloudflare Workers API (KV 기반 배치 ID 관리)
├── audio-generator/         # ✅ 완성 - TTS 음성 생성 (Google Cloud TTS Chirp HD)
├── audio-processor/         # ✅ 완성 - 오디오 병합/후처리 (FFmpeg 기반)
├── cli/                     # ✅ 완성 - 통합 CLI (ai-newscast 바이너리)
└── web/                     # ✅ 완성 - 뉴스캐스트 플레이어 웹 인터페이스
```

### 🔄 레거시→패키지 마이그레이션 맵
```
tests/claude-code/ (레거시)           →  packages/ (신규)
├── consolidate-news.ts               →  ✅ news-processor/ (완료, 프롬프트 템플릿화)
├── generate-newscast-script.ts       →  ✅ script-generator/ (완료, 일관된 프롬프트 시스템)
├── generate-newscast-audio.ts        →  ✅ audio-generator/ (완료, Google TTS Chirp HD)
├── merge-newscast-audio.ts           →  ✅ audio-processor/ (완료, FFmpeg 병합)
├── run-parallel-pipeline.sh          →  ✅ cli/ (완료, ai-newscast 바이너리)
└── tts-voices.json                   →  🚧 core/config/ (8개 Chirp HD 음성 모델)
```

### 🛠️ 기술 스택
- **Python**: UV (10-100배 빠른 패키지 관리) + Pydantic + requests + Click
- **TypeScript**: Node.js 24+ + ESBuild + Zod + pnpm@10.12.2 workspace  
- **Build System**: Turbo 모노레포 + ESBuild (거의 즉시 컴파일)
- **AI Models**: Google Gemini 2.5 Pro Preview + 2.0 Flash Experimental
- **TTS**: Google Cloud TTS Chirp HD (8개 프리미엄 모델, 랜덤 성별 균형)
- **Audio**: FFmpeg 병합 + MP3 24kHz
- **Type Safety**: Pydantic (Python) + Zod (TypeScript) 런타임 검증

## 🚀 핵심 명령어 (루트 폴더 통합 실행)

### ⚡ 빠른 시작 (권장)
```bash
# 1. 환경 자동 설정 (도구 확인 + API 키 검증)
pnpm env:setup

# 2. 프로젝트 의존성 설치 (Turbo 병렬 빌드)
pnpm install && pnpm build

# 3. 뉴스 크롤링 (Python UV 기반)
pnpm crawl:pipeline --max-topics 3

# 4. 빠른 데모 (기존 데이터 사용)
pnpm demo:quick
```

### 📦 환경 설정 (최초 1회)
```bash
# 필수 도구 설치 (Node.js 24+ 필수)
node --version  # v24.0.0+ 확인
npm install -g pnpm@10.12.2
curl -LsSf https://astral.sh/uv/install.sh | sh  # UV 설치
export PATH="$HOME/.local/bin:$PATH"             # UV PATH 추가

# API 키 설정: tests/claude-code/.env 파일 생성
echo "GOOGLE_AI_API_KEY=your_api_key" > tests/claude-code/.env
```

### 🕷️ 크롤링 (Turbo 기반 통합 관리)
```bash
# 👑 권장: 전체 파이프라인 (Turbo + Python UV)
pnpm crawl:pipeline --max-topics 5               # 상위 5개 토픽 처리
pnpm crawl:pipeline --include-details             # 뉴스 상세 정보 포함

# 단계별 실행 (Turbo --filter 최적화)
pnpm crawl:topics                                 # 토픽 목록만 추출
pnpm crawl:news -- ./output/latest --topics 1,2,3   # 특정 토픽 뉴스만

# AI 처리 파이프라인 (Google Gemini)
pnpm news:process -- ./output/latest/topic-01    # 뉴스 통합 정리
pnpm script:generate -- ./output/latest/topic-01 # 스크립트 생성
```

### 🏗️ 개발 명령어 (Turbo 통합)
```bash
# 전체 빌드 (Turbo 병렬 최적화)
pnpm build                                        # 10개 패키지 병렬 빌드

# 개발 모드 (watch)
pnpm dev                                          # 파일 변경 감지

# 타입 체크 및 린트 (모든 패키지)
pnpm typecheck                                    # TypeScript 타입 체크
pnpm lint                                         # ESLint 실행

# Google API 패키지 개별 실행
pnpm news:process -- ./data/folder               # 뉴스 처리 (Gemini)
pnpm script:generate -- ./data/folder            # 스크립트 생성 (Gemini)
pnpm audio:generate -- ./script.json ./output    # TTS 생성 (Google Cloud)
```

### 🧪 레거시 스크립트 실행 (마이그레이션 전)
```bash
# tests/claude-code/ 디렉토리에서
cd tests/claude-code

# 뉴스캐스트 스크립트 생성 (450줄, Google Gemini 2.5 Pro)
node --experimental-transform-types generate-newscast-script.ts bigkinds/folder 1

# TTS 음성 생성 (Google Cloud TTS Chirp HD)  
node --experimental-transform-types generate-newscast-audio.ts bigkinds/folder/topic-01

# 오디오 병합 (FFmpeg)
node --experimental-transform-types merge-newscast-audio.ts bigkinds/folder/topic-01

# 완전 자동화 병렬 파이프라인 (10개 토픽, 4배 속도 향상)
./run-parallel-pipeline.sh
```

## 📊 데이터 플로우

### 🔄 7단계 완전 파이프라인
1. **토픽 추출** ✅ - bigkinds.or.kr 메인페이지 → 10개 트렌딩 주제 (XPath 파싱)
2. **뉴스 목록** ✅ - POST `/news/getNetworkDataAnalysis.do` → 주제별 뉴스 목록 (최대 100개)  
3. **뉴스 상세** ✅ - GET `/news/detailView.do` → 개별 뉴스 상세 정보 (병렬 처리)
4. **AI 통합** ✅ - Google Gemini 2.0 Flash → 뉴스 통합 정리 (중복 제거, 품질 평가)
5. **스크립트 생성** ✅ - Google Gemini 1.5 Pro → 대화형 뉴스캐스트 스크립트 (TTS 호환성 개선)
6. **TTS 생성** 🚧 - Google Cloud TTS Chirp HD → 고품질 음성 생성 (8개 모델, 성별 균형)
7. **오디오 병합** 🚧 - FFmpeg → 완성된 뉴스캐스트 MP3 (무음 구간 처리)

### 📁 출력 구조 (타임스탬프 기반)
```
output/2025-06-22T01-10-35-307016/              # ISO 타임스탬프 폴더
├── topic-list.json                             # 주제 목록 (순위, 키워드, 뉴스 수)
├── topic-01/                                   # 1순위 주제 폴더
│   ├── news-list.json                          # 뉴스 목록 (제목, 언론사, 기자, 카테고리)
│   ├── news/                                   # 개별 뉴스 상세 폴더
│   │   ├── 01100101-20250620110824001.json     # 뉴스 ID별 상세 정보
│   │   └── ...                                 # 기타 뉴스 파일들
│   ├── news.json                               # ✅ AI 통합 결과 (Gemini 2.0)
│   ├── news.txt                                # ✅ 읽기용 텍스트
│   ├── newscast-script.json                   # ✅ 뉴스캐스트 스크립트 (구조화)
│   ├── newscast-script.txt                    # ✅ 읽기용 스크립트
│   ├── audio/                                  # 🚧 TTS 생성 음성 파일들
│   │   ├── 001-김민준.mp3                       # 개별 대사 라인별 음성
│   │   ├── 002-이서연.mp3                       # 화자별 TTS 파일
│   │   └── audio-files.json                   # 오디오 메타데이터
│   ├── newscast-20250622_120000.mp3            # 🚧 완성된 뉴스캐스트 오디오
│   └── newscast-audio-info.json               # 🚧 최종 오디오 정보
├── topic-02/                                   # 2순위 주제 (동일 구조)
└── topic-{N}/                                  # N순위 주제 (최대 10개)
```

## 🔧 v2.1.3 Turbo 모노레포 최적화 성과

### ✅ Turbo 통합 관리 시스템 구축
- **루트 중앙집중식 제어**: 모든 패키지를 turbo --filter로 정확 타겟팅
- **불필요한 직접 호출 제거**: `pnpm --filter` → `turbo --filter` 통일
- **캐싱 최적화**: 정확한 패키지만 실행하여 성능 향상
- **의존성 그래프 최적화**: 빌드 순서 자동 관리 및 병렬 처리

### 🎯 Google API 패키지 체계화
```typescript
// Google Gemini AI (GOOGLE_AI_API_KEY)
- @ai-newscast/news-processor    // 뉴스 통합/정리 (Gemini 2.0 Flash)
- @ai-newscast/script-generator  // 스크립트 생성 (Gemini 1.5 Pro)

// Google Cloud TTS (GOOGLE_APPLICATION_CREDENTIALS)  
- @ai-newscast/audio-generator   // 텍스트→음성 (Chirp HD 8개 모델)
```

### 🚀 성능 향상 지표
- **빌드 속도**: 10개 패키지 동시 병렬 처리 (9.5초)
- **캐시 효율성**: 변경되지 않은 패키지 자동 스킵
- **타겟팅 정확도**: 100% (불필요한 `<NONEXISTENT>` 태스크 제거)
- **개발자 경험**: 일관된 `pnpm command` 인터페이스 유지

## 🔧 v2.1.1 리팩토링 성과

### ✅ 완료된 패키지 (고급 아키텍처 적용)
- **news-processor**: 233줄→76줄 (67% 감소) + Pipeline 패턴 + 외부 프롬프트 템플릿 시스템
- **news-crawler**: 249줄→76줄 (70% 감소) + Strategy 패턴 + 4가지 크롤링 전략  
- **script-generator**: TTS 호환성 개선 + 일관된 프롬프트 관리 + CLI 실행 최적화
- **프롬프트 시스템 통합**: 두 패키지 간 완전한 일관성 확보 + 템플릿 변수 치환
- **TypeScript ES 모듈**: 99개 import 문 `.ts` 확장자 완벽 처리
- **Python 크롤러**: UV + Pydantic + Click CLI (10-100배 빠른 설치)

### 🎯 적용된 고급 디자인 패턴
- **Pipeline Pattern** (`news-processor`, `script-generator`): ValidationStep → LoadingStep → ConsolidationStep → SavingStep
- **Strategy Pattern** (`news-crawler`): TopicCrawl, NewsListCrawl, NewsDetailCrawl, PipelineCrawl 전략
- **Template Method Pattern** (`script-generator`): PromptLoader 템플릿 변수 치환 시스템
- **Factory Pattern**: PipelineFactory로 동적 컴포넌트 생성
- **Observer Pattern**: ProgressTracker, ProgressManager로 실시간 모니터링
- **Singleton Pattern**: ProcessorConfig 중앙 설정 관리

### 🚀 새로운 고급 기능
- **ErrorHandler**: 분류별 에러 처리 (`ProcessingError`, `ValidationError`, `AIServiceError`)
- **PerformanceUtils**: 메모리 사용량, 실행 시간 자동 추적 및 최적화 제안
- **ProcessingMetricsCollector**: 통계 자동 수집 (성공률, 평균 처리시간, 메모리 효율성)
- **품질 평가 시스템**: AI 통합 결과 자동 품질 점수 (0-100점) + 개선 권장사항
- **중복 제거 강화**: 레벤슈타인 거리 알고리즘으로 스마트 중복 감지
- **TTS 호환성 개선**: 발음 가이드 자동 제거 + 프롬프트 레벨 최적화
- **프롬프트 템플릿 시스템**: 외부 파일 관리 + 변수 치환 + 빌드 자동화
- **프롬프트 시스템 통합**: news-processor와 script-generator 간 완전한 일관성 확보

### 🔄 레거시 마이그레이션 현황
| 레거시 스크립트 | 패키지 | 상태 | 주요 기능 |
|---------------|-------|------|----------|
| `consolidate-news.ts` | news-processor | ✅ 완료 | AI 통합, 외부 프롬프트 템플릿 |
| `generate-newscast-script.ts` | script-generator | ✅ 완료 | Gemini 1.5 Pro, 일관된 프롬프트 시스템 |
| `generate-newscast-audio.ts` | audio-generator | 🚧 대기 | TTS Chirp HD, 8개 모델 |
| `merge-newscast-audio.ts` | audio-processor | 🚧 대기 | FFmpeg 병합, 무음 처리 |
| `run-parallel-pipeline.sh` | cli | 🚧 대기 | 병렬 처리, 4배 속도 향상 |

## 📋 다음 작업 우선순위 (v2.2)

### ✅ 완료된 작업 (v2.1.1)
- **script-generator 패키지화**: TTS 호환성 개선, 프롬프트 템플릿 시스템 구현
- **news-processor 프롬프트 템플릿화**: 외부 파일 기반 프롬프트 관리 시스템 구현
- **프롬프트 시스템 통합**: 두 패키지 간 완전한 일관성 확보 (PromptLoader, 경로 해결, CLI)
- **발음 가이드 제거**: "앤서니 앨버니지(앵-써-니 앨-버-니-지)" → "앤서니 앨버니지" 
- **TypeScript 설정 통합**: ESNext/NodeNext 기반 모던 설정 + extends 패턴

### 🎯 1순위: audio-generator 패키지화
```typescript
// Google Cloud TTS Chirp HD 통합
- 8개 프리미엄 모델: ko-KR-Chirp3-HD-{Aoede,Charon,Fenrir,Kore,Leda,Orus,Puck,Titania}
- 한국인 이름 매핑: 이서연(여), 김민준(남), 박지훈(남), 정유진(여) 등
- 대사별 개별 MP3 생성 (001-김민준.mp3, 002-이서연.mp3)
- API Rate Limit 처리 (100ms 간격)
```

### 🎯 2순위: audio-processor 패키지화
```bash
# FFmpeg 기반 오디오 병합
- 대사 간 0.2초 무음 구간 자동 추가 (TTS 표준)
- 오프닝/클로징 시그널 음악 통합
- MP3 24kHz, 32kbps, 모노 최적화
- 메타데이터 자동 태깅 (제목, 생성 시간, 진행자)
```

### 🎯 3순위: 통합 CLI 구현 ✅ **완료**
```bash
# ✅ 루트 폴더 통합 명령어 (2025-06-23 구현 완료)
pnpm env:setup                                # 환경 자동 설정
pnpm pipeline:test --max-topics 1           # 테스트 파이프라인
pnpm pipeline:full --max-topics 3           # 완전 파이프라인
pnpm demo:quick                              # 기존 데이터 빠른 데모
pnpm demo:audio                              # TTS 생성 데모

# 개별 패키지 실행 (루트에서)
pnpm news:process <folder>                   # AI 뉴스 통합
pnpm audio:generate <script> <output>        # TTS 음성 생성
pnpm crawl:pipeline --max-topics 5          # 뉴스 크롤링
```

## 🛠️ 환경 설정

### 📦 필수 시스템 요구사항
```bash
# 1. Node.js 18+ (TypeScript ES 모듈 지원)
node --version  # v18.0.0+

# 2. UV (Python 패키지 매니저, 10-100배 빠름)
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc

# 3. pnpm (모노레포 워크스페이스)
npm install -g pnpm

# 4. FFmpeg (오디오 처리, v4.0+)
# Ubuntu/Debian: sudo apt install ffmpeg
# macOS: brew install ffmpeg
# Windows: choco install ffmpeg
```

### 🔑 API 키 설정
```bash
# Google AI Studio (Gemini API) - 필수
export GOOGLE_AI_API_KEY="your_google_ai_api_key_here********************"

# Google Cloud TTS (서비스 계정) - TTS 기능용
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"

# 환경변수 영구 저장
echo 'export GOOGLE_AI_API_KEY="your_key"' >> ~/.bashrc
source ~/.bashrc
```

### 🚀 프로젝트 초기화
```bash
# 1. 저장소 클론 및 의존성 설치
git clone <repository-url> ai-newscast
cd ai-newscast
pnpm install

# 2. 전체 빌드 (Turbo 병렬)
pnpm build

# 3. 테스트 크롤링 (토픽 1개)
pnpm crawl:pipeline --max-topics 1

# 4. 결과 확인
ls -la output/$(ls output/ | tail -1)/topic-01/
```

## 🔍 개발 가이드라인

### 📝 코딩 규칙 (2025 표준)
```typescript
// TypeScript: ES 모듈 + 명시적 확장자
import { NewsConsolidator } from './consolidator.ts';           // ✅
import type { NewsProcessorOptions } from './types/index.ts';    // ✅ type 키워드
import { external } from 'external-package';                    // ✅ 외부는 확장자 없음

// Python: Pydantic + 타입 힌트 + 구조화 로깅
class NewsItem(BaseModel):
    news_id: str
    title: str
    published_date: datetime
    
logger.info("처리 시작", extra={"operation": "crawl", "count": 10})
```

### 🏗️ 패키지 아키텍처 패턴
```
src/
├── interfaces/          # 타입 정의, 추상 클래스
├── strategies/          # Strategy 패턴 구현체
├── pipeline/            # Pipeline 패턴 단계들
├── services/            # 비즈니스 로직
├── utils/               # 유틸리티 (성능, 에러 처리)
├── factories/           # Factory 패턴 (동적 생성)
├── monitoring/          # 모니터링, 메트릭스
└── config/              # 설정 관리
```

### ⚡ 성능 최적화 원칙
- **메모리 효율성**: 큰 데이터는 스트리밍 처리, 가비지 컬렉션 고려
- **병렬 처리**: API 호출은 3개 동시 + 1초 간격 (Rate Limit 준수)
- **캐싱 전략**: TTS 결과 캐싱, AI 응답 중복 제거
- **에러 복구**: 지수 백오프 재시도, 부분 실패 허용

## 🛠️ 트러블슈팅

### 🔴 자주 발생하는 문제
```bash
# 1. UV not found
export PATH="$HOME/.local/bin:$PATH"
which uv  # /home/user/.local/bin/uv 확인

# 2. TypeScript import 오류 "Cannot find module"
# 상대 경로에 .ts 확장자 추가 필요
import { something } from './file.ts';  # ✅

# 3. API 키 인식 안됨
echo $GOOGLE_AI_API_KEY  # 값 확인
export GOOGLE_AI_API_KEY="actual_key"

# 4. Playwright 브라우저 설치 오류
npx playwright install chromium

# 5. FFmpeg not found (오디오 처리)
which ffmpeg  # 설치 확인
sudo apt install ffmpeg  # Ubuntu
```

### 🔧 고급 디버깅
```bash
# Node.js 버전 호환성 확인
node --version  # v24.0.0+ 필수
pnpm --version  # v10.12.2 권장

# 패키지별 세부 로깅
DEBUG=1 pnpm --filter @ai-newscast/news-processor build

# 메모리 사용량 모니터링 (Node.js 24+)
node --inspect --max-old-space-size=4096 script.ts

# API 서버 테스트
curl "https://ai-newscast-latest-id.r-s-account.workers.dev/latest"
curl "https://ai-newscast-latest-id.r-s-account.workers.dev/health"

# 구조 테스트 (API 없이)
GOOGLE_AI_API_KEY=dummy node --experimental-transform-types test.ts
```

## 🔧 프롬프트 시스템 통합 (v2.1.1 중요 업데이트)

### 🎯 통합 완료 사항
**목표**: news-processor와 script-generator의 프롬프트 관리 시스템을 완전히 일관성 있게 통합

### 🛠️ 구현된 공통 아키텍처
```typescript
// 1. 외부 Markdown 파일 기반 프롬프트 관리
src/prompts/
├── news-consolidation-prompt.md      # news-processor용
└── newscast-script-prompt.md         # script-generator용

// 2. 동일한 PromptLoader 클래스 구조
class PromptLoader {
  static loadConsolidationPrompt(variables): string    # news-processor
  static loadNewscastPrompt(variables): string         # script-generator
  static validateTemplate(content): boolean            # 공통 검증
  static getRemainingPlaceholders(content): string[]   # 공통 유틸
}

// 3. 유연한 경로 해결 시스템 (패키지 내부/루트 실행 모두 지원)
if (currentDir.includes('package-name')) {
  promptPath = join(currentDir, 'dist', 'prompts', 'prompt-file.md');
} else {
  promptPath = join(currentDir, 'packages', 'package-name', 'dist', 'prompts', 'prompt-file.md');
}

// 4. 템플릿 변수 치환 시스템
{{TOPIC}} → 실제 주제명
{{NEWS_COUNT}} → 뉴스 개수
{{HOST1_NAME}} → 진행자 이름
```

### ✅ 일관성 확보 완료
- **빌드 스크립트**: 두 패키지 모두 동일한 CLI shebang 적용
- **경로 해결**: 유연한 path resolution 패턴 통일
- **에러 처리**: 동일한 에러 메시지 포맷 및 처리 방식
- **검증 시스템**: 템플릿 변수 검증 로직 공유
- **빌드 자동화**: 프롬프트 파일 자동 복사 시스템

### 🚀 성능 개선 효과
- **유지보수성**: 프롬프트 수정 시 코드 재빌드 불필요
- **확장성**: 새로운 변수 추가 시 Markdown 파일만 수정
- **일관성**: 두 패키지 간 동일한 패턴으로 개발 효율성 증대
- **디버깅**: 템플릿 검증으로 런타임 오류 사전 방지

## 🔧 TTS 호환성 개선 (v2.1 중요 업데이트)

### 🎯 문제 해결
**문제**: AI 생성 스크립트의 발음 가이드가 TTS 음성을 이상하게 만듦
- **예시**: "앤서니 앨버니지(앵-써-니 앨-버-니-지)" → TTS가 괄호와 하이픈까지 읽음

**해결**: 프롬프트 레벨에서 발음 가이드 생성 방지
- **변경 전**: `핵심 인물과 기관명은 정확한 발음 표기 (예: 김민재(김-민-재))`
- **변경 후**: `TTS를 위해 발음 가이드나 괄호는 사용하지 마세요`

### 🛠️ 구현된 시스템
```typescript
// 1. 프롬프트 템플릿 시스템 (src/prompts/newscast-script-prompt.md)
- 외부 파일 기반 프롬프트 관리
- 변수 치환 시스템: {{HOST1_NAME}}, {{NEWS_CONTENT}} 등
- TTS 호환성 명시적 요구사항 포함

// 2. PromptLoader 유틸리티 (src/utils/prompt-loader.ts)  
- 템플릿 로드 및 변수 치환
- 검증 시스템: 미치환 변수 자동 감지
- 오류 시 백업 프롬프트 제공

// 3. 빌드 자동화 (package.json)
- 프롬프트 파일 자동 복사: src/prompts → dist/prompts
- 런타임 파일 경로 해결
```

### ✅ 결과 검증
**생성된 스크립트**: 깨끗한 TTS 친화적 텍스트
- ❌ 변경 전: "앤서니 앨버니지(앵-써-니 앨-버-니-지)"
- ✅ 변경 후: "앤서니 앨버니지"

**성능 개선**: 
- TTS 음성 품질 향상 (발음 가이드 제거)
- 프롬프트 관리 효율성 증대 (외부 파일 기반)
- 유지보수성 개선 (템플릿 변수 시스템)

## 📚 상세 참고 문서

### 📖 프로젝트 문서
- **[README.md](README.md)** - 전체 사용법 및 프로젝트 소개
- **[docs/PROJECT_CONTEXT_GUIDE.md](docs/PROJECT_CONTEXT_GUIDE.md)** - 🆕 신규 개발자 온보딩 가이드
- **[MIGRATION.md](MIGRATION.md)** - v1.x → v2.0 상세 마이그레이션 가이드  
- **[CHANGELOG.md](CHANGELOG.md)** - 전체 변경 이력 (v0.0.1 → v2.0.0)
- **[TODO.md](TODO.md)** - 우선순위별 작업 목록 및 로드맵

### 🤖 Claude Code 지원
- **[.claude.md](.claude.md)** - 🆕 Claude Code 컨텍스트 설정 파일
- **[.claudeignore](.claudeignore)** - 🆕 Claude Code 제외 파일 목록

### 🛠️ 기술 문서
- **[docs/refactoring-issues-and-solutions.md](docs/refactoring-issues-and-solutions.md)** - 리팩토링 기술 이슈 해결
- **[docs/korean-encoding-fix.md](docs/korean-encoding-fix.md)** - 한국어 인코딩 문제 해결
- **[compare-implementations.md](compare-implementations.md)** - 리팩토링 전후 비교 분석

### 🌐 외부 리소스
- **[빅카인드 공식](https://bigkinds.or.kr)** - 뉴스 데이터 소스
- **[UV 문서](https://docs.astral.sh/uv/)** - Python 패키지 매니저
- **[Turbo 문서](https://turbo.build/)** - 모노레포 빌드 시스템
- **[Google Gemini API](https://ai.google.dev/)** - AI 모델 문서
- **[Google Cloud TTS](https://cloud.google.com/text-to-speech)** - TTS API 문서

---
*최종 업데이트: 2025-06-24 v2.1.3 - Turbo 모노레포 최적화 및 Google API 패키지 정리*