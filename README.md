# AI Newscast

> AI 기반 자동 뉴스캐스트 생성 시스템

[![Version](https://img.shields.io/badge/version-3.7.2-blue.svg)](https://github.com/your-repo/ai-newscast)
[![Pipeline](https://img.shields.io/badge/pipeline-7/7%20steps-brightgreen.svg)](PIPELINE_PLAN.md)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/python-3.11+-blue.svg)](https://python.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.0+-blue.svg)](https://typescriptlang.org)
[![Node.js](https://img.shields.io/badge/node.js-24+-green.svg)](https://nodejs.org)

## 프로젝트 개요

빅카인드(BigKinds)에서 실시간 뉴스를 자동으로 수집하고, AI가 뉴스를 분석·통합하여 듀얼 호스트 대화형 뉴스캐스트를 완전 자동으로 생성하는 시스템입니다.

**왜 이 프로젝트를 만들었나요?**
- 매일 쏟아지는 수많은 뉴스를 효율적으로 소비하고 싶었습니다
- 텍스트보다 오디오로 뉴스를 듣는 것이 더 편리합니다
- AI 기술로 뉴스 제작 과정을 완전 자동화할 수 있음을 보여주고 싶었습니다

**무엇을 해결하나요?**
- 뉴스 과부하: 10개 주요 토픽으로 압축하여 핵심만 전달
- 시간 부족: 오디오 뉴스캐스트로 이동 중에도 청취 가능
- 편향 감소: 여러 언론사 기사를 AI가 통합하여 균형잡힌 시각 제공

## 주요 기능

### 완전 자동화 파이프라인 (7단계)
1. **뉴스 토픽 추출**: 빅카인드에서 실시간 트렌딩 토픽 10개 수집
2. **뉴스 목록 수집**: 각 토픽별 최대 100개 뉴스 기사 수집
3. **상세 정보 추출**: 제목, 본문, 요약, 언론사, 기자명 등 완전한 데이터 추출
4. **AI 뉴스 통합**: Google Gemini 2.5 Pro가 여러 기사를 하나로 통합
5. **뉴스캐스트 스크립트 생성**: 듀얼 호스트 대화형 스크립트 자동 작성
6. **TTS 오디오 생성**: Google Cloud TTS Chirp HD로 고품질 음성 생성
7. **오디오 병합**: FFmpeg로 최종 뉴스캐스트 완성

### 웹 플레이어
- React 19 기반 반응형 오디오 플레이어
- 실시간 자막 시스템 (오디오와 동기화)
- 클릭 가능한 뉴스 소스 링크
- 진행률 표시, 재생/일시정지, 시간 표시

### 고급 기능
- GNU Parallel 병렬 처리로 10개 토픽을 동시에 처리
- 중복 제거 알고리즘으로 유니크한 토픽만 선별
- JSON/Markdown 듀얼 포맷 출력
- 단계별 스킵 및 재개 기능

## 빠른 시작

### 사전 요구사항

```bash
# Node.js 24+ 및 pnpm 설치
npm install -g pnpm@10.12.2

# UV (Python 패키지 매니저) 설치
curl -LsSf https://astral.sh/uv/install.sh | sh
export PATH="$HOME/.local/bin:$PATH"

# FFmpeg 설치 (오디오 처리용)
# Ubuntu/Debian:
sudo apt install ffmpeg

# macOS:
brew install ffmpeg

# Windows:
winget install ffmpeg
```

### 설치

```bash
# 저장소 클론
git clone <repository-url> ai-newscast
cd ai-newscast

# 의존성 설치 및 빌드
pnpm install && pnpm build

# 환경 변수 설정
cp .env.example .env
# .env 파일을 열어 API 키 입력
echo "GOOGLE_GEN_AI_API_KEY=your_api_key_here" >> .env
```

### 사용 방법

#### 전체 파이프라인 실행 (추천)

```bash
# 기본 실행 (자동 병렬 처리)
./scripts/run-all.sh

# 병렬 처리 개수 조정
./scripts/run-all.sh --max-concurrency 4

# 특정 단계 건너뛰기
./scripts/run-all.sh --skip newscast-audio --skip newscast

# 기존 출력에서 재개
./scripts/run-all.sh --output-dir output/2025-10-05T19-53-26-599Z
```

#### 단계별 실행

```bash
# 1. 뉴스 토픽 추출
pnpm run:crawler:news-topics

# 2. 뉴스 목록 수집
pnpm run:crawler:news-list

# 3. 상세 정보 추출
pnpm run:crawler:news-details

# 4. AI 뉴스 통합
pnpm run:generator:news

# 5. 뉴스캐스트 스크립트 생성
pnpm run:generator:newscast-script

# 6. TTS 오디오 생성
pnpm run:generator:newscast-audio

# 7. 최종 오디오 병합
pnpm run:generator:newscast
```

#### 웹 플레이어 실행

```bash
cd packages/newscast-web
pnpm dev
# http://localhost:5173 접속
```

## 아키텍처

### 패키지 구조

```
packages/
├── news-crawler/           # 뉴스 크롤링 (Python + TypeScript 듀얼 구현)
├── news-crawler-worker/    # Cloudflare Workers 크롤링 API
├── news-generator/         # AI 뉴스 통합 (Google Gemini)
├── newscast-generator/     # 뉴스캐스트 생성 (스크립트 + TTS + 병합)
├── newscast-generator-worker/ # Cloudflare Workers 생성 API
├── newscast-scheduler-worker/ # 전체 파이프라인 오케스트레이션
├── newscast-latest-id/     # 최신 뉴스캐스트 ID 관리 API
├── newscast-web/           # React 웹 플레이어
└── core/                   # 공통 타입 정의
```

### 기술 스택

- **Python**: UV 패키지 매니저, Typer CLI, requests, lxml
- **TypeScript**: Node.js 24+, Commander.js, experimental type stripping
- **AI**: Google Gemini 2.5 Pro (뉴스 통합), Google Cloud TTS Chirp HD (음성 생성)
- **빌드 도구**: Turbo 모노레포, pnpm 워크스페이스
- **프론트엔드**: React 19, Vite, Radix UI, TanStack Query
- **배포**: Cloudflare Workers, KV 스토리지

### 출력 구조

```
output/2025-10-05T19-53-26-599Z/
├── topic-list.json           # 10개 트렌딩 토픽
├── topic-01/                 # 1순위 토픽
│   ├── news-list.json       # 최대 100개 뉴스
│   ├── news/                # 개별 뉴스 상세 정보
│   ├── news.json            # AI 통합 뉴스 (JSON)
│   ├── news.md              # AI 통합 뉴스 (Markdown)
│   ├── newscast-script.json # 뉴스캐스트 스크립트 (JSON)
│   ├── newscast-script.md   # 뉴스캐스트 스크립트 (Markdown)
│   ├── newscast.mp3         # 최종 뉴스캐스트 오디오
│   └── audio/               # TTS 생성 오디오 파일들
└── topic-02/                 # 2순위 토픽 (동일 구조)
```

## 성능 지표

- **뉴스 토픽 추출**: 0.4초 (10개 유니크 토픽)
- **뉴스 목록 수집**: 토픽당 약 15초 (최대 100개 기사)
- **상세 정보 추출**: 토픽당 2-3분 (전체 본문 추출)
- **AI 뉴스 통합**: 토픽당 45-50초 (Google Gemini)
- **병렬 처리**: 10개 토픽을 120초에 처리 (순차 대비 3.75배 빠름)
- **중복 제거**: 100% 정확도 (30개 → 10개 유니크)

## 문제 해결

### 일반적인 문제

```bash
# UV 설치 확인
which uv  # /home/user/.local/bin/uv 출력 확인

# API 키 확인
echo $GOOGLE_GEN_AI_API_KEY

# FFmpeg 설치 확인
ffmpeg -version
```

### 성능 최적화 팁

- 메모리: 대용량 데이터는 스트리밍 방식으로 처리
- 병렬 처리: 최대 동시 실행 개수를 시스템 코어 수에 맞춰 조정
- 캐싱: TTS 결과는 자동으로 캐시되어 재사용
- 빌드: Turbo가 변경된 패키지만 선택적으로 빌드

## 기여하기

1. 저장소를 Fork 합니다
2. Feature 브랜치를 생성합니다 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add amazing feature'`)
4. 브랜치에 Push 합니다 (`git push origin feature/amazing-feature`)
5. Pull Request를 생성합니다

자세한 개발 가이드는 [CLAUDE.md](CLAUDE.md)를 참조하세요.

## 라이선스

이 프로젝트는 ISC 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참조하세요.

## 감사의 말

- [BigKinds](https://bigkinds.or.kr) - 뉴스 데이터 소스
- [Google AI](https://ai.google.dev/) - Gemini API
- [Google Cloud](https://cloud.google.com/text-to-speech) - TTS API
- [Cloudflare](https://workers.cloudflare.com/) - Workers 플랫폼

---

**Version**: v3.7.2 (2025-07-03)
**개발 가이드**: [CLAUDE.md](CLAUDE.md) 참조
