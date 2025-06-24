# 병렬 Claude Code 개발 가이드

> AI News Cast 프로젝트에서 여러 터미널로 Claude Code를 동시 실행하여 효율적인 병렬 개발을 수행하는 가이드

## 📋 개요

대규모 모노레포 프로젝트에서 여러 패키지를 동시에 개발할 때, 각 터미널마다 특정 작업 영역을 제한하여 Claude Code를 실행하면 다음과 같은 이점이 있습니다:

- **🚀 개발 속도 향상**: 패키지별 병렬 작업으로 전체 개발 시간 단축
- **🎯 집중도 향상**: 각 세션이 특정 영역에만 집중하여 컨텍스트 혼동 방지
- **🔄 효율적 리소스 활용**: CPU/메모리를 여러 작업에 분산하여 최적화
- **⚡ 빠른 피드백**: 패키지별 독립적인 빌드/테스트 실행

## 🏗️ 패키지별 작업 영역 분할

### 📦 권장 병렬 작업 분할
```
Terminal 1: script-generator 패키지 (우선순위 1)
├── packages/script-generator/
├── tests/claude-code/generate-newscast-script.ts
└── tests/claude-code/tts-voices.json

Terminal 2: audio-generator 패키지 (우선순위 2)  
├── packages/audio-generator/
├── tests/claude-code/generate-newscast-audio.ts
└── Google Cloud TTS 설정

Terminal 3: audio-processor 패키지 (우선순위 3)
├── packages/audio-processor/
├── tests/claude-code/merge-newscast-audio.ts
└── FFmpeg 설정

Terminal 4: 통합 CLI 패키지 (우선순위 4)
├── packages/cli/
├── tests/claude-code/run-parallel-pipeline.sh
└── 전체 파이프라인 통합

Terminal 5: 테스트 및 검증 (지속적)
├── output/ 폴더 모니터링
├── 통합 테스트 실행
└── 성능 측정 및 비교
```

## 🚀 터미널별 Claude Code 실행 명령어

### 📁 작업 디렉토리 제한 설정

#### Terminal 1: Script Generator 개발
```bash
# 작업 디렉토리로 이동
cd /mnt/d/Projects/ai-newscast

# Claude Code 실행 (script-generator 집중)
claude-code --cwd packages/script-generator

# 또는 특정 파일들만 컨텍스트로 제한
claude-code --include "packages/script-generator/**" --include "tests/claude-code/generate-newscast-script.ts" --include "tests/claude-code/tts-voices.json"
```

#### Terminal 2: Audio Generator 개발  
```bash
# 작업 디렉토리로 이동
cd /mnt/d/Projects/ai-newscast

# Claude Code 실행 (audio-generator 집중)
claude-code --cwd packages/audio-generator

# 또는 관련 파일들만 포함
claude-code --include "packages/audio-generator/**" --include "tests/claude-code/generate-newscast-audio.ts" --include "packages/core/src/types.ts"
```

#### Terminal 3: Audio Processor 개발
```bash
# 작업 디렉토리로 이동  
cd /mnt/d/Projects/ai-newscast

# Claude Code 실행 (audio-processor 집중)
claude-code --cwd packages/audio-processor

# 또는 FFmpeg 관련 파일들 포함
claude-code --include "packages/audio-processor/**" --include "tests/claude-code/merge-newscast-audio.ts"
```

#### Terminal 4: 통합 CLI 개발
```bash
# 작업 디렉토리로 이동
cd /mnt/d/Projects/ai-newscast

# Claude Code 실행 (CLI 및 전체 통합 집중)
claude-code --cwd packages/cli

# 또는 전체 파이프라인 관련 파일들 포함
claude-code --include "packages/cli/**" --include "tests/claude-code/run-parallel-pipeline.sh" --include "turbo.json" --include "package.json"
```

#### Terminal 5: 테스트 및 검증
```bash
# 루트 디렉토리에서 전체 모니터링
cd /mnt/d/Projects/ai-newscast

# 테스트 및 출력 검증에 집중
claude-code --include "output/**" --include "packages/*/package.json" --include "pnpm-workspace.yaml" --include "turbo.json"
```

## 🎯 패키지별 작업 범위 및 목표

### 🔥 Terminal 1: Script Generator (최우선)
```typescript
// 목표: tests/claude-code/generate-newscast-script.ts (450줄) → packages/script-generator/
작업 범위:
✅ 1. Google Gemini 2.5 Pro Preview 통합
✅ 2. 8개 Chirp HD 음성 모델 랜덤 선택 시스템
✅ 3. 대화형 뉴스캐스트 스크립트 생성 로직
✅ 4. DialogueLine 파싱 및 TTS 준비
✅ 5. 예상 진행 시간 자동 계산
🎯 6. Pipeline 패턴으로 리팩토링
🎯 7. 에러 처리 및 성능 측정 추가
🎯 8. 타입 안전성 강화 (Zod 스키마)
```

### 🎵 Terminal 2: Audio Generator
```typescript
// 목표: Google Cloud TTS Chirp HD 완전 통합
작업 범위:
✅ 1. 8개 프리미엄 모델 매핑 (ko-KR-Chirp3-HD-*)
✅ 2. 한국인 이름 매핑 시스템
✅ 3. 대사별 개별 MP3 생성
✅ 4. API Rate Limit 처리 (100ms 간격)
🎯 5. 오디오 품질 최적화
🎯 6. 캐싱 시스템 구현
🎯 7. 배치 처리 최적화
```

### 🔊 Terminal 3: Audio Processor  
```bash
# 목표: FFmpeg 기반 전문 오디오 후처리
작업 범위:
✅ 1. 대사 간 0.5초 무음 구간 처리
✅ 2. 오프닝/클로징 시그널 음악 통합
✅ 3. MP3 24kHz, 32kbps, 모노 최적화
✅ 4. 메타데이터 자동 태깅
🎯 5. 오디오 품질 분석
🎯 6. 볼륨 정규화
🎯 7. 노이즈 제거 및 향상
```

### 🎛️ Terminal 4: 통합 CLI
```bash
# 목표: 완전 자동화된 파이프라인 CLI
작업 범위:
🎯 1. 전체 파이프라인 통합 명령어
🎯 2. 병렬 처리 시스템 (4배 속도 향상)
🎯 3. 중단점 재개 기능
🎯 4. 실시간 진행상황 표시
🎯 5. 에러 복구 및 재시도 로직
🎯 6. 출력 품질 검증
```

## 📊 작업 진행 상황 공유

### 🔄 실시간 상태 공유 방법
```bash
# 각 터미널에서 진행 상황을 공유 파일에 기록
echo "Terminal 1: Script Generator - 진행률 60%" > .parallel-status
echo "Terminal 2: Audio Generator - 시작" >> .parallel-status
echo "Terminal 3: Audio Processor - 대기중" >> .parallel-status
echo "Terminal 4: CLI Integration - 계획 수립" >> .parallel-status

# 상태 확인
cat .parallel-status
```

### 📝 작업 완료 체크리스트
```markdown
## 병렬 개발 진행 체크리스트

### Terminal 1: Script Generator
- [ ] 레거시 코드 분석 완료
- [ ] 인터페이스 설계 완료
- [ ] Pipeline 단계 구현
- [ ] TTS 음성 선택 로직 이전
- [ ] Gemini API 통합
- [ ] 에러 처리 추가
- [ ] 테스트 작성
- [ ] 통합 테스트 통과

### Terminal 2: Audio Generator  
- [ ] TTS API 클라이언트 구현
- [ ] 음성 모델 매핑 시스템
- [ ] 배치 처리 최적화
- [ ] 캐싱 시스템 구현
- [ ] 품질 검증 로직
- [ ] 에러 복구 메커니즘

### Terminal 3: Audio Processor
- [ ] FFmpeg 래퍼 구현
- [ ] 무음 구간 처리
- [ ] 메타데이터 태깅
- [ ] 품질 분석 도구
- [ ] 볼륨 정규화
- [ ] 배치 처리 최적화

### Terminal 4: CLI Integration
- [ ] 명령어 인터페이스 설계
- [ ] 병렬 처리 로직
- [ ] 진행상황 모니터링
- [ ] 에러 복구 시스템
- [ ] 설정 관리
- [ ] 전체 통합 테스트
```

## ⚙️ 환경별 설정

### 🔧 패키지별 환경 변수 분리
```bash
# Terminal 1: Script Generator 환경변수
export GOOGLE_AI_API_KEY="your_gemini_key"
export SCRIPT_GENERATOR_DEBUG=1
export NODE_ENV=development

# Terminal 2: Audio Generator 환경변수  
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/tts-service-key.json"
export TTS_CACHE_DIR="./cache/tts"
export AUDIO_GENERATOR_DEBUG=1

# Terminal 3: Audio Processor 환경변수
export FFMPEG_PATH="/usr/bin/ffmpeg"
export AUDIO_TEMP_DIR="./temp/audio"
export AUDIO_PROCESSOR_DEBUG=1

# Terminal 4: CLI 환경변수
export CLI_LOG_LEVEL=info
export PARALLEL_MAX_WORKERS=3
export CLI_DEBUG=1
```

### 📁 작업 디렉토리별 .env 파일
```bash
# packages/script-generator/.env
GOOGLE_AI_API_KEY=your_key
SCRIPT_GENERATOR_MODEL=gemini-2.5-pro-preview-03-25
TTS_VOICES_CONFIG=../../tests/claude-code/tts-voices.json

# packages/audio-generator/.env  
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-key.json
TTS_RATE_LIMIT_MS=100
AUDIO_OUTPUT_FORMAT=mp3
AUDIO_SAMPLE_RATE=24000

# packages/audio-processor/.env
FFMPEG_BINARY_PATH=/usr/bin/ffmpeg
AUDIO_SILENCE_DURATION=0.5
AUDIO_OUTPUT_QUALITY=32k

# packages/cli/.env
PIPELINE_MAX_TOPICS=10
PARALLEL_WORKERS=3
CLI_OUTPUT_FORMAT=json
```

## 🔍 모니터링 및 디버깅

### 📊 실시간 진행상황 모니터링
```bash
# Terminal 5에서 실행할 모니터링 스크립트
#!/bin/bash
# parallel-monitor.sh

while true; do
  clear
  echo "=== AI News Cast 병렬 개발 상황 ==="
  echo "$(date)"
  echo ""
  
  echo "📦 패키지 빌드 상태:"
  pnpm --filter @ai-newscast/script-generator build 2>/dev/null && echo "✅ script-generator" || echo "❌ script-generator"
  pnpm --filter @ai-newscast/audio-generator build 2>/dev/null && echo "✅ audio-generator" || echo "❌ audio-generator" 
  pnpm --filter @ai-newscast/audio-processor build 2>/dev/null && echo "✅ audio-processor" || echo "❌ audio-processor"
  pnpm --filter @ai-newscast/cli build 2>/dev/null && echo "✅ cli" || echo "❌ cli"
  
  echo ""
  echo "📁 최근 출력 파일:"
  ls -la output/ 2>/dev/null | tail -3
  
  echo ""
  echo "🔄 활성 프로세스:"
  ps aux | grep "claude-code" | grep -v grep | wc -l | xargs echo "Claude Code 인스턴스:"
  
  sleep 5
done
```

### 🐛 패키지별 디버깅 명령어
```bash
# Terminal 1: Script Generator 디버깅
cd packages/script-generator
npm run typecheck
npm run test
node --experimental-transform-types src/index.ts

# Terminal 2: Audio Generator 디버깅
cd packages/audio-generator  
npm run build
npm run test
DEBUG=audio-generator:* npm start

# Terminal 3: Audio Processor 디버깅
cd packages/audio-processor
which ffmpeg  # FFmpeg 설치 확인
npm run test
DEBUG=audio-processor:* npm start

# Terminal 4: CLI 디버깅
cd packages/cli
npm run typecheck
npm run build
CLI_DEBUG=1 npm start -- --help
```

## 🚀 병렬 개발 워크플로우

### 📅 권장 개발 순서
```
Day 1: 환경 설정 및 기반 구조
├── Terminal 1: script-generator 인터페이스 설계
├── Terminal 2: audio-generator 기본 구조
├── Terminal 3: audio-processor FFmpeg 테스트
└── Terminal 4: CLI 명령어 스펙 정의

Day 2: 핵심 기능 구현
├── Terminal 1: Gemini API 통합 및 스크립트 생성
├── Terminal 2: TTS API 통합 및 음성 생성
├── Terminal 3: 오디오 병합 및 후처리
└── Terminal 4: 파이프라인 오케스트레이션

Day 3: 최적화 및 통합
├── Terminal 1: 에러 처리 및 성능 최적화
├── Terminal 2: 캐싱 및 배치 처리
├── Terminal 3: 품질 향상 및 메타데이터
└── Terminal 4: 병렬 처리 및 모니터링

Day 4: 테스트 및 완성
├── Terminal 1-4: 각 패키지 단위 테스트
├── Terminal 5: 통합 테스트 및 전체 파이프라인
└── 성능 측정 및 최종 검증
```

### ⚡ 효율성 극대화 팁
1. **동기화 포인트**: 매 2시간마다 진행 상황 공유
2. **의존성 관리**: core 패키지 변경시 모든 터미널에 알림
3. **테스트 우선**: 각 기능 구현 후 즉시 테스트 작성
4. **문서화**: 각 터미널에서 README 동시 업데이트
5. **백업**: 작업 중간 결과물 정기적 커밋

## 🎯 최종 목표

**4개 터미널 병렬 작업으로 v2.1 완성:**
- ✅ 4/8 패키지 → 8/8 패키지 완성 (100%)
- ✅ 4단계 자동화 → 7단계 완전 자동화
- ✅ 개발 속도 300% 향상 (병렬 처리 효과)
- ✅ 코드 품질 향상 (각 영역 전문화)

---
*병렬 Claude Code 개발로 AI News Cast 프로젝트 완성 가속화*