# CLAUDE.md

AI 어시스턴트를 위한 코드 작성 규칙 및 개발 가이드

## 📋 패키지별 가이드

**중요**: 각 패키지(`packages/*/`)에는 개별 CLAUDE.md 파일이 있습니다. 해당 패키지에서 작업할 때는 **반드시** 패키지별 CLAUDE.md를 먼저 읽으세요.

---

## ⚠️ 필수 코딩 컨벤션 (CRITICAL)

**위반 시 코드 리뷰 반려됩니다.**

### 1. camelCase 네이밍 규칙 (TypeScript/JavaScript)

#### 약어는 모두 대문자
- ✅ `ID` (not `Id`, not `id`)
- ✅ `HTML` (not `Html`, not `html`)
- ✅ `JSON` (not `Json`, not `json`)
- ✅ `URL` (not `Url`, not `url`)
- ✅ `API` (not `Api`, not `api`)

#### 약어 사용 금지, 전체 단어 사용
- ✅ `average` (not `avg`, not `Avg`)
- ✅ `maximum` (not `max`, not `Max`)
- ✅ `minimum` (not `min`, not `Min`)

#### 예시
```typescript
// ✅ CORRECT
interface NewsMetrics {
  newscastID: string;              // ID 대문자
  topicsHTMLBytes: number;         // HTML 대문자
  topicsJSONBytes: number;         // JSON 대문자
  averageNewsPerTopic: number;     // average 전체 단어
  maximumNewsPerTopic: number;     // maximum 전체 단어
  minimumNewsPerTopic: number;     // minimum 전체 단어
}

// ❌ WRONG
interface NewsMetrics {
  newscastId: string;              // ❌ Id 소문자
  topicsHtmlBytes: number;         // ❌ Html 카멜케이스
  topicsJsonBytes: number;         // ❌ Json 카멜케이스
  avgNewsPerTopic: number;         // ❌ avg 약어
  maxNewsPerTopic: number;         // ❌ max 약어
  minNewsPerTopic: number;         // ❌ min 약어
}
```

#### 예외: Lambda/Python API 통신
Lambda는 Python으로 작성되어 **snake_case** 사용:

```typescript
// TypeScript → Lambda 요청
{
  newscast_id: "2025-10-05T19-53-26-599Z",  // snake_case
  topic_index: 1,                            // snake_case
  dry_run: false                             // snake_case
}

// Lambda → TypeScript 응답
{
  output_file_size: 1234567,                 // snake_case
  audio_base64: "...",                       // snake_case
  program_name: "newscast"                   // snake_case
}
```

### 2. 시간 단위 규칙

#### 기본 시간 단위는 밀리세컨드 (milliseconds)
- ✅ 밀리세컨드일 경우 **단위 표기 생략**
- ✅ 다른 단위일 경우만 명시 (`durationSeconds`, `durationMinutes`)

```typescript
// ✅ CORRECT - 밀리세컨드는 단위 생략
interface Timing {
  duration: number;        // 밀리세컨드 (기본)
  fetchTime: number;       // 밀리세컨드 (기본)
  parseTime: number;       // 밀리세컨드 (기본)
}

// ✅ CORRECT - 다른 단위는 명시
interface AudioInfo {
  durationSeconds: number;  // 초 단위
  durationMinutes: number;  // 분 단위
}

// ❌ WRONG
interface Timing {
  durationMS: number;           // ❌ MS 붙이지 말 것
  durationMilliseconds: number; // ❌ Milliseconds 붙이지 말 것
  fetchTimeMs: number;          // ❌ Ms 붙이지 말 것
}
```

### 3. Nullish Coalescing 사용 필수

#### ✅ `??` 연산자 사용 (nullish coalescing)
#### ❌ `||` 연산자 사용 금지 (falsy 값 처리 오류)

```typescript
// ✅ CORRECT
const value = data.count ?? 0;        // null/undefined만 체크
const name = user.name ?? 'Unknown';  // null/undefined만 체크

// ❌ WRONG
const value = data.count || 0;        // ❌ 0도 falsy로 처리
const name = user.name || 'Unknown';  // ❌ 빈 문자열도 falsy로 처리
```

---

## 🏗️ 아키텍처 및 패키지 구조

### 패키지 구현 상태 (v3.7.2)

```
packages/
├── news-crawler/            # ✅ 완성 - Python + TypeScript 듀얼 구현
├── news-crawler-worker/     # ✅ 완성 - Cloudflare Workers API
├── news-generator/          # ✅ 완성 - AI 뉴스 통합 (Gemini)
├── newscast-generator/      # ✅ 완성 - 스크립트 + TTS + 병합
├── newscast-generator-worker/ # ✅ 완성 - Cloudflare Workers API
├── newscast-scheduler-worker/ # ✅ 완성 - 파이프라인 오케스트레이션
├── newscast-latest-id/      # ✅ 완성 - KV 기반 ID 관리
├── newscast-web/            # ✅ 완성 - React 19 웹 플레이어
├── core/                    # ✅ 완성 - 공통 타입 정의
├── audio-generator/         # 🚧 계획 - TTS 음성 생성
├── audio-processor/         # 🚧 계획 - 오디오 후처리
├── api-server/              # 🚧 계획 - 확장 API
└── cli/                     # 🚧 계획 - 통합 CLI
```

### 패키지 간 의존성 규칙

#### core 패키지
- 모든 패키지가 참조하는 **중앙 타입 정의**
- workspace protocol 사용: `"@ai-newscast/core": "workspace:*"`
- core 변경 시 **모든 의존 패키지 재빌드 필수**

#### Turbo 빌드 시스템
- 병렬 빌드 및 태스크 관리
- 변경된 패키지만 선택적으로 빌드
- `globalEnv`, `env` 설정으로 환경변수 전파

---

## 🚀 파이프라인 실행 규칙

### 7단계 완전 자동화 파이프라인

```bash
# Step 1: 뉴스 토픽 추출 (10개 고유 토픽)
pnpm run:crawler:news-topics

# Step 2: 토픽별 뉴스 목록 수집 (최대 100개/토픽)
pnpm run:crawler:news-list

# Step 3: 개별 뉴스 상세 정보 추출
pnpm run:crawler:news-details

# Step 4: AI 뉴스 통합 (Google Gemini 2.5 Pro)
pnpm run:generator:news

# Step 5: 뉴스캐스트 스크립트 생성 (듀얼 호스트)
pnpm run:generator:newscast-script

# Step 6: TTS 오디오 생성 (Google Cloud TTS Chirp HD)
pnpm run:generator:newscast-audio

# Step 7: 최종 오디오 병합 (FFmpeg)
pnpm run:generator:newscast
```

### 병렬 처리 규칙

- **GNU Parallel** 사용으로 다중 토픽 동시 처리
- `--max-concurrency` 옵션으로 동시 실행 개수 제어
- API rate limit 준수 필수

### 스킵 및 재개 기능

```bash
# 특정 단계 스킵
./scripts/run-all.sh --skip newscast-audio

# 기존 출력에서 재개
./scripts/run-all.sh --output-dir output/2025-10-05T19-53-26-599Z
```

---

## 🔧 기술 스택별 규칙

### Python 패키지 (news-crawler)

- **패키지 매니저**: UV (pip 대비 10-100배 빠름)
- **CLI 프레임워크**: Typer
- **HTTP**: requests + lxml
- **듀얼 구현**: Python + TypeScript 동기화 필수
- **상세**: `packages/news-crawler/CLAUDE.md` 참조

### TypeScript 패키지

- **빌드**: Node.js 24+ experimental type stripping
- **CLI 프레임워크**: Commander.js
- **타입 검증**: Zod 스키마
- **Import 확장자**: `.ts` 확장자 **반드시 명시**

```typescript
// ✅ CORRECT
import { something } from './file.ts';

// ❌ WRONG
import { something } from './file';
```

### React 웹 플레이어 (newscast-web)

- **Framework**: React 19 + Vite + TypeScript
- **UI Components**: Radix UI + Emotion
- **State Management**: TanStack Query + AudioContext
- **Ref 처리**: React 19 `ref as prop` (forwardRef 제거)
- **메모이제이션**: React.memo + useCallback + useMemo 전면 적용

### Cloudflare Workers

- **Runtime**: TypeScript + esbuild
- **Storage**: KV 스토리지
- **API**: REST 엔드포인트 설계

---

## 📁 출력 데이터 구조

### 디렉터리 구조 (필수 준수)

```
output/{ISO_TIMESTAMP}/
├── topic-list.json             # 10개 고유 토픽
├── topic-01/                   # 1순위 토픽
│   ├── news-list.json         # 최대 100개 뉴스
│   ├── news/                  # 개별 뉴스 상세 폴더
│   ├── news.json              # AI 통합 뉴스 (JSON)
│   ├── news.md                # AI 통합 뉴스 (Markdown)
│   ├── newscast-script.json   # 뉴스캐스트 스크립트 (JSON)
│   ├── newscast-script.md     # 뉴스캐스트 스크립트 (Markdown)
│   ├── newscast.mp3           # 최종 병합 오디오
│   ├── newscast-audio-info.json # 오디오 병합 메타데이터
│   └── audio/                 # TTS 오디오 파일들
│       ├── 001-music.mp3      # 오프닝 음악 (스킵됨)
│       ├── 002-host1.mp3      # 호스트1 음성
│       ├── 003-host2.mp3      # 호스트2 음성
│       └── audio-files.json   # 오디오 생성 메타데이터
└── topic-{N}/                 # N순위 토픽 (최대 10개)
```

### JSON 출력 패턴 (모든 파일 공통)

```typescript
{
  timestamp: string;      // ISO 8601 타임스탬프
  // ... 데이터 필드들 (camelCase)
  metrics: {
    newscastID: string;   // ID 대문자
    topicIndex: number;   // 1-10
    timing: {
      startedAt: string;
      completedAt: string;
      duration: number;   // 밀리세컨드 (단위 생략)
    },
    // ... 추가 메트릭스
  }
}
```

---

## 🚨 에러 처리 규칙

### API Rate Limits (필수 준수)

- **Google Gemini**: 3초 지연 필수
- **Google Cloud TTS**: 지연 없음 (로컬 처리)
- **BigKinds**: 1초 지연 (서버 보호)

### 재시도 로직

- **Python**: Typer 구조화 에러
- **TypeScript**: Commander.js + try/catch
- **React**: ErrorBoundary + 로딩 상태

### 파일 시스템

- **출력 경로**: 항상 `output/{ISO_TIMESTAMP}` 유지
- **FFmpeg**: @ffmpeg-installer로 크로스 플랫폼 지원
- **덮어쓰기 금지**: 타임스탬프로 출력 분리

---

## 🔄 Git 커밋 규칙

### 커밋 접두사 (필수)

- `feature:` - 새로운 기능 추가
- `refactor:` - 코드 구조 개선
- `fix:` - 버그 수정
- `document:` - 문서 업데이트 (NOT `docs:`)
- `chore:` - 유지보수, 의존성 업데이트

### Claude Code 서명 (필수)

모든 커밋은 다음으로 **반드시** 끝나야 함:

```
🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🎯 환경변수 관리

### 개발 환경
- `.env` 파일 사용 (git 커밋 금지)
- 필수 변수: `GOOGLE_GEN_AI_API_KEY`, `GOOGLE_CLOUD_API_KEY`

### 프로덕션 환경
- Cloudflare KV 스토리지 기반
- Turbo `globalEnv`, `env`로 전파

---

## ⚡ 성능 최적화 규칙

### 크롤링
- UV 패키지 매니저 사용 (10-100배 빠름)
- 상세: `packages/news-crawler/CLAUDE.md` 참조

### Node.js
- Turbo 병렬 빌드
- TypeScript experimental stripping (빌드 단계 제거)

### React
- React.memo 전면 적용 (15개 컴포넌트)
- useCallback, useMemo로 재렌더링 최소화
- 벤더 청크 분리로 번들 최적화

### AI
- GNU Parallel로 동시 처리
- API rate limit 준수 필수

---

## 📚 참고 문서

- **프로젝트 개요**: [README.md](README.md)
- **뉴스 크롤링**: [packages/news-crawler/CLAUDE.md](packages/news-crawler/CLAUDE.md)
- **Core 타입**: [packages/core/CLAUDE.md](packages/core/CLAUDE.md)
- **웹 플레이어**: [packages/newscast-web/CLAUDE.md](packages/newscast-web/CLAUDE.md)

---

*최종 업데이트: 2025-07-03 v3.7.2*
