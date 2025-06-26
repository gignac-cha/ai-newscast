# AI 뉴스캐스트 프로젝트 - Claude Code 컨텍스트

## 📋 프로젝트 개요
빅카인드(bigkinds.or.kr)에서 실시간 뉴스를 수집하여 AI 기반 뉴스캐스트를 완전 자동화 생성하는 고급 모노레포 프로젝트

**현재 버전**: v3.0.0 (2025-06-27 프로젝트 클린업 및 재시작)  
**상태**: 10% 시작 (1/10 패키지 구현, 기초 news-crawler만 완성)

## 🏗️ 핵심 아키텍처

### 📦 패키지 구조와 구현 상태 (v3.0.0 클린업 후)
```
packages/
├── news-crawler/            # ✅ 완성 - Python + UV 기반 뉴스 크롤러 (news-topics만 구현)
├── core/                    # 🚧 계획 - 공통 타입, 유틸리티 (TypeScript + Zod)
├── news-processor/          # 🚧 계획 - AI 뉴스 통합 (Pipeline 패턴, 프롬프트 템플릿 시스템)
├── script-generator/        # 🚧 계획 - 뉴스캐스트 스크립트 생성 (TTS 호환)
├── audio-generator/         # 🚧 계획 - TTS 음성 생성 (Google Cloud TTS Chirp HD)
├── audio-processor/         # 🚧 계획 - 오디오 병합/후처리 (FFmpeg 기반)
├── api-server/              # 🚧 계획 - Cloudflare Workers API (KV 기반 배치 ID 관리)
├── cli/                     # 🚧 계획 - 통합 CLI (ai-newscast 바이너리)
├── newscast-generator/      # 🚧 계획 - 스크립트/오디오/병합 통합 제너레이터
└── web/                     # 🚧 계획 - 뉴스캐스트 플레이어 웹 인터페이스
```

### 🔄 v3.0.0 프로젝트 클린업 상태
```
이전 상태 (v2.2.0)                    →  현재 상태 (v3.0.0)
├── 복잡한 레거시 코드 구조              →  🧹 완전 제거됨 (클린업 완료)
├── 문서-코드 불일치 문제               →  🧹 완전 해결됨 (단순한 시작점)
├── 10개 패키지 "완성" 주장            →  🧹 정직하게 1개만 구현 상태로 리셋
├── tests/claude-code/ 레거시         →  🧹 완전 제거됨
└── 혼란스러운 아키텍처                →  ✅ 명확한 PIPELINE_PLAN.md 기반 재시작
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

### ⚡ 빠른 시작 (v3.0.0 현재 가능한 기능)
```bash
# 1. 프로젝트 의존성 설치
pnpm install

# 2. 뉴스 토픽 크롤링 테스트 (현재 유일한 구현 기능)
pnpm crawl:news-topics -- --output-file "output/test/topic-list.json" --print-format json

# 3. 전체 파이프라인 실행 (기본 1단계만 - 토픽 크롤링)
./scripts/run-all.sh

# 주의: 나머지 기능들(news-list, news-details, AI 처리 등)은 아직 미구현
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
# 👑 권장: 완전 자동화 파이프라인
pnpm pipeline:full                               # 토픽 10개, 오디오 포함
pnpm pipeline:fast                               # 토픽 3개, 오디오 제외
pnpm pipeline:test                               # 토픽 1개 테스트
pnpm pipeline:audio                              # 토픽 1개, 상세 로그

# 단계별 실행 (고급 사용자용)
pnpm crawl:pipeline -- --max-topics 5           # 뉴스 크롤링만
pnpm news:process -- ./output/latest/topic-01   # AI 뉴스 통합
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

### 🔄 7단계 완전 파이프라인 (PIPELINE_PLAN.md 기반 로드맵)
1. **토픽 추출** ✅ - bigkinds.or.kr 메인페이지 → 30개 트렌딩 주제 (data-* 속성 파싱)
2. **뉴스 목록** 🚧 - POST `/news/getNetworkDataAnalysis.do` → 주제별 뉴스 목록 (최대 100개)  
3. **뉴스 상세** 🚧 - GET `/news/detailView.do` → 개별 뉴스 상세 정보 (병렬 처리)
4. **AI 통합** 🚧 - Google Gemini API → 뉴스 통합 정리 (중복 제거, 품질 평가)
5. **스크립트 생성** 🚧 - Google Gemini API → 대화형 뉴스캐스트 스크립트 생성
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

## 🔧 v3.0.0 프로젝트 클린업 및 재시작

### ✅ 완료된 주요 클린업
- **레거시 코드 완전 제거**: tests/claude-code/ 및 혼란스러운 구조 삭제
- **문서-코드 일치**: 과장된 "완성" 주장 제거, 정직한 현재 상태 반영
- **단순한 시작점**: news-crawler 하나만 구현된 깔끔한 상태로 리셋
- **명확한 로드맵**: PIPELINE_PLAN.md 기반 단계별 구현 계획 수립
- **Turbo 모노레포**: pnpm workspace + Turbo 빌드 시스템 기초 구축

### 🔄 v3.0.0 문서 업데이트 과정 (2025-06-27)
**문제**: 기존 프로젝트 문서들이 실제 구현 상태와 심각하게 불일치
- CLAUDE.md: "95% 완성 (10/10 패키지)" → 실제로는 1개 패키지만 부분 구현
- README.md: 복잡한 기능들 "완성" 주장 → 대부분 미구현 상태
- TODO.md: 혼란스러운 우선순위 → PIPELINE_PLAN.md와 일치하지 않음
- CHANGELOG.md: 과장된 성과 주장 → 실제 개발 내역과 다름

**해결 과정**:
1. **전체 문서 감사**: 모든 .md 파일의 실제 구현 상태 검증
2. **정직한 리라이팅**: 과장된 완성도 주장 완전 제거
3. **일관성 확보**: PIPELINE_PLAN.md 기반으로 모든 문서 통일
4. **현실 반영**: v3.0.0 "10% 시작" 상태로 솔직하게 문서화
5. **커밋 스타일 정립**: COMMIT_STYLE.md로 "feature:" 규칙 명문화

**결과**: 
- 모든 문서가 실제 구현 상태와 완전 일치
- 개발자가 혼란 없이 프로젝트 현황 파악 가능
- PIPELINE_PLAN.md 기반 명확한 개발 로드맵 확립

### 🎯 현재 구현된 기능 (v3.0.0)
```bash
pnpm crawl:news-topics     # 뉴스 토픽 크롤링 (유일한 구현 기능)
./scripts/run-all.sh       # 기본 파이프라인 스크립트 (토픽 크롤링만)
```

### 🚀 v3.0.0의 핵심 가치
- **정직성**: 실제 구현 상태와 문서의 완전한 일치
- **명확성**: 혼란스러운 레거시 제거로 개발 방향성 확립
- **확장성**: PIPELINE_PLAN.md 기반 체계적인 단계별 구현 가능

## 📋 다음 작업 우선순위 (v3.1 로드맵)

### 🎯 1순위: news-crawler 패키지 확장 (현재 진행 중)
- **news-list 크롤링**: 토픽별 뉴스 목록 수집 기능 추가
- **news-details 크롤링**: 개별 뉴스 상세 정보 수집 기능 추가
- **명명 규칙 통일**: PIPELINE_PLAN.md 명세에 맞게 스크립트 이름 변경
- **Turbo 태스크 확장**: crawler:news-list, crawler:news-details 추가

### 🎯 2순위: 제너레이터 패키지들 구현
- **news-generator**: AI 기반 뉴스 통합 처리 (Google Gemini API)
- **newscast-generator**: 스크립트/오디오/병합 통합 제너레이터
- **API 통합**: Google AI Studio 및 Google Cloud TTS 연동

### 🎯 3순위: 완전 자동화 파이프라인 구축
- **의존성 기반 실행**: Turbo 태스크 의존성 관계 정의
- **에러 핸들링**: 단계별 실패 시 복구 로직
- **성능 최적화**: 병렬 처리 및 캐싱 전략

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
*최종 업데이트: 2025-06-27 v3.0.0 - 프로젝트 클린업 및 정직한 재시작 완료*