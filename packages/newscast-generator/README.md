# Newscast Generator

AI 기반 뉴스캐스트 스크립트 생성 및 오디오 합성 패키지

## 개요

통합된 뉴스를 듀얼 호스트 대화형 뉴스캐스트 스크립트로 변환하고, Google Cloud TTS로 전문 품질의 오디오를 생성합니다.

## 주요 기능

- **AI 스크립트 생성**: Google Gemini 2.5 Pro가 매력적인 듀얼 호스트 대화 생성
- **TTS 오디오 합성**: Google Cloud TTS Chirp HD (30개 한국어 프리미엄 음성)
- **자동 호스트 선택**: 남성 1명 + 여성 1명 랜덤 매칭
- **다중 포맷 출력**: JSON, Markdown, MP3
- **완전한 파이프라인**: 스크립트 → 오디오 → 병합 (Lambda 경유)

## 빠른 시작

### 설치

```bash
# 루트에서 전체 설치
pnpm install
```

### 스크립트 생성

```bash
# 환경 변수 설정
export GOOGLE_GEN_AI_API_KEY="your_gemini_api_key"

# 스크립트 생성
pnpm --filter @ai-newscast/newscast-generator run generate:script
```

### 오디오 생성

```bash
# 환경 변수 설정
export GOOGLE_CLOUD_API_KEY="your_cloud_tts_api_key"

# TTS 오디오 생성
pnpm --filter @ai-newscast/newscast-generator run generate:audio
```

### 최종 병합

```bash
# Lambda API URL 설정
export AWS_LAMBDA_NEWSCAST_API_URL="your_lambda_url"

# 오디오 병합 (Lambda 경유)
pnpm --filter @ai-newscast/newscast-generator run generate:newscast
```

## 출력 예시

### 스크립트 (newscast-script.json)

```json
{
  "title": "이종섭 전 장관과 한학자 총재 조사 - 통일교 연루 의혹 심화",
  "programName": "AI 뉴스캐스트",
  "hosts": {
    "host1": {
      "name": "김서연",
      "gender": "female",
      "voiceModel": "ko-KR-Chirp3-HD-Achernar"
    },
    "host2": {
      "name": "박진호",
      "gender": "male",
      "voiceModel": "ko-KR-Chirp3-HD-Betelgeuse"
    }
  },
  "estimatedDuration": "3분 30초",
  "script": [
    {
      "type": "music",
      "content": "오프닝 음악 5초",
      "order": 1
    },
    {
      "type": "dialogue",
      "role": "host1",
      "content": "안녕하세요, AI 뉴스캐스트입니다.",
      "order": 2,
      "voiceModel": "ko-KR-Chirp3-HD-Achernar"
    }
  ],
  "metrics": {
    "newscastID": "2025-10-05T19-53-26-599Z",
    "topicIndex": 1,
    "timing": {
      "duration": 12340
    }
  }
}
```

### 오디오 파일 구조

```
output/2025-10-05T19-53-26-599Z/topic-01/
├── newscast-script.json       # 스크립트 JSON
├── newscast-script.md         # 스크립트 Markdown
├── audio/
│   ├── 001-music.mp3          # 오프닝 음악
│   ├── 002-김서연.mp3         # 호스트 1 대사
│   ├── 003-박진호.mp3         # 호스트 2 대사
│   └── audio-files.json       # 오디오 메타데이터
├── newscast.mp3               # 최종 병합 오디오
└── newscast-audio-info.json   # 병합 메타데이터
```

## 기술 스택

- **Node.js**: 24+ (experimental type stripping)
- **AI 모델**: Google Gemini 2.5 Pro (스크립트 생성)
- **TTS**: Google Cloud TTS Chirp HD (30개 한국어 음성)
- **오디오 병합**: AWS Lambda + FFmpeg
- **CLI**: Commander.js

## 음성 시스템

30개 한국어 프리미엄 음성 (Google Cloud TTS Chirp HD):
- 자동 성별 균형 호스트 선택 (남성 1명 + 여성 1명)
- 각 음성에 고유한 한국어 이름 할당
- 매 생성마다 랜덤 선택으로 다양성 확보

음성 설정은 `config/tts-hosts.json`에서 관리합니다.

## 전체 워크플로우

```
통합 뉴스 → 스크립트 생성 → 오디오 합성 → 오디오 병합 → 최종 MP3
(news.json)   (Gemini AI)     (TTS API)   (FFmpeg Lambda)  (newscast.mp3)
```

## 참고사항

- Google Gemini API 키 필요 (환경 변수 `GOOGLE_GEN_AI_API_KEY`)
- Google Cloud TTS API 키 필요 (환경 변수 `GOOGLE_CLOUD_API_KEY`)
- Lambda API URL 필요 (환경 변수 `AWS_LAMBDA_NEWSCAST_API_URL`)
- 프롬프트는 `prompts/newscast-script.md`에서 커스터마이징 가능

## 개발 가이드

상세한 API 명세, 아키텍처 설명, 코딩 규칙은 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 관련 패키지

- **@ai-newscast/newscast-generator-worker**: Cloudflare Workers API 래퍼
- **@ai-newscast/newscast-generator-lambda**: AWS Lambda 오디오 병합기
- **@ai-newscast/core**: 공통 타입 정의

---

*AI Newscast 프로젝트의 일부입니다 - [프로젝트 문서](../../README.md)*
