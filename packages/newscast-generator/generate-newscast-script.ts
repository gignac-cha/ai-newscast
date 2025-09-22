import { GoogleGenAI } from '@google/genai';
import type { GeneratedNews, NewscastOutput, NewscastScript, SelectedHosts } from './types.ts';
import type { TTSVoices } from './types.ts';
import { formatAsMarkdown, selectRandomHosts } from './runtime-utils.ts';

export interface GenerateNewscastScriptOptions {
  news: GeneratedNews;
  promptTemplate: string;
  voices: TTSVoices;
  apiKey: string;
  programName?: string;
  model?: string;
  selectHosts?: (voices: TTSVoices) => SelectedHosts;
  now?: () => Date;
}

export interface GenerateNewscastScriptResult {
  output: NewscastOutput;
  markdown: string;
  stats: {
    startedAt: string;
    completedAt: string;
    elapsedMs: number;
    scriptLines: number;
    hosts: {
      host1: string;
      host2: string;
    };
  };
  prompt: string;
  rawText: string;
}

export async function generateNewscastScript({
  news,
  promptTemplate,
  voices,
  apiKey,
  programName = 'AI 뉴스캐스트',
  model = 'gemini-2.5-pro',
  selectHosts: selectHostsFn,
  now = () => new Date(),
}: GenerateNewscastScriptOptions): Promise<GenerateNewscastScriptResult> {
  const startTime = Date.now();
  console.log(`[NEWSCAST_SCRIPT START] ${new Date().toISOString()}`);

  if (!apiKey) {
    console.error(`[NEWSCAST_SCRIPT ERROR] Google AI API key is required`);
    throw new Error('Google AI API key is required');
  }

  if (!news) {
    console.error(`[NEWSCAST_SCRIPT ERROR] Generated news data is required`);
    throw new Error('Generated news data is required');
  }

  console.log(`[NEWSCAST_SCRIPT INPUT] News title: "${news.title}", sources: ${news.sources_count}, articles: ${news.input_articles_count}`);

  if (!promptTemplate) {
    console.error(`[NEWSCAST_SCRIPT ERROR] Prompt template is required`);
    throw new Error('Prompt template is required');
  }

  if (!voices) {
    console.error(`[NEWSCAST_SCRIPT ERROR] TTS voices configuration is required`);
    throw new Error('TTS voices configuration is required');
  }

  console.log(`[NEWSCAST_SCRIPT HOSTS] Selecting hosts from ${Object.keys(voices).length} available voices`);
  const startTime_Date = now();
  const selectedHosts = selectHostsFn ? selectHostsFn(voices) : selectRandomHosts(voices);
  console.log(`[NEWSCAST_SCRIPT HOSTS] Selected hosts: ${selectedHosts.host1.name} (${selectedHosts.host1.gender}), ${selectedHosts.host2.name} (${selectedHosts.host2.gender})`);

  const sourcesArray = Array.isArray(news.sources)
    ? news.sources
    : Object.keys(news.sources);
  const mainSources = sourcesArray.slice(0, 5);
  console.log(`[NEWSCAST_SCRIPT SOURCES] Main sources: ${mainSources.join(', ')}`);

  console.log(`[NEWSCAST_SCRIPT PROMPT] Building prompt template with program: ${programName}`);
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
  console.log(`[NEWSCAST_SCRIPT PROMPT] Prompt built: ${prompt.length} characters`);

  console.log(`[NEWSCAST_SCRIPT GEMINI] Calling Google Gemini API with model: ${model}`);
  const genAI = new GoogleGenAI({ apiKey });

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });
  const text = response.text ?? '';
  console.log(`[NEWSCAST_SCRIPT GEMINI] Received response: ${text.length} characters`);

  console.log(`[NEWSCAST_SCRIPT PARSE] Extracting JSON from AI response`);
  const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error(`[NEWSCAST_SCRIPT ERROR] No valid JSON found in generated content: ${text.substring(0, 500)}...`);
    throw new Error('No valid JSON found in generated content');
  }

  console.log(`[NEWSCAST_SCRIPT PARSE] Parsing JSON response`);
  const parsed: NewscastScript = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);
  console.log(`[NEWSCAST_SCRIPT PARSE] Parsed script with ${parsed.script.length} lines`);

  console.log(`[NEWSCAST_SCRIPT ENHANCE] Adding voice model information to script lines`);
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
  console.log(`[NEWSCAST_SCRIPT ENHANCE] Enhanced ${enhancedScript.length} script lines with voice models`);

  const completedAt = now();
  console.log(`[NEWSCAST_SCRIPT OUTPUT] Building final newscast output structure`);
  const newscastOutput: NewscastOutput = {
    title: parsed.title,
    program_name: parsed.program_name ?? programName,
    hosts: selectedHosts,
    estimated_duration: parsed.estimated_duration,
    script: enhancedScript,
    metadata: {
      total_articles: news.input_articles_count,
      sources_count: news.sources_count,
      main_sources: mainSources,
      generation_timestamp: completedAt.toISOString(),
      total_script_lines: enhancedScript.length,
    },
  };

  console.log(`[NEWSCAST_SCRIPT MARKDOWN] Generating markdown format`);
  const markdown = formatAsMarkdown(newscastOutput);

  const totalTime = Date.now() - startTime;
  console.log(`[NEWSCAST_SCRIPT SUCCESS] Completed in ${totalTime}ms`);
  console.log(`[NEWSCAST_SCRIPT SUCCESS] Generated ${enhancedScript.length} script lines`);
  console.log(`[NEWSCAST_SCRIPT SUCCESS] Hosts: ${selectedHosts.host1.name}, ${selectedHosts.host2.name}`);

  return {
    output: newscastOutput,
    markdown,
    stats: {
      startedAt: startTime_Date.toISOString(),
      completedAt: completedAt.toISOString(),
      elapsedMs: completedAt.getTime() - startTime_Date.getTime(),
      scriptLines: enhancedScript.length,
      hosts: {
        host1: selectedHosts.host1.name,
        host2: selectedHosts.host2.name,
      },
    },
    prompt,
    rawText: text,
  };
}

export const generateScript = generateNewscastScript;
