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
  // Save to R2 if ?save=true parameter is provided
  const saveToR2 = url.searchParams.get('save') === 'true';

  console.log(`[TOPICS START] ${new Date().toISOString()} - saveToR2: ${saveToR2}`);

  try {
    console.log(`[TOPICS CRAWL] Starting crawlNewsTopics with includeHTML: ${saveToR2}`);
    const result = await crawlNewsTopics({ includeHTML: saveToR2 });
    console.log(`[TOPICS CRAWL] Completed. Found ${result.topics.length} topics`);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    const responseData: {
      success: boolean;
      topics: typeof result.topics;
      count: number;
      timestamp: string;
      executionTime: number;
      message?: string;
      path?: string;
      newscastID?: string;
    } = {
      success: true,
      topics: result.topics,
      count: result.topics.length,
      timestamp: new Date().toISOString(),
      executionTime: executionTime,
    };

    if (saveToR2) {
      console.log(`[TOPICS R2] Starting R2 save operations`);

      // Generate timestamp once for consistent use
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-');
      const basePath = `newscasts/${timestamp}`;
      console.log(`[TOPICS R2] Generated newscast ID: ${timestamp}, basePath: ${basePath}`);

      // Save HTML to R2
      if (result.html) {
        const htmlKey = `${basePath}/topics.raw.html`;
        console.log(`[TOPICS R2] Saving HTML to: ${htmlKey} (${result.html.length} chars)`);
        await env.AI_NEWSCAST_BUCKET.put(htmlKey, result.html);
        console.log(`[TOPICS R2] HTML saved successfully`);
      }

      // Save JSON to R2
      const jsonKey = `${basePath}/topics.json`;
      const jsonData = {
        timestamp: result.metrics?.timing.startedAt ?? now.toISOString(),
        count: result.topics.length,
        topics: result.topics,
        metrics: result.metrics
      };
      console.log(`[TOPICS R2] Saving topics JSON to: ${jsonKey}`);
      await env.AI_NEWSCAST_BUCKET.put(jsonKey, JSON.stringify(jsonData, null, 2));
      console.log(`[TOPICS R2] Topics JSON saved successfully`);

      // Store the newscast ID in KV
      console.log(`[TOPICS KV] Storing newscast ID in KV: ${timestamp}`);
      await env.AI_NEWSCAST_KV.put('last-working-newscast-id', timestamp);
      console.log(`[TOPICS KV] Newscast ID stored successfully`);

      // Save news_ids to topic-{index}/news-list.json
      console.log(`[TOPICS R2] Saving ${result.topics.length} topic-specific news lists`);
      for (let i = 0; i < result.topics.length; i++) {
        const topic = result.topics[i];
        const topicIndex = (i + 1).toString().padStart(2, '0');
        const newsListKey = `${basePath}/topic-${topicIndex}/news-list.json`;

        console.log(`[TOPICS R2] Saving topic ${topicIndex} news list: ${newsListKey} (${topic.news_ids.length} items)`);
        await env.AI_NEWSCAST_BUCKET.put(newsListKey, JSON.stringify({
          topicIndex: i + 1,
          newsIDs: topic.news_ids,
          count: topic.news_ids.length,
          timestamp: result.metrics?.timing.startedAt ?? now.toISOString()
        }, null, 2));
      }
      console.log(`[TOPICS R2] All topic-specific news lists saved`);

      // Save flattened news list entries to newscasts/{newscast-id}/news-list.json
      console.log(`[TOPICS R2] Creating flattened news list`);
      const flattenedNewsEntries = [];
      for (let i = 0; i < result.topics.length; i++) {
        const topic = result.topics[i];
        const topicIndex = i + 1;

        for (const newsID of topic.news_ids) {
          flattenedNewsEntries.push({
            topicIndex: topicIndex,
            newsID: newsID
          });
        }
      }

      const newsListKey = `${basePath}/news-list.json`;
      console.log(`[TOPICS R2] Saving flattened news list: ${newsListKey} (${flattenedNewsEntries.length} total items)`);
      await env.AI_NEWSCAST_BUCKET.put(newsListKey, JSON.stringify(flattenedNewsEntries, null, 2));
      console.log(`[TOPICS R2] Flattened news list saved successfully`);

      // Initialize queue index in KV
      console.log(`[TOPICS KV] Initializing queue index to 0`);
      await env.AI_NEWSCAST_KV.put('last-working-news-queue-index', '0');
      console.log(`[TOPICS KV] Queue index initialized successfully`);

      // Add R2 save info to response
      responseData.message = 'Topics and news lists saved to R2';
      responseData.path = basePath;
      responseData.newscastID = timestamp;

      console.log(`[TOPICS R2] All R2 operations completed successfully`);
    }

    console.log(`[TOPICS SUCCESS] Returning response with ${responseData.count} topics`);
    return response(cors(json(responseData)));

  } catch (error) {
    console.error(`[TOPICS ERROR] ${new Date().toISOString()}`);
    console.error('[TOPICS ERROR] Error details:', error);

    if (error instanceof Error) {
      console.error(`[TOPICS ERROR] Error name: ${error.name}`);
      console.error(`[TOPICS ERROR] Error message: ${error.message}`);
      console.error(`[TOPICS ERROR] Error stack: ${error.stack}`);
    }

    throw error;
  }
}