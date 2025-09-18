import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';
import { generateNews, formatAsMarkdown, type NewsDetail } from '@ai-newscast/news-generator/news-generator.ts';
import newsConsolidationPrompt from '@ai-newscast/news-generator/prompts/news-consolidation.md';

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

  if (!newscastID) {
    return response(cors(error('Bad Request', 'Missing required parameter: newscast-id')));
  }

  if (!topicIndex) {
    return response(cors(error('Bad Request', 'Missing required parameter: topic-index')));
  }

  if (!env.GOOGLE_GEN_AI_API_KEY) {
    return response(cors(error('Internal Server Error', 'Google AI API key not configured')));
  }

  try {
    // Pad topic index to 2 digits
    const topicIndexPadded = topicIndex.padStart(2, '0');
    const newsFolder = `newscasts/${newscastID}/topic-${topicIndexPadded}/news`;

    // List all news files in the topic folder
    const newsFiles = await env.AI_NEWSCAST_BUCKET.list({
      prefix: newsFolder + '/'
    });

    if (newsFiles.objects.length === 0) {
      return response(cors(error('Not Found', `No news articles found for topic ${topicIndex} in newscast ${newscastID}`)));
    }

    // Read all news detail files
    const newsDetails: NewsDetail[] = [];
    for (const file of newsFiles.objects) {
      if (file.key.endsWith('.json')) {
        const newsData = await env.AI_NEWSCAST_BUCKET.get(file.key);
        if (newsData) {
          const newsDetail: NewsDetail = JSON.parse(await newsData.text());
          newsDetails.push(newsDetail);
        }
      }
    }

    if (newsDetails.length === 0) {
      return response(cors(error('Not Found', `No valid news data found for topic ${topicIndex}`)));
    }

    // Use @ai-newscast/news-generator function
    const result = await generateNews(
      newsDetails,
      newsConsolidationPrompt,
      env.GOOGLE_GEN_AI_API_KEY
    );

    const generatedNews = result.generatedNews;

    // Save to R2
    const outputPath = `newscasts/${newscastID}/topic-${topicIndexPadded}`;

    // Save JSON
    const jsonKey = `${outputPath}/news.json`;
    await env.AI_NEWSCAST_BUCKET.put(jsonKey, JSON.stringify(generatedNews, null, 2));

    // Save Markdown
    const markdownKey = `${outputPath}/news.md`;
    const markdownContent = formatAsMarkdown(generatedNews);
    await env.AI_NEWSCAST_BUCKET.put(markdownKey, markdownContent);

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
      timestamp: new Date().toISOString(),
      message: `Successfully generated news for topic ${topicIndex} from ${newsDetails.length} articles`
    };

    // Return markdown if requested
    if (format === 'markdown') {
      return new Response(markdownContent, {
        headers: {
          'Content-Type': 'text/markdown; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }

    return response(cors(json(responseData)));

  } catch (err) {
    console.error('News generation error:', err);
    return response(cors(error(err instanceof Error ? err : 'Unknown error')));
  }
}