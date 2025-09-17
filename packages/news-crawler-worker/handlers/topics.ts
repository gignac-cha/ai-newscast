import { crawlNewsTopics } from '@ai-newscast/news-crawler/crawl-news-topics.ts';
import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
}

export async function handleTopics(
  url: URL,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const saveToR2 = url.searchParams.get('save') === 'true';

  const result = await crawlNewsTopics({ includeHtml: saveToR2 });

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  const responseData = {
    success: true,
    topics: result.topics,
    count: result.topics.length,
    timestamp: new Date().toISOString(),
    execution_time_ms: executionTime,
    message: undefined as string | undefined,
    path: undefined as string | undefined,
    newscast_id: undefined as string | undefined
  };

  if (saveToR2) {
    // Generate timestamp once for consistent use
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const basePath = `newscasts/${timestamp}`;

    // Save HTML to R2
    if (result.html) {
      const htmlKey = `${basePath}/topics.raw.html`;
      await env.AI_NEWSCAST_BUCKET.put(htmlKey, result.html);
    }

    // Save JSON to R2
    const jsonKey = `${basePath}/topics.json`;
    const jsonData = {
      timestamp: now.toISOString(),
      count: result.topics.length,
      execution_time_ms: executionTime,
      topics: result.topics
    };
    await env.AI_NEWSCAST_BUCKET.put(jsonKey, JSON.stringify(jsonData, null, 2));

    // Store the newscast ID in KV
    await env.AI_NEWSCAST_KV.put('last-working-newscast-id', timestamp);

    // Save news_ids to topic-{index}/news-list.json
    for (let i = 0; i < result.topics.length; i++) {
      const topic = result.topics[i];
      const topicIndex = (i + 1).toString().padStart(2, '0');
      const newsListKey = `${basePath}/topic-${topicIndex}/news-list.json`;

      await env.AI_NEWSCAST_BUCKET.put(newsListKey, JSON.stringify({
        topic_index: i + 1,
        news_ids: topic.news_ids,
        count: topic.news_ids.length,
        timestamp: now.toISOString()
      }, null, 2));
    }

    // Save flattened news list entries to newscasts/{newscast-id}/news-list.json
    const flattenedNewsEntries = [];
    for (let i = 0; i < result.topics.length; i++) {
      const topic = result.topics[i];
      const topicIndex = i + 1;

      for (const newsID of topic.news_ids) {
        flattenedNewsEntries.push({
          index: topicIndex,
          newsID: newsID
        });
      }
    }

    const newsListKey = `${basePath}/news-list.json`;
    await env.AI_NEWSCAST_BUCKET.put(newsListKey, JSON.stringify(flattenedNewsEntries, null, 2));

    // Initialize queue index in KV
    await env.AI_NEWSCAST_KV.put('last-working-news-queue-index', '0');

    // Add R2 save info to response
    responseData.message = 'Topics and news lists saved to R2';
    responseData.path = basePath;
    responseData.newscast_id = timestamp;
  }

  return response(cors(json(responseData)));
}