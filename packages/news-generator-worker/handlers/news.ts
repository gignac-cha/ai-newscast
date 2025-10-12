import { response, cors, json, error } from '@ai-newscast/core-worker';
import type { GeneratedNews } from '@ai-newscast/core';
import { generateNews, formatAsMarkdown, type NewsDetail } from '@ai-newscast/news-generator';
import newsConsolidationPrompt from '../prompts/news-consolidation.md';

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
  GOOGLE_GEN_AI_API_KEY: string;
}


export async function handleGenerateNews(
  url: URL,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const newscastID = url.searchParams.get('newscast-id');
  const topicIndex = url.searchParams.get('topic-index');
  const format = url.searchParams.get('format') ?? 'json';
  const saveToR2 = url.searchParams.get('save') === 'true';

  console.log(`[GENERATE START] ${new Date().toISOString()} - newscastID: ${newscastID}, topicIndex: ${topicIndex}, format: ${format}, saveToR2: ${saveToR2}`);

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

    // Generate news using imported function with metrics
    console.log(`[GENERATE AI] Starting AI news generation`);
    const result = await generateNews(
      newsDetails,
      newsConsolidationPrompt,
      env.GOOGLE_GEN_AI_API_KEY,
      newscastID,
      parseInt(topicIndex)
    );

    const generatedNews = result.generatedNews;
    console.log(`[GENERATE AI] AI generation completed - title: "${generatedNews.title}"`);

    const markdownContent = formatAsMarkdown(generatedNews);
    const endTime = Date.now();
    const totalTime = endTime - startTime;

    const responseData: {
      success: boolean;
      newscastID: string;
      topicIndex: number;
      inputArticlesCount: number;
      sourcesCount: number;
      executionTime: number;
      totalTime: number;
      timestamp: string;
      metrics: typeof result.metrics;
      outputFiles?: { json: string; markdown: string };
      message: string;
    } = {
      success: true,
      newscastID,
      topicIndex: parseInt(topicIndex),
      inputArticlesCount: newsDetails.length,
      sourcesCount: generatedNews.sourcesCount,
      executionTime: result.executionTime,
      totalTime,
      timestamp: new Date().toISOString(),
      metrics: result.metrics,
      message: ''
    };

    // Save to R2 if save=true
    if (saveToR2) {
      const outputPath = `newscasts/${newscastID}/topic-${topicIndexPadded}`;
      console.log(`[GENERATE R2] Saving results to: ${outputPath}`);

      // Save JSON
      const jsonKey = `${outputPath}/news.json`;
      console.log(`[GENERATE R2] Saving JSON to: ${jsonKey}`);
      await env.AI_NEWSCAST_BUCKET.put(jsonKey, JSON.stringify(generatedNews, null, 2));

      // Save Markdown
      const markdownKey = `${outputPath}/news.md`;
      console.log(`[GENERATE R2] Saving Markdown to: ${markdownKey}`);
      await env.AI_NEWSCAST_BUCKET.put(markdownKey, markdownContent);

      console.log(`[GENERATE R2] Both files saved successfully`);

      responseData.outputFiles = { json: jsonKey, markdown: markdownKey };
      responseData.message = `Successfully generated and saved news for topic ${topicIndex} from ${newsDetails.length} articles`;
    } else {
      responseData.message = `Successfully generated news for topic ${topicIndex} from ${newsDetails.length} articles`;
    }

    console.log(`[GENERATE SUCCESS] Generated news for topic ${topicIndex}: "${generatedNews.title}"`);
    console.log(`[GENERATE SUCCESS] Input articles: ${newsDetails.length}, Sources: ${generatedNews.sourcesCount}`);
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