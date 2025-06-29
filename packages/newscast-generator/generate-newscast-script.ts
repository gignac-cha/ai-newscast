import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { existsSync } from 'fs';
import type { GeneratedNews, NewscastScript, NewscastOutput } from './types.ts';
import { loadPrompt, loadTTSHosts, selectRandomHosts, formatAsMarkdown } from './utils.ts';

export async function generateScript(
  inputFile: string,
  outputFile: string,
  printFormat: string = 'text',
  printLogFile?: string
): Promise<void> {
  const startTime = Date.now();

  // API key 확인
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GEN_AI_API_KEY environment variable is required');
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