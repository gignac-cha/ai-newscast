#!/usr/bin/env node

import { GoogleGenAI } from '@google/genai';
import { readFile, writeFile, readdir, mkdir } from 'fs/promises';
import { dirname, join } from 'path';
import { existsSync } from 'fs';
import { Command } from 'commander';

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

interface GeneratedNews {
  title: string;
  summary: string;
  content: string;
  sources_count: number;
  sources: {
    [provider: string]: {
      title: string;
      url: string;
    }[];
  };
  generation_timestamp: string;
  input_articles_count: number;
}

async function loadPrompt(): Promise<string> {
  const promptPath = join(import.meta.dirname, 'prompts', 'news-consolidation.md');
  return await readFile(promptPath, 'utf-8');
}

async function generateNews(
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

  // Format news articles for prompt
  const newsArticles = newsDetails
    .map((news, index) => {
      const metadata = news.metadata;
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

  // Load prompt template
  const promptTemplate = await loadPrompt();
  const prompt = promptTemplate.replace('{news_articles}', newsArticles);

  // Initialize Google AI
  const genAI = new GoogleGenAI({ apiKey });

  try {
    // Generate content
    const response = await genAI.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: prompt,
    });
    const text = response.text ?? '';

    // Parse JSON response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in generated content');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Group articles by provider with URLs
    const sourcesByProvider: { [provider: string]: { title: string; url: string }[] } = {};
    
    newsDetails.forEach((news) => {
      const provider = news.news_detail?.PROVIDER ?? news.metadata.provider ?? 'Unknown';
      const title = news.news_detail?.TITLE ?? news.metadata.title ?? 'Untitled';
      const url = news.news_detail?.PROVIDER_LINK_PAGE ?? news.metadata.url ?? '';
      
      if (!sourcesByProvider[provider]) {
        sourcesByProvider[provider] = [];
      }
      
      sourcesByProvider[provider].push({ title, url });
    });

    // Create output data
    const generatedNews: GeneratedNews = {
      title: parsed.title ?? '통합 뉴스',
      summary: parsed.summary ?? '',
      content: parsed.content ?? '',
      sources_count: Object.keys(sourcesByProvider).length,
      sources: sourcesByProvider,
      generation_timestamp: new Date().toISOString(),
      input_articles_count: newsDetails.length,
    };

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
      'total-news-input': newsDetails.length,
      'total-news-generated': 1,
      'output-file': outputFile,
    };

    // Output log
    if (printFormat === 'json') {
      console.log(JSON.stringify(logOutput, null, 2));
    } else {
      console.log(`✅ Generated news content: ${outputFile}`);
      console.log(`📊 Processed ${newsDetails.length} articles in ${elapsedSeconds}s`);
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
      await generateNews(inputFolder, outputFile, printFormat, printLogFile);
    });

  program.parse();
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
