# Newscast Generator

Google Gemini와 Cloud TTS를 사용한 AI 기반 뉴스캐스트 스크립트 및 오디오 생성

## 🌟 이게 뭔가요?

AI를 사용하여 방송 품질의 스크립트와 오디오를 생성하는 종합 뉴스캐스트 제작 도구입니다. 듀얼 호스트 대화형 뉴스캐스트 스크립트를 생성하고 전문 오디오 파일로 합성합니다.

## ✨ 핵심 기능

- **AI 스크립트 생성**: Google Gemini 2.5 Pro가 매력적인 듀얼 호스트 대화 생성
- **TTS 오디오 합성**: Google Cloud TTS Chirp HD (30개 한국어 프리미엄 음성)
- **완전한 파이프라인**: 스크립트 → 오디오 → 병합 (Lambda 경유)
- **CLI 인터페이스**: Commander.js 기반 명령줄 도구
- **다중 형식 출력**: JSON, Markdown, MP3

## 🚀 빠른 시작

### 뉴스캐스트 스크립트 생성

```bash
# 통합 뉴스에서 스크립트 생성
node --experimental-strip-types command.ts script \
  -i input/news.json \
  -o output/newscast-script.json

# 또는 pnpm 스크립트 사용
pnpm run generate:newscast-script
```

### 오디오 파일 생성

```bash
# 스크립트에서 TTS 오디오 생성
node --experimental-strip-types command.ts audio \
  -i output/newscast-script.json \
  -o output/audio/

# 또는 pnpm 스크립트 사용
pnpm run generate:newscast-audio
```

### 오디오 병합 (Lambda)

```bash
# Lambda API 호출하여 오디오 파일 병합
# (generate-newscast.ts가 처리)
```

## 📊 전체 워크플로우

```
통합 뉴스 → 스크립트 생성 → 오디오 합성 → 오디오 병합 → 최종 MP3
 (news.json)   (Gemini AI)     (TTS API)   (FFmpeg Lambda)  (newscast.mp3)
```

## 🎙️ 음성 시스템

30개 한국어 프리미엄 음성 (Google Cloud TTS Chirp HD):
- 자동 성별 균형 호스트 선택 (남성 1명 + 여성 1명)
- 각 음성에 고유한 한국어 이름 할당
- 각 생성마다 다양성을 위한 랜덤 선택

## 🎯 출력 구조

```
output/{newscast-id}/topic-{NN}/
├── newscast-script.json       # TTS 메타데이터 포함 스크립트
├── newscast-script.md         # 사람이 읽기 쉬운 스크립트
├── audio/
│   ├── 001-music.mp3          # 오프닝 음악
│   ├── 002-host1.mp3          # 호스트 1 대사
│   ├── 003-host2.mp3          # 호스트 2 대사
│   └── ...                    # 더 많은 세그먼트
├── newscast.mp3               # 최종 병합된 오디오
└── newscast-audio-info.json   # 병합 메타데이터
```

## 🔧 설정

```bash
# API 키 설정
export GOOGLE_GEN_AI_API_KEY="your_gemini_api_key"
export GOOGLE_CLOUD_API_KEY="your_cloud_tts_api_key"
export AWS_LAMBDA_NEWSCAST_API_URL="your_lambda_url"
```

## 📚 더 알아보기

- **전체 문서**: [CLAUDE.md](./CLAUDE.md) 참조
- **음성 설정**: `config/tts-hosts.json`
- **프롬프트**: `prompts/newscast-script.md`

## 🔗 관련 패키지

- **@ai-newscast/newscast-generator-worker**: Cloudflare Workers API 래퍼
- **@ai-newscast/newscast-generator-lambda**: AWS Lambda 오디오 병합기
- **@ai-newscast/core**: 공유 타입

---

Google Gemini 2.5 Pro + Google Cloud TTS Chirp HD로 구동
