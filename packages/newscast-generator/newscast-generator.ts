#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';

interface GeneratedNews {
  title: string;
  summary: string;
  content: string;
  sources_count: number;
  sources: string[];
  generation_timestamp: string;
  input_articles_count: number;
}

interface TTSVoices {
  voices: Record<string, {
    name: string;
    gender: string;
    description: string;
    voice_type: string;
  }>;
}

interface SelectedHosts {
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
}

interface ScriptLine {
  type: 'dialogue' | 'music';
  role: string;
  name: string;
  content: string;
}

interface NewscastScript {
  title: string;
  program_name: string;
  estimated_duration: string;
  script: ScriptLine[];
}

interface NewscastOutput {
  title: string;
  program_name: string;
  hosts: SelectedHosts;
  estimated_duration: string;
  script: ScriptLine[];
  metadata: {
    total_articles: number;
    sources_count: number;
    main_sources: string[];
    generation_timestamp: string;
    total_script_lines: number;
  };
}

async function loadPrompt(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'newscast-script.md');
  return await readFile(promptPath, 'utf-8');
}

async function loadTTSHosts(): Promise<TTSVoices> {
  const hostsPath = join(import.meta.dirname, 'config', 'tts-hosts.json');
  const content = await readFile(hostsPath, 'utf-8');
  return JSON.parse(content);
}

function getVoicesByGender(voices: TTSVoices): { male: string[], female: string[] } {
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

function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function selectRandomHosts(voices: TTSVoices): SelectedHosts {
  const { male, female } = getVoicesByGender(voices);
  
  if (male.length === 0 || female.length === 0) {
    throw new Error('남성 또는 여성 음성 모델이 부족합니다.');
  }
  
  // 랜덤으로 성별 순서 결정
  const isMaleFirst = Math.random() < 0.5;
  
  const selectedMale = randomChoice(male);
  const selectedFemale = randomChoice(female);
  
  const host1 = isMaleFirst 
    ? { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' }
    : { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' };
    
  const host2 = isMaleFirst
    ? { voice_model: selectedFemale, name: voices.voices[selectedFemale].name, gender: 'female' }
    : { voice_model: selectedMale, name: voices.voices[selectedMale].name, gender: 'male' };
  
  return { host1, host2 };
}

async function generateScript(
  inputFile: string,
  outputFile: string,
  printFormat: string = 'text',
  printLogFile?: string
): Promise<void> {
  const startTime = Date.now();

  // API key 확인
  const apiKey = process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GENAI_API_KEY environment variable is required');
    process.exit(1);
  }

  // 입력 파일 확인
  if (!existsSync(inputFile)) {
    console.error(`Error: Input file does not exist: ${inputFile}`);
    process.exit(1);
  }

  // 뉴스 데이터 로드
  const newsContent = await readFile(inputFile, 'utf-8');
  const newsData: GeneratedNews = JSON.parse(newsContent);

  // TTS 호스트 설정 로드 및 랜덤 선택
  const ttsVoices = await loadTTSHosts();
  const selectedHosts = selectRandomHosts(ttsVoices);

  // 프롬프트 템플릿 로드 및 치환
  const promptTemplate = await loadPrompt();
  const mainSources = newsData.sources.slice(0, 5);
  
  const prompt = promptTemplate
    .replace('{program_name}', '오늘의 뉴스 브리핑')
    .replace(/{host1_name}/g, selectedHosts.host1.name)
    .replace(/{host1_gender}/g, selectedHosts.host1.gender === 'male' ? '남성' : '여성')
    .replace(/{host2_name}/g, selectedHosts.host2.name)
    .replace(/{host2_gender}/g, selectedHosts.host2.gender === 'male' ? '남성' : '여성')
    .replace('{topic}', newsData.title)
    .replace('{main_sources}', mainSources.join(', '))
    .replace('{sources_count}', newsData.sources_count.toString())
    .replace('{total_articles}', newsData.input_articles_count.toString())
    .replace('{consolidated_content}', newsData.content);

  // Google AI 초기화
  const genAI = new GoogleGenAI({ apiKey });

  try {
    // 스크립트 생성
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    const text = response.text ?? '';

    // JSON 응답 파싱
    const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in generated content');
    }

    const parsed: NewscastScript = JSON.parse(jsonMatch[1] || jsonMatch[0]);

    // script 배열의 각 항목에 voice_model 정보 추가
    const enhancedScript = parsed.script.map(line => {
      if (line.type === 'dialogue') {
        if (line.role === 'host1') {
          return { ...line, voice_model: selectedHosts.host1.voice_model };
        } else if (line.role === 'host2') {
          return { ...line, voice_model: selectedHosts.host2.voice_model };
        }
      }
      return line;
    });

    // 출력 데이터 생성
    const newscastOutput: NewscastOutput = {
      title: parsed.title,
      program_name: parsed.program_name,
      hosts: selectedHosts,
      estimated_duration: parsed.estimated_duration,
      script: enhancedScript,
      metadata: {
        total_articles: newsData.input_articles_count,
        sources_count: newsData.sources_count,
        main_sources: mainSources,
        generation_timestamp: new Date().toISOString(),
        total_script_lines: enhancedScript.length,
      }
    };

    // 출력 디렉터리 생성
    await mkdir(dirname(outputFile), { recursive: true });

    // JSON 출력 저장
    await writeFile(outputFile, JSON.stringify(newscastOutput, null, 2));

    // 마크다운 출력 저장
    const markdownFile = outputFile.replace('.json', '.md');
    const markdownContent = formatAsMarkdown(newscastOutput);
    await writeFile(markdownFile, markdownContent);

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

    // 로그 출력 생성
    const logOutput = {
      timestamp: new Date().toISOString(),
      'elapsed-time': `${elapsedSeconds}s`,
      'script-lines': enhancedScript.length,
      'hosts': `${selectedHosts.host1.name}, ${selectedHosts.host2.name}`,
      'output-file': outputFile,
    };

    // 로그 출력
    if (printFormat === 'json') {
      console.log(JSON.stringify(logOutput, null, 2));
    } else {
      console.log(`✅ Generated newscast script: ${outputFile}`);
      console.log(`🎙️ Hosts: ${selectedHosts.host1.name} (${selectedHosts.host1.gender}), ${selectedHosts.host2.name} (${selectedHosts.host2.gender})`);
      console.log(`📝 Script lines: ${enhancedScript.length} in ${elapsedSeconds}s`);
    }

    // 로그 파일 저장
    if (printLogFile) {
      await mkdir(dirname(printLogFile), { recursive: true });
      await writeFile(printLogFile, JSON.stringify(logOutput, null, 2));
    }
  } catch (error) {
    console.error('Error generating newscast script:', error);
    process.exit(1);
  }
}

function formatAsMarkdown(newscast: NewscastOutput): string {
  const scriptText = newscast.script
    .map((line, index) => {
      const seq = (index + 1).toString().padStart(3, '0');
      if (line.type === 'music') {
        return `### ${seq}. 🎵 ${line.name}
> *${line.content}*`;
      } else {
        const voiceModel = 'voice_model' in line ? ` \`${line.voice_model}\`` : '';
        const genderIcon = line.name === newscast.hosts.host1.name 
          ? (newscast.hosts.host1.gender === 'male' ? '👨‍💼' : '👩‍💼')
          : (newscast.hosts.host2.gender === 'male' ? '👨‍💼' : '👩‍💼');
        return `### ${seq}. ${genderIcon} ${line.name}${voiceModel}
> "${line.content}"`;
      }
    })
    .join('\n\n');

  return `# 🎙️ ${newscast.title}

> **${newscast.program_name} 뉴스캐스트 스크립트**  
> 📅 생성일시: ${new Date(newscast.metadata.generation_timestamp).toLocaleString('ko-KR')}  
> ⏱️ 예상 진행시간: ${newscast.estimated_duration}

## 👥 진행자 정보

| 구분 | 이름 | 성별 | 음성 모델 |
|------|------|------|-----------|
| **호스트 1** | ${newscast.hosts.host1.name} | ${newscast.hosts.host1.gender === 'male' ? '남성' : '여성'} | \`${newscast.hosts.host1.voice_model}\` |
| **호스트 2** | ${newscast.hosts.host2.name} | ${newscast.hosts.host2.gender === 'male' ? '남성' : '여성'} | \`${newscast.hosts.host2.voice_model}\` |

## 📊 메타데이터

| 항목 | 내용 |
|------|------|
| **참고 기사 수** | ${newscast.metadata.total_articles}개 |
| **참고 언론사 수** | ${newscast.metadata.sources_count}개사 |
| **주요 언론사** | ${newscast.metadata.main_sources.join(', ')} |
| **총 스크립트 라인** | ${newscast.metadata.total_script_lines}개 |

---

## 🎬 뉴스캐스트 스크립트

${scriptText}

---

*🤖 AI 뉴스캐스트 시스템으로 생성된 스크립트입니다.*
`;
}

async function main() {
  const program = new Command();

  program
    .name('newscast-generator')
    .description('AI-powered newscast script generator with TTS voice selection')
    .version('1.0.0');

  program
    .command('script')
    .description('Generate newscast script from consolidated news')
    .requiredOption('-i, --input-file <path>', 'Input JSON file containing consolidated news')
    .requiredOption('-o, --output-file <path>', 'Output file path for generated script')
    .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
    .option('-l, --print-log-file <path>', 'File to write JSON log output')
    .action(async (options) => {
      const { inputFile, outputFile, printFormat, printLogFile } = options;
      await generateScript(inputFile, outputFile, printFormat, printLogFile);
    });

  program
    .command('audio')
    .description('Generate audio from newscast script (TTS)')
    .requiredOption('-i, --input-file <path>', 'Input newscast script JSON file')
    .requiredOption('-o, --output-folder <path>', 'Output folder for audio files')
    .action(async (options) => {
      console.log('🚧 Audio generation not yet implemented');
      console.log(`Input: ${options.inputFile}`);
      console.log(`Output: ${options.outputFolder}`);
    });

  program
    .command('newscast')
    .description('Compile full newscast (script + audio + effects)')
    .requiredOption('-i, --input-file <path>', 'Input newscast script JSON file')
    .requiredOption('-o, --output-file <path>', 'Output newscast audio file')
    .action(async (options) => {
      console.log('🚧 Newscast compilation not yet implemented');
      console.log(`Input: ${options.inputFile}`);
      console.log(`Output: ${options.outputFile}`);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}