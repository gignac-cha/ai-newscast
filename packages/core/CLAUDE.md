# Core Package - AI Development Guide

Claude에게: 이 패키지는 AI Newscast 프로젝트의 공통 타입 정의를 제공합니다. 모든 패키지가 참조하는 중심 타입 라이브러리입니다.

## 📋 패키지 개요

**역할**: 프로젝트 전체에서 사용되는 TypeScript 타입 정의 제공
**상태**: ✅ 완성 (v1.0.0)
**의존성**: 없음 (독립 패키지)

## 🏗️ 타입 구조

### 주요 타입 카테고리

```
src/types/
├── news.ts          # 뉴스 크롤링 및 생성 관련 타입
├── voice.ts         # 음성 호스트 및 뉴스캐스트 스크립트 타입
├── audio.ts         # 오디오 파일 및 처리 관련 타입
├── metadata.ts      # 메타데이터 타입
└── index.ts         # 타입 통합 export
```

## 📊 핵심 타입 정의

### 1. Metrics 타입 (v3.7.3+)

모든 JSON 출력에는 metrics 필드가 포함됩니다:

#### NewsMetrics (news-details.json, news.json)
```typescript
export interface NewsMetrics {
  newscastID: string;           // ISO timestamp (2025-10-05T19-53-26-599Z)
  topicIndex: number;           // 1-10
  timing: {
    startedAt: string;          // ISO timestamp
    completedAt: string;        // ISO timestamp
    duration: number;           // milliseconds
    aiGenerationTime: number;   // milliseconds
  };
  input: {
    // ... 입력 데이터 메트릭스
  };
  output: {
    // ... 출력 데이터 메트릭스
  };
  performance: {
    // ... 성능 메트릭스
  };
}
```

#### NewscastScriptMetrics (newscast-script.json)
```typescript
export interface NewscastScriptMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    aiGenerationTime: number;
  };
  input: {
    newsTitle: string;
    newsSummaryLength: number;
    newsContentLength: number;
  };
  output: {
    totalScriptLines: number;
    dialogueLines: number;
    musicLines: number;
    scriptSize: number;
  };
  performance: {
    linesPerSecond: number;
  };
}
```

#### NewscastAudioMetrics (audio-files.json)
```typescript
export interface NewscastAudioMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    ttsGenerationTime: number;
  };
  input: {
    totalScriptLines: number;
    dialogueLines: number;
    musicLines: number;
  };
  output: {
    generatedAudioFiles: number;
    skippedMusicFiles: number;
    failedAudioFiles: number;
    totalAudioSize: number;
  };
  performance: {
    filesPerSecond: number;
    successRate: string;
  };
}
```

### 2. 데이터 출력 구조

모든 JSON 출력은 다음 패턴을 따릅니다:

```typescript
{
  timestamp: string;      // 최상위 타임스탬프
  // ... 데이터 필드들 (camelCase)
  metrics: {
    newscastID: string;
    topicIndex: number;
    // ... 메트릭스 필드들
  }
}
```

## 🎯 명명 규칙 (Naming Conventions)

### camelCase 규칙
- **일반 필드**: camelCase 사용
- **특수 약어**: 모두 대문자로 유지
  - `ID` (not `Id`): newscastID, topicID, hostID
  - `HTML` (not `Html`): newsHTML, contentHTML
  - `JSON` (not `Json`): newsJSON, outputJSON
  - `URL` (not `Url`): newsURL, sourceURL

### 예시
```typescript
// ✅ 올바른 명명
interface NewsOutput {
  newscastID: string;
  topicIndex: number;
  newsURL: string;
  contentHTML: string;
  outputJSON: object;
}

// ❌ 잘못된 명명
interface NewsOutput {
  newscastId: string;    // ID는 대문자
  topic_index: number;   // snake_case 금지
  newsUrl: string;       // URL은 대문자
}
```

## 🔧 개발 가이드라인

### 타입 추가 절차
1. 적절한 카테고리 파일(news.ts, voice.ts, audio.ts 등)에 타입 정의
2. `src/types/index.ts`에서 export
3. `pnpm build`로 TypeScript 컴파일
4. 의존 패키지에서 `@ai-newscast/core`로 import

### 타입 변경 시 주의사항
- **Breaking Change**: 기존 타입 수정 시 모든 의존 패키지 업데이트 필요
- **버전 관리**: 주요 변경사항은 package.json 버전 업데이트
- **문서화**: README.md 및 CLAUDE.md에 변경사항 기록

## 📦 빌드 및 배포

```bash
# TypeScript 컴파일
pnpm build

# 타입 체크
pnpm typecheck

# 의존 패키지 재빌드 (core 변경 후)
pnpm --filter @ai-newscast/news-generator build
pnpm --filter @ai-newscast/newscast-generator build
```

## 🔗 사용하는 패키지

모든 패키지가 core를 참조:
- news-crawler (Python, TypeScript 동시 사용)
- news-crawler-worker
- news-generator
- newscast-generator
- newscast-generator-worker
- newscast-latest-id
- newscast-web

---
*최종 업데이트: 2025-10-06 v3.7.3 - Metrics 타입 추가 (NewscastScriptMetrics, NewscastAudioMetrics)*
