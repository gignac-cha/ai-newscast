# @ai-newscast/core

AI Newscast 프로젝트의 공통 TypeScript 타입 정의 패키지

## 개요

이 패키지는 AI Newscast 모노레포의 모든 패키지에서 사용하는 공통 타입 정의를 제공합니다. 뉴스 크롤링, AI 생성, 오디오 처리, 메타데이터 등 프로젝트 전반의 데이터 구조를 정의합니다.

## 설치

```bash
# pnpm workspace에서 자동으로 설치됨
pnpm install
```

## 사용법

```typescript
import type {
  GeneratedNews,
  NewscastOutput,
  NewscastScriptMetrics,
  NewscastAudioMetrics,
  AudioFileInfo,
} from '@ai-newscast/core';
```

## 주요 타입

### Metrics 타입

모든 JSON 출력 파일에는 `metrics` 필드가 포함됩니다:

- **NewsMetrics**: 뉴스 생성 메트릭스 (news.json)
- **NewscastScriptMetrics**: 스크립트 생성 메트릭스 (newscast-script.json)
- **NewscastAudioMetrics**: 오디오 생성 메트릭스 (audio-files.json)

### 데이터 타입

- **GeneratedNews**: AI 통합 뉴스 데이터
- **NewscastOutput**: 뉴스캐스트 스크립트 출력
- **AudioFileInfo**: 오디오 파일 정보
- **AudioSegment**: 오디오 세그먼트 정보

### 메타데이터 타입

- **NewscastMetadata**: 뉴스캐스트 메타데이터
- **ProcessingStats**: 처리 통계 정보

## 명명 규칙

### camelCase 사용
- 모든 필드명은 camelCase 사용
- 특수 약어는 대문자 유지: `ID`, `HTML`, `JSON`, `URL`

```typescript
// ✅ 올바른 예시
{
  newscastID: "2025-10-05T19-53-26-599Z",
  topicIndex: 1,
  newsURL: "https://example.com",
  contentHTML: "<p>...</p>"
}

// ❌ 잘못된 예시
{
  newscast_id: "...",  // snake_case 금지
  newscastId: "...",   // ID는 대문자
  newsUrl: "..."       // URL은 대문자
}
```

## 빌드

```bash
# TypeScript 컴파일
pnpm build

# 타입 체크
pnpm typecheck
```

## 개발 가이드

상세한 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참조하세요.

## 라이선스

MIT
