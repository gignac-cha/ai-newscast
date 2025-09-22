#!/usr/bin/env node

import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';
import { GoogleGenAI } from '@google/genai';
import type { GeneratedNews } from '@ai-newscast/core';

interface NewsDetail {
  extraction_timestamp: string;
  original_news_id: string;
  api_news_id: string;
  news_detail: any;
  content: string;
  metadata: {
    title: string;
    provider: string;
    byline: string;
    published_date: string;
    category: string;
    keywords: string;
    summary: string;
    url: string;
  };
}

interface GenerationResult {
  generatedNews: GeneratedNews;
  executionTime: number;
}

async function generateNews(
  newsDetails: NewsDetail[],
  promptTemplate: string,
  apiKey: string
): Promise<GenerationResult> {
  const startTime = Date.now();

  console.log(`[NEWS_GENERATOR START] ${new Date().toISOString()} - Processing ${newsDetails.length} articles`);

  if (!apiKey) {
    console.error(`[NEWS_GENERATOR ERROR] Missing Google AI API key`);
    throw new Error('Google AI API key is required');
  }

  if (newsDetails.length === 0) {
    console.error(`[NEWS_GENERATOR ERROR] No news details provided`);
    throw new Error('No news details provided');
  }

  console.log(`[NEWS_GENERATOR VALIDATE] API key available: ${apiKey.length > 0}`);
  console.log(`[NEWS_GENERATOR VALIDATE] Input articles: ${newsDetails.length}`);

  // Format news articles for prompt
  console.log(`[NEWS_GENERATOR FORMAT] Formatting articles for AI prompt`);
  const newsArticles = newsDetails
    .map((news, index) => {
      const metadata = news.metadata;
      console.log(`[NEWS_GENERATOR FORMAT] Processing article ${index + 1}: "${metadata.title}" from ${metadata.provider}`);
      return `[기사 ${index + 1}]
제목: ${metadata.title}
언론사: ${metadata.provider}
발행일: ${metadata.published_date}
기자: ${metadata.byline}
요약: ${metadata.summary}
내용: ${news.content}
URL: ${metadata.url}`;
    })
    .join('\n\n---\n\n');

  console.log(`[NEWS_GENERATOR FORMAT] Formatted prompt length: ${newsArticles.length} characters`);

  // Replace placeholder in prompt
  const prompt = promptTemplate.replace('{news_articles}', newsArticles);
  console.log(`[NEWS_GENERATOR PROMPT] Final prompt length: ${prompt.length} characters`);

  // Initialize Google AI
  console.log(`[NEWS_GENERATOR AI] Initializing Google Gemini AI`);
  const genAI = new GoogleGenAI({ apiKey });

  // Generate content
  try {
    console.log(`[NEWS_GENERATOR AI] Starting AI generation with Gemini 2.5 Pro`);
    const aiStartTime = Date.now();

    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });

    const aiEndTime = Date.now();
    const aiTime = aiEndTime - aiStartTime;
    console.log(`[NEWS_GENERATOR AI] AI generation completed in ${aiTime}ms`);

    const text = response.text ?? '';
    console.log(`[NEWS_GENERATOR AI] Generated text length: ${text.length} characters`);

    // Parse JSON response
    console.log(`[NEWS_GENERATOR PARSE] Extracting JSON from AI response`);
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error(`[NEWS_GENERATOR PARSE] No JSON found in AI response`);
      console.error(`[NEWS_GENERATOR PARSE] AI response preview: ${text.substring(0, 500)}...`);
      throw new Error('No JSON found in generated content');
    }

    console.log(`[NEWS_GENERATOR PARSE] Found JSON block: ${jsonMatch[0].length} characters`);
    const parsed = JSON.parse(jsonMatch[0]);
    console.log(`[NEWS_GENERATOR PARSE] Successfully parsed JSON - title: "${parsed.title}"`);

    // Group articles by provider with URLs
    console.log(`[NEWS_GENERATOR SOURCES] Grouping articles by provider`);
    const sourcesByProvider: { [provider: string]: { title: string; url: string }[] } = {};

    newsDetails.forEach((news, index) => {
      const provider = news.news_detail?.PROVIDER ?? news.metadata.provider ?? 'Unknown';
      const title = news.news_detail?.TITLE ?? news.metadata.title ?? 'Untitled';
      const url = news.news_detail?.PROVIDER_LINK_PAGE ?? news.metadata.url ?? '';

      if (!sourcesByProvider[provider]) {
        sourcesByProvider[provider] = [];
      }

      sourcesByProvider[provider].push({ title, url });
      console.log(`[NEWS_GENERATOR SOURCES] Added article ${index + 1} to provider "${provider}"`);
    });

    const providersCount = Object.keys(sourcesByProvider).length;
    console.log(`[NEWS_GENERATOR SOURCES] Grouped into ${providersCount} providers`);

    // Create output data
    console.log(`[NEWS_GENERATOR OUTPUT] Creating final output structure`);
    const generatedNews: GeneratedNews = {
      title: parsed.title ?? '통합 뉴스',
      summary: parsed.summary ?? '',
      content: parsed.content ?? '',
      sources_count: providersCount,
      sources: sourcesByProvider,
      generation_timestamp: new Date().toISOString(),
      input_articles_count: newsDetails.length,
    };

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    console.log(`[NEWS_GENERATOR SUCCESS] Generated news: "${generatedNews.title}"`);
    console.log(`[NEWS_GENERATOR SUCCESS] Summary length: ${generatedNews.summary.length} chars`);
    console.log(`[NEWS_GENERATOR SUCCESS] Content length: ${generatedNews.content.length} chars`);
    console.log(`[NEWS_GENERATOR SUCCESS] Total execution time: ${executionTime}ms`);

    return {
      generatedNews,
      executionTime
    };

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error(`[NEWS_GENERATOR ERROR] Failed after ${errorTime}ms:`, error);

    if (error instanceof Error) {
      console.error(`[NEWS_GENERATOR ERROR] Error name: ${error.name}`);
      console.error(`[NEWS_GENERATOR ERROR] Error message: ${error.message}`);
      console.error(`[NEWS_GENERATOR ERROR] Error stack: ${error.stack}`);
    }

    throw error;
  }
}

function formatAsMarkdown(news: GeneratedNews): string {
  // Format sources list
  const sourcesList = Object.entries(news.sources)
    .map(([provider, articles]) => {
      const articlesList = articles
        .map((article) => `  - [${article.title}](${article.url})`)
        .join('\n');
      return `- **${provider}** (${articles.length}개)\n${articlesList}`;
    })
    .join('\n\n');

  return `# ${news.title}

> **AI 뉴스 통합 보고서**
> 📅 생성일시: ${new Date(news.generation_timestamp).toLocaleString('ko-KR')}
> 📰 참고 기사: ${news.input_articles_count}개
> 🏢 참고 언론사: ${news.sources_count}개사

## 📝 요약

${news.summary}

## 📄 본문

${news.content}

## 📊 메타데이터

| 항목 | 내용 |
|------|------|
| **생성 시간** | ${news.generation_timestamp} |
| **참고 기사 수** | ${news.input_articles_count}개 |
| **참고 언론사 수** | ${news.sources_count}개사 |

## 📰 참고 기사 목록

${sourcesList}

---

*🤖 AI 뉴스 통합 시스템으로 생성된 콘텐츠입니다.*
`;
}

async function loadPrompt(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'news-consolidation.md');
  return await readFile(promptPath, 'utf-8');
}

async function processNewsGeneration(
  inputFolder: string,
  outputFile: string,
  printFormat: string = 'text',
  printLogFile?: string
): Promise<void> {
  const startTime = Date.now();

  // Check API key
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;
  if (!apiKey) {
    console.error('Error: GOOGLE_GEN_AI_API_KEY environment variable is required');
    process.exit(1);
  }

  // Check input folder
  if (!existsSync(inputFolder)) {
    console.error(`Error: Input folder does not exist: ${inputFolder}`);
    process.exit(1);
  }

  // Read all JSON files from input folder
  const files = await readdir(inputFolder);
  const jsonFiles = files.filter((f) => f.endsWith('.json'));

  if (jsonFiles.length === 0) {
    console.error(`Error: No JSON files found in ${inputFolder}`);
    process.exit(1);
  }

  // Load news details
  const newsDetails: NewsDetail[] = [];
  for (const file of jsonFiles) {
    const filePath = join(inputFolder, file);
    const content = await readFile(filePath, 'utf-8');
    const newsDetail: NewsDetail = JSON.parse(content);
    newsDetails.push(newsDetail);
  }

  try {
    // Load prompt template
    const promptTemplate = await loadPrompt();

    // Generate news using pure function
    const result = await generateNews(newsDetails, promptTemplate, apiKey);
    const { generatedNews, executionTime } = result;

    // Ensure output directory exists
    await mkdir(dirname(outputFile), { recursive: true });

    // Write JSON output
    await writeFile(outputFile, JSON.stringify(generatedNews, null, 2));

    // Write markdown output
    const markdownFile = outputFile.replace('.json', '.md');
    const markdownContent = formatAsMarkdown(generatedNews);
    await writeFile(markdownFile, markdownContent);

    const endTime = Date.now();
    const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

    // Create log output
    const logOutput = {
      timestamp: new Date().toISOString(),
      'elapsed-time': `${elapsedSeconds}s`,
      'ai-processing-time': `${(executionTime / 1000).toFixed(2)}s`,
      'total-news-input': newsDetails.length,
      'total-news-generated': 1,
      'output-file': outputFile,
    };

    // Output log
    if (printFormat === 'json') {
      console.log(JSON.stringify(logOutput, null, 2));
    } else {
      console.log(`✅ Generated news content: ${outputFile}`);
      console.log(`📊 Processed ${newsDetails.length} articles in ${elapsedSeconds}s (AI: ${(executionTime / 1000).toFixed(2)}s)`);
    }

    // Write to log file if specified
    if (printLogFile) {
      await mkdir(dirname(printLogFile), { recursive: true });
      await writeFile(printLogFile, JSON.stringify(logOutput, null, 2));
    }
  } catch (error) {
    console.error('Error generating news:', error);
    process.exit(1);
  }
}

async function main() {
  const program = new Command();

  program
    .name('news-generator')
    .description('AI-powered news content generator using Google Gemini')
    .version('1.0.0')
    .requiredOption('-i, --input-folder <path>', 'Folder containing news detail JSON files')
    .requiredOption('-o, --output-file <path>', 'Output file path for generated news')
    .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
    .option('-l, --print-log-file <path>', 'File to write JSON log output')
    .action(async (options) => {
      const { inputFolder, outputFile, printFormat, printLogFile } = options;
      await processNewsGeneration(inputFolder, outputFile, printFormat, printLogFile);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}