import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';
import { GoogleGenAI } from '@google/genai';
import type { GeneratedNews } from '@ai-newscast/core';
import newsConsolidationPrompt from '../prompts/news-consolidation.md';

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

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
  GOOGLE_GEN_AI_API_KEY: string;
}


export async function handleGenerate(
  url: URL,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const newscastID = url.searchParams.get('newscast-id');
  const topicIndex = url.searchParams.get('topic-index');
  const format = url.searchParams.get('format') || 'json';

  console.log(`[GENERATE START] ${new Date().toISOString()} - newscastID: ${newscastID}, topicIndex: ${topicIndex}, format: ${format}`);

  if (!newscastID) {
    console.error(`[GENERATE ERROR] Missing newscast-id parameter`);
    return response(cors(error('Bad Request', 'Missing required parameter: newscast-id')));
  }

  if (!topicIndex) {
    console.error(`[GENERATE ERROR] Missing topic-index parameter`);
    return response(cors(error('Bad Request', 'Missing required parameter: topic-index')));
  }

  if (!env.GOOGLE_GEN_AI_API_KEY) {
    console.error(`[GENERATE ERROR] Google AI API key not configured`);
    return response(cors(error('Internal Server Error', 'Google AI API key not configured')));
  }

  console.log(`[GENERATE VALIDATE] Parameters validated successfully`);

  try {
    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndex.padStart(2, '0');
    const newsFolder = `newscasts/${newscastID}/topic-${topicIndexPadded}/news`;
    console.log(`[GENERATE R2] Looking for news files in: ${newsFolder}`);

    // List all news files in the topic folder
    const newsFiles = await env.AI_NEWSCAST_BUCKET.list({
      prefix: newsFolder + '/'
    });

    console.log(`[GENERATE R2] Found ${newsFiles.objects.length} objects in R2`);

    if (newsFiles.objects.length === 0) {
      console.error(`[GENERATE R2] No files found in folder: ${newsFolder}`);
      return response(cors(error('Not Found', `No news articles found for topic ${topicIndex} in newscast ${newscastID}`)));
    }

    // Read all news detail files
    console.log(`[GENERATE R2] Reading news detail files`);
    const newsDetails: NewsDetail[] = [];
    for (const file of newsFiles.objects) {
      if (file.key.endsWith('.json')) {
        console.log(`[GENERATE R2] Reading file: ${file.key}`);
        const newsData = await env.AI_NEWSCAST_BUCKET.get(file.key);
        if (newsData) {
          const newsDetail: NewsDetail = JSON.parse(await newsData.text());
          newsDetails.push(newsDetail);
          console.log(`[GENERATE R2] Loaded news: "${newsDetail.metadata.title}" from ${newsDetail.metadata.provider}`);
        }
      }
    }

    console.log(`[GENERATE R2] Loaded ${newsDetails.length} news articles`);

    if (newsDetails.length === 0) {
      console.error(`[GENERATE R2] No valid JSON files found in folder: ${newsFolder}`);
      return response(cors(error('Not Found', `No valid news data found for topic ${topicIndex}`)));
    }

    // Generate news using local AI function
    console.log(`[GENERATE AI] Starting AI news generation`);
    const result = await generateNews(
      newsDetails,
      newsConsolidationPrompt,
      env.GOOGLE_GEN_AI_API_KEY
    );

    const generatedNews = result.generatedNews;
    console.log(`[GENERATE AI] AI generation completed - title: "${generatedNews.title}"`);

    // Save to R2
    const outputPath = `newscasts/${newscastID}/topic-${topicIndexPadded}`;
    console.log(`[GENERATE R2] Saving results to: ${outputPath}`);

    // Save JSON
    const jsonKey = `${outputPath}/news.json`;
    console.log(`[GENERATE R2] Saving JSON to: ${jsonKey}`);
    await env.AI_NEWSCAST_BUCKET.put(jsonKey, JSON.stringify(generatedNews, null, 2));

    // Save Markdown
    const markdownKey = `${outputPath}/news.md`;
    console.log(`[GENERATE R2] Saving Markdown to: ${markdownKey}`);
    const markdownContent = formatAsMarkdown(generatedNews);
    await env.AI_NEWSCAST_BUCKET.put(markdownKey, markdownContent);

    console.log(`[GENERATE R2] Both files saved successfully`);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const responseData = {
      success: true,
      newscast_id: newscastID,
      topic_index: parseInt(topicIndex),
      input_articles_count: newsDetails.length,
      sources_count: generatedNews.sources_count,
      output_files: {
        json: jsonKey,
        markdown: markdownKey
      },
      execution_time_ms: result.executionTime,
      total_time_ms: totalTime,
      timestamp: new Date().toISOString(),
      message: `Successfully generated news for topic ${topicIndex} from ${newsDetails.length} articles`
    };

    console.log(`[GENERATE SUCCESS] Generated news for topic ${topicIndex}: "${generatedNews.title}"`);
    console.log(`[GENERATE SUCCESS] Input articles: ${newsDetails.length}, Sources: ${generatedNews.sources_count}`);
    console.log(`[GENERATE SUCCESS] AI time: ${result.executionTime}ms, Total time: ${totalTime}ms`);

    // Return markdown if requested
    if (format === 'markdown') {
      console.log(`[GENERATE RESPONSE] Returning markdown format`);
      return new Response(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    console.log(`[GENERATE RESPONSE] Returning JSON format`);
    return response(cors(json(responseData)));

  } catch (err) {
    const errorTime = Date.now() - startTime;
    console.error(`[GENERATE ERROR] Failed after ${errorTime}ms:`, err);

    if (err instanceof Error) {
      console.error(`[GENERATE ERROR] Error name: ${err.name}`);
      console.error(`[GENERATE ERROR] Error message: ${err.message}`);
      console.error(`[GENERATE ERROR] Error stack: ${err.stack}`);
    }

    return response(cors(error(err instanceof Error ? err : 'Unknown error')));
  }
}