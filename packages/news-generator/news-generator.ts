import { GoogleGenAI } from '@google/genai';
import type { GeneratedNews } from '@ai-newscast/core';

export interface NewsDetail {
  extractionTimestamp: string;
  originalNewsID: string;
  apiNewsID: string;
  newsDetail: any;
  content: string;
  metadata: {
    title: string;
    provider: string;
    byline: string;
    publishedDate: string;
    category: string;
    keywords: string;
    summary: string;
    url: string;
  };
}

export interface NewsGeneratorMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    aiGenerationTime: number;
  };
  input: {
    totalArticles: number;
    totalProviders: number;
    inputDataSize: number;  // bytes
  };
  output: {
    titleLength: number;
    summaryLength: number;
    contentLength: number;
    totalOutputSize: number;  // bytes
  };
  performance: {
    articlesPerSecond: number;
  };
}

export interface GenerationResult {
  generatedNews: GeneratedNews;
  executionTime: number;
  metrics: NewsGeneratorMetrics;
}

export async function generateNews(
  newsDetails: NewsDetail[],
  promptTemplate: string,
  apiKey: string,
  newscastID: string,
  topicIndex: number,
  model: string = 'gemini-2.5-pro'
): Promise<GenerationResult> {
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  console.log(`[NEWS_GENERATOR START] ${startedAt} - Processing ${newsDetails.length} articles`);

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

  // Calculate input data size
  const inputDataSize = JSON.stringify(newsDetails).length;
  console.log(`[NEWS_GENERATOR INPUT] Input data size: ${inputDataSize} bytes`);

  // Format news articles for prompt
  console.log(`[NEWS_GENERATOR FORMAT] Formatting articles for AI prompt`);
  const newsArticles = newsDetails
    .map((news, index) => {
      const metadata = news.metadata;
      console.log(`[NEWS_GENERATOR FORMAT] Processing article ${index + 1}: "${metadata.title}" from ${metadata.provider}`);
      return `[기사 ${index + 1}]
제목: ${metadata.title}
언론사: ${metadata.provider}
발행일: ${metadata.publishedDate}
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
    console.log(`[NEWS_GENERATOR AI] Starting AI generation with ${model}`);
    const aiStartTime = Date.now();

    const response = await genAI.models.generateContent({
      model,
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
      const provider = news.newsDetail?.PROVIDER ?? news.metadata.provider ?? 'Unknown';
      const title = news.newsDetail?.TITLE ?? news.metadata.title ?? 'Untitled';
      const url = news.newsDetail?.PROVIDER_LINK_PAGE ?? news.metadata.url ?? '';

      if (!sourcesByProvider[provider]) {
        sourcesByProvider[provider] = [];
      }

      sourcesByProvider[provider].push({ title, url });
      console.log(`[NEWS_GENERATOR SOURCES] Added article ${index + 1} to provider "${provider}"`);
    });

    const providersCount = Object.keys(sourcesByProvider).length;
    console.log(`[NEWS_GENERATOR SOURCES] Grouped into ${providersCount} providers`);

    const completedAt = new Date().toISOString();
    const endTime = Date.now();
    const duration = endTime - startTime;
    const articlesPerSecond = newsDetails.length / (duration / 1000);

    // Create output data with metrics embedded
    console.log(`[NEWS_GENERATOR OUTPUT] Creating final output structure`);
    const generatedNews: GeneratedNews = {
      timestamp: completedAt,
      title: parsed.title ?? '통합 뉴스',
      summary: parsed.summary ?? '',
      content: parsed.content ?? '',
      sourcesCount: providersCount,
      sources: sourcesByProvider,
      inputArticlesCount: newsDetails.length,
      metrics: {
        newscastID,
        topicIndex,
        timing: {
          startedAt,
          completedAt,
          duration,
          aiGenerationTime: aiTime
        },
        input: {
          totalArticles: newsDetails.length,
          totalProviders: providersCount,
          inputDataSize
        },
        output: {
          titleLength: (parsed.title ?? '').length,
          summaryLength: (parsed.summary ?? '').length,
          contentLength: (parsed.content ?? '').length,
          totalOutputSize: 0 // Will be calculated after stringify
        },
        performance: {
          articlesPerSecond
        }
      }
    };

    // Update totalOutputSize
    generatedNews.metrics.output.totalOutputSize = JSON.stringify(generatedNews).length;

    console.log(`[NEWS_GENERATOR SUCCESS] Generated news: "${generatedNews.title}"`);
    console.log(`[NEWS_GENERATOR SUCCESS] Summary length: ${generatedNews.summary.length} chars`);
    console.log(`[NEWS_GENERATOR SUCCESS] Content length: ${generatedNews.content.length} chars`);
    console.log(`[NEWS_GENERATOR SUCCESS] Total execution time: ${duration}ms`);
    console.log(`[NEWS_GENERATOR SUCCESS] Processing speed: ${articlesPerSecond.toFixed(2)} articles/sec`);

    return {
      generatedNews,
      executionTime: duration,
      metrics: generatedNews.metrics
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

export function formatAsMarkdown(news: GeneratedNews): string {
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
> 📅 생성일시: ${new Date(news.timestamp).toLocaleString('ko-KR')}
> 📰 참고 기사: ${news.inputArticlesCount}개
> 🏢 참고 언론사: ${news.sourcesCount}개사

## 📝 요약

${news.summary}

## 📄 본문

${news.content}

## 📊 메타데이터

| 항목 | 내용 |
|------|------|
| **생성 시간** | ${news.timestamp} |
| **참고 기사 수** | ${news.inputArticlesCount}개 |
| **참고 언론사 수** | ${news.sourcesCount}개사 |

## 📰 참고 기사 목록

${sourcesList}

---

*🤖 AI 뉴스 통합 시스템으로 생성된 콘텐츠입니다.*
`;
}

