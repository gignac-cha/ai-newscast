import { crawlNewsDetail } from '@ai-newscast/news-crawler/crawl-news-detail.ts';
import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
}

export async function handleNewsDetails(
  url: URL,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const newscastID = url.searchParams.get('newscast-id');

  if (!newscastID) {
    return response(cors(error('Bad Request', 'Missing required parameter: newscast-id')));
  }

  try {
    // Read the flattened news-list.json
    const newsListKey = `newscasts/${newscastID}/news-list.json`;
    const newsListData = await env.AI_NEWSCAST_BUCKET.get(newsListKey);

    if (!newsListData) {
      return response(cors(error('Not Found', `News list not found for newscast ${newscastID}`)));
    }

    const newsList: Array<{ index: number; newsID: string }> = JSON.parse(await newsListData.text());

    // Get current queue index from KV
    const currentIndexStr = await env.AI_NEWSCAST_KV.get('last-working-news-queue-index') || '0';
    const currentIndex = parseInt(currentIndexStr);

    // Process 40 items starting from current index
    const batchSize = 40;
    const endIndex = Math.min(currentIndex + batchSize, newsList.length);
    const itemsToProcess = newsList.slice(currentIndex, endIndex);

    if (itemsToProcess.length === 0) {
      return response(cors(json({
        success: true,
        newscast_id: newscastID,
        message: 'No more items to process',
        current_index: currentIndex,
        total_items: newsList.length
      })));
    }

    // Process news details in batches to avoid subrequest limits (max 10 per batch)
    const subrequestBatchSize = 10;
    const responses: Response[] = [];

    for (let i = 0; i < itemsToProcess.length; i += subrequestBatchSize) {
      const batch = itemsToProcess.slice(i, i + subrequestBatchSize);

      const batchPromises = batch.map(async (item) => {
        try {
          const newsDetailURL = new URL(`http://www.example.com/news-detail?news-id=${item.newsID}&newscast-id=${newscastID}&topic-index=${item.index}`);
          return await handleNewsDetail(newsDetailURL, env);
        } catch (err) {
          return response(cors(error(err instanceof Error ? err : 'Unknown error')));
        }
      });

      const batchResponses = await Promise.all(batchPromises);
      responses.push(...batchResponses);
    }

    // Update KV with new index
    const newIndex = endIndex;
    await env.AI_NEWSCAST_KV.put('last-working-news-queue-index', newIndex.toString());

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Count successful and failed responses
    const successCount = responses.filter(response => response.ok).length;
    const failureCount = responses.length - successCount;

    const responseData = {
      success: true,
      newscast_id: newscastID,
      total_items: newsList.length,
      processed_batch_size: itemsToProcess.length,
      current_index: currentIndex,
      new_index: newIndex,
      success_count: successCount,
      failure_count: failureCount,
      execution_time_ms: executionTime,
      timestamp: new Date().toISOString(),
      message: `Successfully processed ${successCount}/${itemsToProcess.length} news items (index ${currentIndex}-${endIndex-1})`
    };

    return response(cors(json(responseData)));

  } catch (err) {
    console.error('Process news details error:', err);
    return response(cors(error(err instanceof Error ? err : 'Unknown error')));
  }
}

export async function handleNewsDetail(
  url: URL,
  env: Env
): Promise<Response> {
  const startTime = Date.now();
  const newsID = url.searchParams.get('news-id');
  const newscastID = url.searchParams.get('newscast-id');
  const topicIndex = url.searchParams.get('topic-index');

  if (!newsID) {
    return response(cors(error('Bad Request', 'Missing required parameter: news-id')));
  }

  const result = await crawlNewsDetail(newsID);

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  const responseData = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
    execution_time_ms: executionTime,
    message: undefined as string | undefined,
    path: undefined as string | undefined,
    newscast_id: undefined as string | undefined
  };

  // If newscastID is provided, save to R2 in newscast folder
  if (newscastID) {
    let newsDetailKey: string;

    if (topicIndex) {
      // Save to topic-specific folder: topic-{index:02}/news/{news-id}.json
      const topicFolder = `topic-${topicIndex.padStart(2, '0')}`;
      newsDetailKey = `newscasts/${newscastID}/${topicFolder}/news/${newsID}.json`;
    } else {
      // Fallback to old structure
      newsDetailKey = `newscasts/${newscastID}/news/${newsID}.json`;
    }

    const newsDetailData = {
      ...result,
      execution_time_ms: executionTime
    };
    await env.AI_NEWSCAST_BUCKET.put(newsDetailKey, JSON.stringify(newsDetailData, null, 2));

    responseData.message = 'News detail saved to R2';
    responseData.path = newsDetailKey;
    responseData.newscast_id = newscastID;
  }

  return response(cors(json(responseData)));
}