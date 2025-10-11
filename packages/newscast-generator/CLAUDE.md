# Newscast Generator Package - AI Development Guide

## 📋 패키지 역할 및 책임

### 핵심 역할
1. 통합 뉴스를 듀얼 호스트 대화형 스크립트로 변환 (Google Gemini 2.5 Pro)
2. TTS API로 스크립트를 고품질 오디오 파일로 합성 (Google Cloud TTS Chirp HD)
3. Lambda API 호출하여 개별 오디오 파일을 최종 뉴스캐스트로 병합 (FFmpeg)
4. JSON/Markdown 듀얼 포맷 출력

### 구현 상태
- ✅ **완성** - TypeScript 구현
- ✅ 스크립트 생성 (`generate-newscast-script.ts`)
- ✅ 오디오 합성 (`generate-newscast-audio.ts`)
- ✅ 오디오 병합 (`generate-newscast.ts` → Lambda API)
- ✅ Commander.js CLI (`command.ts`)
- ✅ 30개 한국어 음성 시스템 (`config/tts-hosts.json`)

---

## 🏗️ 파일 구조 및 역할

### 핵심 파일
```
packages/newscast-generator/
├── command.ts                      # CLI 엔트리포인트 (Commander.js)
├── generate-newscast-script.ts     # 스크립트 생성 (Gemini API)
├── generate-newscast-audio.ts      # 오디오 합성 (TTS API)
├── generate-newscast.ts            # 오디오 병합 (Lambda API)
├── newscast-generator.ts           # 메인 CLI 진입점
├── runtime-utils.ts                # 런타임 유틸리티 함수
├── types.ts                        # 로컬 타입 정의
└── package.json                    # 의존성 및 scripts
```

### 설정 및 리소스
```
├── config/
│   └── tts-hosts.json             # TTS 음성 모델 설정 (30개)
├── prompts/
│   └── newscast-script.md         # Gemini AI 프롬프트 템플릿
```

---

## 🔧 API 및 함수 시그니처

### 스크립트 생성 (generate-newscast-script.ts)

#### generateNewscastScript()
```typescript
export async function generateNewscastScript(
  options: GenerateNewscastScriptOptions
): Promise<GenerateNewscastScriptResult>

interface GenerateNewscastScriptOptions {
  newsContent: string;              // 통합 뉴스 JSON 문자열
  promptTemplate: string;           // AI 프롬프트 템플릿
  voices: TTSVoices;                // TTS 음성 설정
  apiKey: string;                   // Google Gemini API 키
  programName?: string;             // 프로그램명 (기본: "AI 뉴스캐스트")
  selectHosts?: (voices: TTSVoices) => SelectedHosts;  // 커스텀 호스트 선택
}

interface GenerateNewscastScriptResult {
  newscastScript: NewscastOutput;   // 생성된 스크립트
  stats: {
    startedAt: string;
    completedAt: string;
    elapsedMs: number;
    scriptLines: number;
    hosts: { host1: string; host2: string };
  };
  prompt: string;                   // 사용된 프롬프트
  rawText: string;                  // AI 원본 응답
}
```

### 오디오 합성 (generate-newscast-audio.ts)

#### generateNewscastAudio()
```typescript
export async function generateNewscastAudio(
  scriptFilePath: string,
  outputFolder: string,
  apiKey: string
): Promise<void>
```

**역할**: 스크립트 JSON을 읽어 개별 TTS 오디오 파일 생성

**출력**: `audio/` 폴더에 개별 MP3 파일들 + `audio-files.json`

### 오디오 병합 (generate-newscast.ts)

#### generateNewscast()
```typescript
export async function generateNewscast(
  audioFolder: string,
  outputFile: string,
  apiKey: string
): Promise<void>
```

**역할**: Lambda API 호출하여 개별 오디오 파일을 최종 MP3로 병합

**출력**: `newscast.mp3` + `newscast-audio-info.json`

### 유틸리티 함수 (runtime-utils.ts)

#### selectRandomHosts()
```typescript
export function selectRandomHosts(voices: TTSVoices): SelectedHosts
```

**역할**: 남성 1명 + 여성 1명 랜덤 선택

#### formatAsMarkdown()
```typescript
export function formatAsMarkdown(newscastOutput: NewscastOutput): string
```

**역할**: 스크립트 JSON을 Markdown 형식으로 변환

---

## 🎨 코딩 규칙 (패키지 특화)

### 필수 규칙 (루트 CLAUDE.md 공통 규칙 준수)
- **camelCase**: `newscastID`, `voiceModel` (루트 CLAUDE.md 참조)
- **시간 단위**: 밀리세컨드 기본, 단위 생략 (루트 CLAUDE.md 참조)
- **Nullish Coalescing**: `??` 사용, `||` 금지 (루트 CLAUDE.md 참조)

### 스크립트 생성 규칙

#### MUST: 프롬프트 변수 치환
```typescript
// ✅ CORRECT
const prompt = promptTemplate
  .replace('{program_name}', programName)
  .replace(/{host1_name}/g, selectedHosts.host1.name)
  .replace(/{host1_gender}/g, selectedHosts.host1.gender === 'male' ? '남성' : '여성')
  .replace('{topic}', news.title)
  .replace('{consolidated_content}', news.content);

// ❌ WRONG
const prompt = promptTemplate;  // ❌ 변수 치환 없음
```

#### MUST: JSON 파싱 에러 처리
```typescript
// ✅ CORRECT
const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) ?? text.match(/\{[\s\S]*\}/);

if (!jsonMatch) {
  throw new Error('No valid JSON found in AI response');
}

const parsed: NewscastScript = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);

// ❌ WRONG
const parsed = JSON.parse(response.text());  // ❌ 에러 처리 없음
```

#### MUST: 음성 모델 정보 추가
```typescript
// ✅ CORRECT
const enhancedScript = parsed.script.map((line) => {
  if (line.type === 'dialogue') {
    if (line.role === 'host1') {
      return { ...line, voiceModel: selectedHosts.host1.voiceModel };
    }
    if (line.role === 'host2') {
      return { ...line, voiceModel: selectedHosts.host2.voiceModel };
    }
  }
  return line;
});

// ❌ WRONG
const enhancedScript = parsed.script;  // ❌ 음성 모델 정보 없음
```

### TTS 오디오 생성 규칙

#### MUST: 음악 라인 스킵
```typescript
// ✅ CORRECT
for (const line of script) {
  if (line.type === 'music') {
    console.log(`⏭️ Skipping music line: ${line.content}`);
    continue;  // 음악 라인은 스킵
  }

  // dialogue 라인만 TTS 생성
  await generateTTS(line);
}

// ❌ WRONG
for (const line of script) {
  await generateTTS(line);  // ❌ 음악 라인도 TTS 생성 시도
}
```

#### MUST: 파일명 규칙
```typescript
// ✅ CORRECT
const fileName = `${String(line.order).padStart(3, '0')}-${line.voiceName ?? 'music'}.mp3`;
// 예: 001-music.mp3, 002-김서연.mp3, 003-박진호.mp3

// ❌ WRONG
const fileName = `${line.order}.mp3`;  // ❌ 정렬 불가, 호스트 이름 없음
```

#### MUST: audio-files.json 메타데이터
```typescript
// ✅ CORRECT
const audioFilesMetadata = {
  audioFiles: generatedAudioFiles.map(file => ({
    fileName: file.fileName,
    voiceModel: file.voiceModel,
    voiceName: file.voiceName,
    text: file.text,
    order: file.order,
    durationSeconds: file.durationSeconds,
  })),
  metrics: {
    newscastID: newscastID,
    topicIndex: topicIndex,
    timing: { /* ... */ },
    // ...
  }
};

await writeFile(
  path.join(outputFolder, 'audio', 'audio-files.json'),
  JSON.stringify(audioFilesMetadata, null, 2)
);

// ❌ WRONG
// audio-files.json 생성 안 함 또는 metrics 누락
```

### Lambda API 호출 규칙

#### MUST: API 에러 처리
```typescript
// ✅ CORRECT
const response = await fetch(lambdaURL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ newscast_id, topic_index, dry_run }),
});

if (!response.ok) {
  const errorText = await response.text();
  throw new Error(`Lambda API error: ${response.status} - ${errorText}`);
}

const result = await response.json();

// ❌ WRONG
const response = await fetch(lambdaURL, { /* ... */ });
const result = await response.json();  // ❌ 에러 체크 없음
```

#### MUST: snake_case 요청 (Lambda는 Python)
```typescript
// ✅ CORRECT (Lambda API 요청)
const requestBody = {
  newscast_id: newscastID,     // snake_case
  topic_index: topicIndex,     // snake_case
  dry_run: false               // snake_case
};

// ❌ WRONG
const requestBody = {
  newscastId: newscastID,      // ❌ camelCase (Lambda와 불일치)
  topicIndex: topicIndex,      // ❌ camelCase
};
```

---

## 🚨 에러 처리 방식

### Google Gemini API 에러

```typescript
// ✅ CORRECT
try {
  const result = await generateNewscastScript(options);
  return result;
} catch (error) {
  if (error.message.includes('API key')) {
    console.error('Google Gemini API key 설정 확인 필요');
    throw new Error('Invalid or missing Google Gemini API key');
  } else if (error.message.includes('No valid JSON')) {
    console.error('AI 응답 JSON 파싱 실패');
    throw new Error('Failed to parse AI response as JSON');
  } else {
    console.error('스크립트 생성 오류:', error);
    throw error;
  }
}
```

### TTS API 에러

```typescript
// ✅ CORRECT
try {
  await generateNewscastAudio(scriptFile, outputFolder, apiKey);
  console.log('✓ TTS 오디오 생성 완료');
} catch (error) {
  if (error.message.includes('GOOGLE_CLOUD_API_KEY')) {
    console.error('Google Cloud TTS API key 설정 확인 필요');
    process.exit(1);
  }
  throw error;
}
```

### Lambda API 에러

```typescript
// ✅ CORRECT
try {
  await generateNewscast(audioFolder, outputFile, apiKey);
  console.log('✓ 오디오 병합 완료');
} catch (error) {
  if (error.message.includes('Lambda API')) {
    console.error('Lambda API 호출 실패:', error.message);
    process.exit(1);
  }
  throw error;
}
```

---

## 🔗 다른 패키지와의 의존성

### 의존 관계
- **core**: 공통 타입 정의 import
- **news-generator**: 이 패키지가 news-generator의 출력을 입력으로 사용
- **newscast-generator-worker**: 이 패키지의 함수를 Workers에서 재사용
- **newscast-generator-lambda**: 이 패키지가 Lambda API 호출

### Export (다른 패키지에서 사용)

```typescript
// newscast-generator-worker에서 사용 예시
import {
  generateNewscastScript,
  generateNewscastAudio
} from '@ai-newscast/newscast-generator';

export async function handleScript(newsContent, promptTemplate, voices, apiKey) {
  const result = await generateNewscastScript({
    newsContent,
    promptTemplate,
    voices,
    apiKey,
  });
  return result.newscastScript;
}
```

---

## ⚠️ 주의사항 (MUST/NEVER)

### 호스트 선택 (MUST)

#### MUST: 성별 균형
```typescript
// ✅ CORRECT
export function selectRandomHosts(voices: TTSVoices): SelectedHosts {
  const maleVoices = Object.entries(voices.voices).filter(
    ([_, voice]) => voice.gender === 'male'
  );
  const femaleVoices = Object.entries(voices.voices).filter(
    ([_, voice]) => voice.gender === 'female'
  );

  if (maleVoices.length === 0 || femaleVoices.length === 0) {
    throw new Error('남성 또는 여성 음성 모델 부족');
  }

  const host1 = maleVoices[Math.floor(Math.random() * maleVoices.length)];
  const host2 = femaleVoices[Math.floor(Math.random() * femaleVoices.length)];

  return { host1: { ...host1[1], voiceModel: host1[0] }, host2: { ...host2[1], voiceModel: host2[0] } };
}

// ❌ WRONG
function selectRandomHosts(voices) {
  const allVoices = Object.entries(voices.voices);
  const host1 = allVoices[0];  // ❌ 성별 고려 안 함
  const host2 = allVoices[1];  // ❌ 둘 다 같은 성별 가능
  return { host1, host2 };
}
```

### TTS 파일 생성 (MUST)

#### MUST: 순차 처리 (rate limit)
```typescript
// ✅ CORRECT
for (const line of dialogueLines) {
  await generateTTS(line);
  // TTS API는 rate limit 없지만 순차 처리 권장
}

// ❌ WRONG
await Promise.all(dialogueLines.map(line => generateTTS(line)));  // ⚠️ 동시 호출 (rate limit 주의)
```

#### NEVER: 음악 라인 TTS 생성
```typescript
// ✅ CORRECT
if (line.type === 'music') {
  console.log(`⏭️ Skipping music: ${line.content}`);
  continue;
}

// ❌ WRONG
await generateTTS(line);  // ❌ 음악 라인도 TTS 생성 시도
```

### Lambda API 호출 (MUST)

#### MUST: snake_case 요청 파라미터
```typescript
// ✅ CORRECT (Lambda는 Python)
const requestBody = {
  newscast_id: newscastID,
  topic_index: topicIndex,
  dry_run: false
};

// ❌ WRONG
const requestBody = {
  newscastId: newscastID,  // ❌ camelCase
};
```

#### MUST: Base64 응답 처리
```typescript
// ✅ CORRECT
const result = await response.json();
if (result.audio_base64) {
  const audioBuffer = Buffer.from(result.audio_base64, 'base64');
  await writeFile(outputFile, audioBuffer);
}

// ❌ WRONG
await writeFile(outputFile, result.audio_base64);  // ❌ Base64 디코딩 없음
```

### Metrics 시스템 (MUST)

#### MUST: newscastID와 topicIndex 전파
```typescript
// ✅ CORRECT
// news.json의 metrics에서 읽기
const newsMetrics = JSON.parse(newsContent).metrics;
const newscastID = newsMetrics.newscastID;
const topicIndex = newsMetrics.topicIndex;

// 모든 출력 JSON에 포함
const output = {
  // ... 데이터
  metrics: {
    newscastID: newscastID,
    topicIndex: topicIndex,
    // ...
  }
};

// ❌ WRONG
const newscastID = new Date().toISOString();  // ❌ 새로 생성 (불일치)
```

---

## 📚 참고 문서

- **프로젝트 공통 규칙**: [../../CLAUDE.md](../../CLAUDE.md)
- **Core 타입 정의**: [../core/CLAUDE.md](../core/CLAUDE.md)
- **프롬프트 템플릿**: [prompts/newscast-script.md](prompts/newscast-script.md)
- **음성 설정**: [config/tts-hosts.json](config/tts-hosts.json)

---

*최종 업데이트: 2025-10-11 - Lambda API 통합 및 Metrics 시스템 강화*
