import fs from 'fs/promises';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import { config } from 'dotenv';

config();

interface ConsolidatedNews {
  topic: string;
  total_articles: number;
  sources: string[];
  consolidated_content: string;
  original_timestamp: string;
  consolidation_timestamp: string;
}

interface VoiceConfig {
  name: string;
  gender: string;
  description: string;
  role: string;
  voice_type: string;
}

interface TTSVoices {
  voices: Record<string, VoiceConfig>;
  default_newscast_hosts: {
    host1: {
      voice_model: string;
      name: string;
      gender: string;
    };
    host2: {
      voice_model: string;
      name: string;
      gender: string;
    };
  };
  voice_selection_strategy: Record<string, string[]>;
  metadata: {
    created: string;
    description: string;
    total_voices: number;
    default_program: string;
  };
}

interface DialogueLine {
  speaker: string;
  voice_model: string;
  text: string;
  sequence: number;
  type: 'dialogue' | 'opening_music' | 'closing_music' | 'background_music';
}

interface NewscastScript {
  title: string;
  program_name: string;
  hosts: {
    host1: {
      name: string;
      voice_model: string;
      gender: string;
    };
    host2: {
      name: string;
      voice_model: string;
      gender: string;
    };
  };
  opening: string;
  main_content: string;
  closing: string;
  dialogue_lines: DialogueLine[];
  metadata: {
    total_articles: number;
    sources_count: number;
    main_sources: string[];
    generation_timestamp: string;
    estimated_duration: string;
    total_dialogue_lines: number;
  };
}

const apiKey = process.env.GOOGLE_AI_API_KEY;
if (!apiKey) {
  throw new Error('GOOGLE_AI_API_KEY가 설정되지 않았습니다. .env 파일을 확인해주세요.');
}

const genai = new GoogleGenAI({ apiKey });

// 음성 모델에서 성별별로 분류
function getVoiceModelsByGender(voices: TTSVoices): { male: string[], female: string[] } {
  const male: string[] = [];
  const female: string[] = [];
  
  for (const [voiceModel, config] of Object.entries(voices.voices)) {
    if (config.gender === 'male') {
      male.push(voiceModel);
    } else if (config.gender === 'female') {
      female.push(voiceModel);
    }
  }
  
  return { male, female };
}

// 배열에서 랜덤 요소 선택
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

// 랜덤 진행자 설정 생성
function generateRandomHosts(voices: TTSVoices): TTSVoices {
  const { male, female } = getVoiceModelsByGender(voices);
  
  if (male.length === 0 || female.length === 0) {
    throw new Error('남성 또는 여성 음성 모델이 부족합니다.');
  }
  
  // 랜덤으로 성별 순서 결정 (50% 확률)
  const isMaleFirst = Math.random() < 0.5;
  
  // 각 성별에서 랜덤 음성 모델 선택
  const selectedMale = randomChoice(male);
  const selectedFemale = randomChoice(female);
  
  // 랜덤 순서로 host1, host2 배정
  const host1 = isMaleFirst 
    ? { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' as const }
    : { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' as const };
    
  const host2 = isMaleFirst
    ? { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' as const }
    : { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' as const };
  
  // 새로운 진행자 설정으로 voices 업데이트
  const updatedVoices = {
    ...voices,
    default_newscast_hosts: { host1, host2 }
  };
  
  console.log(`   🎲 랜덤 진행자 선택:`);
  console.log(`      Host1: ${host1.name} (${host1.gender === 'male' ? '남성' : '여성'}) - ${host1.voice_model}`);
  console.log(`      Host2: ${host2.name} (${host2.gender === 'male' ? '남성' : '여성'}) - ${host2.voice_model}`);
  console.log(`   ✅ 성별 균형 확인: ${host1.gender === 'male' ? '남성' : '여성'} + ${host2.gender === 'male' ? '남성' : '여성'}`);
  
  return updatedVoices;
}

// TTS 음성 설정 로드
async function loadTTSVoices(): Promise<TTSVoices> {
  const voicesContent = await fs.readFile('tts-voices.json', 'utf-8');
  const voices = JSON.parse(voicesContent) as TTSVoices;
  
  // 랜덤 진행자 설정 생성
  const randomizedVoices = generateRandomHosts(voices);
  
  return randomizedVoices;
}

async function generateNewscastScript(newsData: ConsolidatedNews, voices: TTSVoices): Promise<string> {
  const host1 = voices.default_newscast_hosts.host1;
  const host2 = voices.default_newscast_hosts.host2;
  
  const prompt = `당신은 전문 뉴스캐스트 스크립트 작가입니다. 다음 뉴스 정보를 바탕으로 두 명의 진행자가 대화하는 형식의 3-4분 분량 뉴스캐스트 스크립트를 작성해주세요.

프로그램명: "${voices.metadata.default_program}"
진행자: ${host1.name}(${host1.gender === 'male' ? '남성' : '여성'}), ${host2.name}(${host2.gender === 'male' ? '남성' : '여성'})

주제: ${newsData.topic}
참고 언론사: ${newsData.sources.slice(0, 5).join(', ')} 등 ${newsData.sources.length}개 언론사
총 기사 수: ${newsData.total_articles}개

뉴스 내용:
${newsData.consolidated_content}

다음 형식으로 작성해주세요:

**오프닝:**
- 김민준과 이서연이 자연스럽게 인사하고 프로그램 소개
- 오늘의 주요 뉴스 주제 소개
- 참고한 언론사 수 언급으로 신뢰도 확보

**본문:**
- 두 진행자가 번갈아가며 뉴스 내용 전달
- 중요한 부분에서는 서로 질문하고 답변하는 대화 형식
- 핵심 인물과 기관명은 정확한 발음 표기 (예: 김민재(김-민-재))
- 자연스러운 대화체로 친근하면서도 전문적인 톤 유지

**클로징:**
- 두 진행자가 함께 뉴스 요약
- 시청자들에게 감사 인사 및 다음 방송 예고

대화 형식 예시:
${host1.name}: (내용)
${host2.name}: (내용)
${host1.name}: (내용)

전체적으로 두 진행자의 케미가 느껴지도록 자연스럽고 유쾌한 대화로 구성해주세요.`;

  const response = await genai.models.generateContent({
    model: 'gemini-2.5-pro-preview-03-25',
    contents: [{ role: 'user', parts: [{ text: prompt }] }]
  });
  return response.text?.trim() || '';
}

function parseScriptSections(scriptText: string): { opening: string; main_content: string; closing: string } {
  // 전체 스크립트를 main_content로 처리
  // AI가 이미 대화 형식으로 완전한 스크립트를 생성했으므로 별도 파싱 불필요
  return {
    opening: '',
    main_content: scriptText,
    closing: ''
  };
}

function parseDialogueLines(scriptText: string, voices: TTSVoices): DialogueLine[] {
  const lines: DialogueLine[] = [];
  const scriptLines = scriptText.split('\n');
  
  let sequence = 1;
  const host1 = voices.default_newscast_hosts.host1;
  const host2 = voices.default_newscast_hosts.host2;
  
  // 오프닝 음악 추가
  lines.push({
    speaker: 'opening_music',
    voice_model: '',
    text: '오프닝 시그널 음악',
    sequence: sequence++,
    type: 'opening_music'
  });
  
  for (const line of scriptLines) {
    const trimmed = line.trim();
    
    // **김민준:** 또는 **이서연:** 형태의 대사 라인 찾기
    const speakerMatch = trimmed.match(/^\*\*(.+?):\*\*\s*(.+)$/);
    if (speakerMatch) {
      const speakerName = speakerMatch[1].trim();
      const dialogueText = speakerMatch[2].trim();
      
      if (dialogueText && dialogueText.length > 0) {
        // 화자 이름에 따라 음성 모델 결정
        let voiceModel = '';
        if (speakerName === host1.name) {
          voiceModel = host1.voice_model;
        } else if (speakerName === host2.name) {
          voiceModel = host2.voice_model;
        } else {
          // 알 수 없는 화자인 경우 기본값 사용
          console.warn(`알 수 없는 화자: ${speakerName}, 기본 음성 모델 사용`);
          voiceModel = host1.voice_model;
        }
        
        lines.push({
          speaker: speakerName,
          voice_model: voiceModel,
          text: dialogueText,
          sequence: sequence++,
          type: 'dialogue'
        });
      }
    }
  }
  
  // 클로징 음악 추가
  lines.push({
    speaker: 'closing_music',
    voice_model: '',
    text: '클로징 시그널 음악',
    sequence: sequence++,
    type: 'closing_music'
  });
  
  console.log(`   📝 대사 라인 파싱 완료: ${lines.length}개 라인 (음악 포함)`);
  
  return lines;
}

function estimateDuration(text: string): string {
  // 한국어 기준 분당 약 300-400자 읽기 속도
  const charactersPerMinute = 350;
  const minutes = Math.ceil(text.length / charactersPerMinute);
  return `약 ${minutes}분`;
}

async function createNewscastScript(newsData: ConsolidatedNews, voices: TTSVoices): Promise<NewscastScript> {
  console.log('🎙️ 뉴스캐스트 스크립트 생성 중...');
  const startTime = performance.now();

  const scriptText = await generateNewscastScript(newsData, voices);

  const aiTime = performance.now() - startTime;

  // 대사 라인 파싱
  console.log('📋 대사 라인 파싱 중...');
  const parseStartTime = performance.now();
  const dialogueLines = parseDialogueLines(scriptText, voices);
  const parseTime = performance.now() - parseStartTime;

  // 메인 언론사 추출 (상위 5개)
  const mainSources = newsData.sources.slice(0, 5);

  const host1 = voices.default_newscast_hosts.host1;
  const host2 = voices.default_newscast_hosts.host2;

  const newscastScript: NewscastScript = {
    title: newsData.topic,
    program_name: voices.metadata.default_program,
    hosts: {
      host1: {
        name: host1.name,
        voice_model: host1.voice_model,
        gender: host1.gender
      },
      host2: {
        name: host2.name,
        voice_model: host2.voice_model,
        gender: host2.gender
      }
    },
    opening: '',
    main_content: scriptText,
    closing: '',
    dialogue_lines: dialogueLines,
    metadata: {
      total_articles: newsData.total_articles,
      sources_count: newsData.sources.length,
      main_sources: mainSources,
      generation_timestamp: new Date().toISOString(),
      estimated_duration: estimateDuration(scriptText),
      total_dialogue_lines: dialogueLines.length
    }
  };

  console.log(`   ⏱️  AI 스크립트 생성: ${aiTime.toFixed(1)}ms`);
  console.log(`   ⏱️  대사 라인 파싱: ${parseTime.toFixed(1)}ms`);
  console.log(`   📝 스크립트 길이: ${scriptText.length}자`);
  console.log(`   🕐 예상 읽기 시간: ${newscastScript.metadata.estimated_duration}`);
  console.log(`   👥 진행자: ${newscastScript.hosts.host1.name} (${newscastScript.hosts.host1.voice_model}), ${newscastScript.hosts.host2.name} (${newscastScript.hosts.host2.voice_model})`);
  console.log(`   🎬 총 대사 라인: ${dialogueLines.length}개`);

  return newscastScript;
}

async function saveNewscastScript(script: NewscastScript, topicFolderPath: string): Promise<void> {
  const startTime = performance.now();

  // JSON 형태로 저장
  const jsonPath = path.join(topicFolderPath, 'newscast-script.json');
  await fs.writeFile(jsonPath, JSON.stringify(script, null, 2), 'utf-8');

  // 읽기 쉬운 텍스트 형태로 저장
  const textContent = `# ${script.title}

## ${script.program_name} 뉴스캐스트 스크립트
진행자: ${script.hosts.host1.name} (${script.hosts.host1.voice_model}), ${script.hosts.host2.name} (${script.hosts.host2.voice_model})
생성 시간: ${script.metadata.generation_timestamp}
예상 진행 시간: ${script.metadata.estimated_duration}
참고 자료: ${script.metadata.total_articles}개 기사 (${script.metadata.sources_count}개 언론사)
주요 언론사: ${script.metadata.main_sources.join(', ')}
총 대사 라인: ${script.metadata.total_dialogue_lines}개

---

${script.main_content}

---

## 대사별 TTS 정보 (Google TTS API용)

${script.dialogue_lines.map(line => 
  `${line.sequence.toString().padStart(3, '0')}. [${line.speaker}] ${line.voice_model}
     "${line.text}"`
).join('\n\n')}
`;

  const txtPath = path.join(topicFolderPath, 'newscast-script.txt');
  await fs.writeFile(txtPath, textContent, 'utf-8');

  const saveTime = performance.now() - startTime;
  console.log(`   💾 파일 저장: ${saveTime.toFixed(1)}ms`);
  console.log(`   📁 저장 위치:`);
  console.log(`     - ${jsonPath}`);
  console.log(`     - ${txtPath}`);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length !== 2) {
    console.error('사용법: node --experimental-transform-types generate-podcast-script.ts <bigkinds-folder> <topic-number>');
    console.error('예시: node --experimental-transform-types generate-podcast-script.ts bigkinds/2025-06-20T23:19:18.489131 1');
    process.exit(1);
  }

  const [bigkindsFolder, topicNumber] = args;
  const topicFolderPath = path.join(bigkindsFolder, `topic-${topicNumber.padStart(2, '0')}`);
  const newsJsonPath = path.join(topicFolderPath, 'news.json');

  try {
    const totalStartTime = performance.now();

    // 통합 뉴스 데이터 로드
    console.log('📄 통합 뉴스 데이터 로딩 중...');
    const loadStartTime = performance.now();
    
    const newsContent = await fs.readFile(newsJsonPath, 'utf-8');
    const newsData: ConsolidatedNews = JSON.parse(newsContent);
    
    const loadTime = performance.now() - loadStartTime;
    console.log(`   ⏱️  파일 로드: ${loadTime.toFixed(1)}ms`);
    console.log(`   📊 주제: ${newsData.topic}`);
    console.log(`   📰 총 기사: ${newsData.total_articles}개`);
    console.log(`   🏢 참고 언론사: ${newsData.sources.length}개`);

    // TTS 음성 설정 로드
    console.log('\n🎤 TTS 음성 설정 로딩 중...');
    const voiceLoadStart = performance.now();
    const voices = await loadTTSVoices();
    const voiceLoadTime = performance.now() - voiceLoadStart;
    console.log(`   ⏱️  음성 설정 로드: ${voiceLoadTime.toFixed(1)}ms`);
    console.log(`   🎯 사용 가능한 Chirp 음성: ${voices.metadata.total_voices}개`);

    // 뉴스캐스트 스크립트 생성
    const script = await createNewscastScript(newsData, voices);

    // 결과 저장
    console.log('\n💾 뉴스캐스트 스크립트 저장 중...');
    await saveNewscastScript(script, topicFolderPath);

    const totalTime = performance.now() - totalStartTime;
    console.log(`\n✅ 뉴스캐스트 스크립트 생성 완료!`);
    console.log(`   🎬 프로그램: ${script.program_name}`);
    console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);

  } catch (error) {
    console.error('❌ 오류 발생:', error);
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인 
const isMainModule = process.argv[1] && process.argv[1].endsWith('generate-newscast-script.ts');
if (isMainModule) {
  main();
}