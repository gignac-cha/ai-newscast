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
  if (!apiKey) {
    throw new Error('Google AI API key is required');
  }

  if (!news) {
    throw new Error('Generated news data is required');
  }

  if (!promptTemplate) {
    throw new Error('Prompt template is required');
  }

  if (!voices) {
    throw new Error('TTS voices configuration is required');
  }

  const startTime = now();
  const selectedHosts = selectHostsFn ? selectHostsFn(voices) : selectRandomHosts(voices);

  const sourcesArray = Array.isArray(news.sources)
    ? news.sources
    : Object.keys(news.sources);
  const mainSources = sourcesArray.slice(0, 5);

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

  const genAI = new GoogleGenAI({ apiKey });

  const response = await genAI.models.generateContent({
    model,
    contents: prompt,
  });
  const text = response.text ?? '';

  const jsonMatch = text.match(/```json\s*(\{[\s\S]*?\})\s*```/) ?? text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in generated content');
  }

  const parsed: NewscastScript = JSON.parse(jsonMatch[1] ?? jsonMatch[0]);

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

  const completedAt = now();
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

  const markdown = formatAsMarkdown(newscastOutput);

  return {
    output: newscastOutput,
    markdown,
    stats: {
      startedAt: startTime.toISOString(),
      completedAt: completedAt.toISOString(),
      elapsedMs: completedAt.getTime() - startTime.getTime(),
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
