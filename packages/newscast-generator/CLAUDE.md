# Newscast Generator Package - AI Development Guide

Claude에게: 이 패키지는 뉴스캐스트 스크립트 생성 및 오디오 처리를 담당합니다. 사용자 친화적 정보는 README.md를 참조하세요. 이 문서는 스크립트 생성 로직, TTS 통합, 오디오 병합 아키텍처에 집중합니다.

## 🏗️ 아키텍처 및 파일 구조

**핵심 파일 역할:**
- `generate-newscast-script.ts`: 스크립트 생성 순수 함수 (Gemini AI 호출)
- `generate-audio.ts`: TTS 오디오 생성 (Google Cloud TTS API)
- `generate-newscast.ts`: Lambda API 호출로 오디오 병합
- `command.ts`: CLI 인터페이스 (Commander.js)
- `newscast-generator.ts`: 메인 진입점

**의존성 체인:**
1. 스크립트 생성: Gemini 2.5 Pro → NewscastScript JSON
2. 오디오 생성: TTS API → 개별 MP3 파일들
3. 오디오 병합: Lambda API (FFmpeg) → 최종 newscast.mp3

## 🛠️ 기술 스택

### Core Dependencies
- **@google/genai**: Google Gemini 2.5 Pro API 클라이언트
- **commander**: CLI 프레임워크
- **@ai-newscast/core**: 공통 타입 정의

### TypeScript Features
- **Node.js 24+**: experimental type stripping 활용
- **ES Modules**: type: "module" 기반
- **Import Maps**: workspace 프로토콜 사용

## 🚀 주요 파일 구조

### Core Files
```
packages/newscast-generator/
├── command.ts                    # CLI 엔트리포인트 및 명령어 정의
├── generate-newscast-script.ts   # 핵심 스크립트 생성 로직
├── runtime-utils.ts             # 런타임 유틸리티 함수들
├── utils.ts                     # 파일 I/O 및 설정 로딩
├── types.ts                     # 타입 정의 (core 재수출 + 로컬 타입)
└── newscast-generator.ts        # 메인 CLI 진입점
```

### Configuration & Resources
```
├── config/
│   └── tts-hosts.json           # TTS 음성 모델 설정 (30개 한국어 음성)
├── prompts/
│   └── newscast-script.md       # Gemini AI 프롬프트 템플릿
└── package.json                 # 의존성 및 스크립트 설정
```

## 📋 CLI 명령어

### Script Generation
```bash
# 기본 스크립트 생성
node --experimental-strip-types command.ts script \
  -i input/news.json \
  -o output/newscast-script.json

# 출력 형식 지정
node --experimental-strip-types command.ts script \
  -i input/news.json \
  -o output/newscast-script.json \
  -f json \
  -l logs/generation.json
```

### Package Scripts
```bash
# 스크립트 생성만
pnpm run generate:newscast-script

# 개발 모드 (watch)
pnpm run dev
```

## 🤖 AI 스크립트 생성 프로세스

### 1. 입력 데이터 처리
`command.ts`에서 다음 데이터를 로딩:
```typescript
const [newsContent, promptTemplate, voices] = await Promise.all([
  readFile(inputFile, 'utf-8'),        // 통합 뉴스 JSON
  loadPrompt(),                        // AI 프롬프트 템플릿
  loadTTSHosts(),                      // TTS 음성 설정
]);
```

### 2. 호스트 선택 및 프롬프트 생성
`generate-newscast-script.ts`의 핵심 로직:
```typescript
// 랜덤 호스트 선택 (남성 1명 + 여성 1명)
const selectedHosts = selectRandomHosts(voices);

// 프롬프트 템플릿에 데이터 치환
const prompt = promptTemplate
  .replace('{program_name}', programName)
  .replace(/{host1_name}/g, selectedHosts.host1.name)
  .replace(/{host1_gender}/g, selectedHosts.host1.gender === 'male' ? '남성' : '여성')
  .replace(/{host2_name}/g, selectedHosts.host2.name)
  .replace(/{host2_gender}/g, selectedHosts.host2.gender === 'male' ? '남성' : '여성')
  .replace('{topic}', news.title)
  .replace('{main_sources}', mainSources.join(', '))
  .replace('{sources_count}', news.sources_count.toString())
  .replace('{total_articles}', news.input_articles_count.toString())
  .replace('{consolidated_content}', news.content);
```

### 3. Google Gemini API 호출
```typescript
const genAI = new GoogleGenAI({ apiKey });
const response = await genAI.models.generateContent({
  model: 'gemini-2.5-pro',
  contents: prompt,
});
```

### 4. 응답 파싱 및 후처리
```typescript
// JSON 추출 (```json 블록 또는 순수 JSON)
const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) ?? text.match(/\{[\s\S]*\}/);
const parsed: NewscastScript = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);

// 음성 모델 정보 추가
const enhancedScript = parsed.script.map((line) => {
  if (line.type === 'dialogue') {
    if (line.role === 'host1') {
      return { ...line, voice_model: selectedHosts.host1.voice_model };
    }
    if (line.role === 'host2') {
      return { ...line, voice_model: selectedHosts.host2.voice_model };
    }
  }
  return line;
});
```

## 📊 출력 데이터 구조

### JSON 출력 (`newscast-script.json`)
```typescript
interface NewscastOutput {
  title: string;                    // 뉴스캐스트 제목
  program_name: string;             // 프로그램명
  hosts: SelectedHosts;             // 선택된 호스트 정보
  estimated_duration: string;       // 예상 진행시간
  script: ScriptLine[];             // 스크립트 라인 배열
  metadata: {
    total_articles: number;         // 참고 기사 수
    sources_count: number;          // 참고 언론사 수
    main_sources: string[];         // 주요 언론사 목록
    generation_timestamp: string;   // 생성 시간
    total_script_lines: number;     // 스크립트 라인 수
  };
}
```

### Markdown 출력 (`newscast-script.md`)
`runtime-utils.ts`의 `formatAsMarkdown()` 함수로 생성:
- 📋 메타데이터 테이블
- 👥 진행자 정보
- 🎬 스크립트 (번호 + 이모지 + 내용)

## 🎙️ TTS 음성 모델 관리

### `config/tts-hosts.json` 구조
```json
{
  "voices": {
    "ko-KR-Chirp3-HD-Achernar": {
      "name": "김서연",
      "gender": "female",
      "voice_type": "premium_chirp"
    }
  }
}
```

**특징:**
- **30개 한국어 음성**: Google Cloud TTS Chirp HD 프리미엄 모델
- **알파벳 순 정렬**: 천체 이름 기준 정렬
- **성별 구분**: 남성/여성 균등 분배
- **고유 이름**: 중복 없는 한국식 이름 할당

### 호스트 선택 알고리즘
`runtime-utils.ts`의 `selectRandomHosts()`:
1. 성별별 음성 모델 분류
2. 각 성별에서 1명씩 랜덤 선택
3. 호스트 순서 랜덤 결정 (남성 먼저 vs 여성 먼저)

## 🔧 개발 가이드

### 환경 설정
```bash
# 환경변수 설정
export GOOGLE_GEN_AI_API_KEY="your_gemini_api_key"

# 의존성 설치
pnpm install

# 개발 모드 실행
pnpm run dev
```

### 주요 함수들

#### `generateNewscastScript()`
**위치**: `generate-newscast-script.ts`
- **입력**: `GenerateNewscastScriptOptions`
- **출력**: `GenerateNewscastScriptResult`
- **기능**: 전체 스크립트 생성 프로세스 관리

#### `selectRandomHosts()`
**위치**: `runtime-utils.ts`
- **입력**: `TTSVoices`
- **출력**: `SelectedHosts`
- **기능**: 남성 1명 + 여성 1명 랜덤 선택

#### `formatAsMarkdown()`
**위치**: `runtime-utils.ts`
- **입력**: `NewscastOutput`
- **출력**: `string` (Markdown)
- **기능**: JSON을 읽기 쉬운 마크다운으로 변환

### 커스터마이징 포인트

#### 1. 프롬프트 수정
`prompts/newscast-script.md` 파일 편집으로 AI 생성 스타일 변경

#### 2. 음성 모델 추가/변경
`config/tts-hosts.json`에서 음성 모델 설정 수정

#### 3. 호스트 선택 로직 변경
`selectRandomHosts()` 함수 또는 `selectHosts` 옵션 커스터마이징

## 📊 성능 및 통계

### 실행 통계 추적
```typescript
interface GenerateNewscastScriptResult {
  stats: {
    startedAt: string;              // 시작 시간
    completedAt: string;            // 완료 시간
    elapsedMs: number;              // 소요 시간 (ms)
    scriptLines: number;            // 생성된 스크립트 라인 수
    hosts: {                        // 선택된 호스트 이름
      host1: string;
      host2: string;
    };
  };
  prompt: string;                   // 사용된 프롬프트
  rawText: string;                  // AI 원본 응답
}
```

### 로그 출력 예시
```bash
✅ Generated newscast script: output/newscast-script.json
📝 Script lines: 15
🎙️ Hosts: 김서연, 박진호
⏱️ Elapsed: 12.34s
```

## 🚨 에러 처리

### 일반적인 에러 상황
1. **API 키 누락**: `GOOGLE_GEN_AI_API_KEY` 환경변수 필요
2. **잘못된 JSON**: AI 응답에서 유효한 JSON 추출 실패
3. **파일 I/O 오류**: 입력 파일 없음 또는 출력 경로 문제
4. **음성 모델 부족**: 남성 또는 여성 음성 모델 부족

### 에러 처리 패턴
```typescript
try {
  await generateScriptToFiles({ inputFile, outputFile, printFormat, printLogFile });
} catch (error) {
  console.error('❌ Error generating script:', error instanceof Error ? error.message : error);
  process.exit(1);
}
```

## 🔄 향후 개발 계획

### 단기 계획
- [ ] 프롬프트 템플릿 다양화
- [ ] 호스트 선택 알고리즘 개선
- [ ] 음성 특성 기반 호스트 매칭

### 중기 계획
- [ ] 멀티모달 입력 지원 (이미지, 비디오)
- [ ] 실시간 스크립트 생성 API
- [ ] 다국어 지원 확장

---
*최종 업데이트: 2025-09-19 - 스크립트 생성 핵심 기능 완성*