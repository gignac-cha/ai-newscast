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

  console.log(`[NEWS_DETAILS START] ${new Date().toISOString()} - newscastID: ${newscastID}`);

  if (!newscastID) {
    console.error(`[NEWS_DETAILS ERROR] Missing newscast-id parameter`);
    return response(cors(error('Bad Request', 'Missing required parameter: newscast-id')));
  }

  try {
    // Read the flattened news-list.json
    const newsListKey = `newscasts/${newscastID}/news-list.json`;
    console.log(`[NEWS_DETAILS R2] Reading news list from: ${newsListKey}`);
    const newsListData = await env.AI_NEWSCAST_BUCKET.get(newsListKey);

    if (!newsListData) {
      console.error(`[NEWS_DETAILS ERROR] News list not found: ${newsListKey}`);
      return response(cors(error('Not Found', `News list not found for newscast ${newscastID}`)));
    }

    const newsList: Array<{ index: number; newsID: string }> = JSON.parse(await newsListData.text());
    console.log(`[NEWS_DETAILS R2] Loaded news list with ${newsList.length} total items`);

    // Get current queue index from KV
    const currentIndexStr = await env.AI_NEWSCAST_KV.get('last-working-news-queue-index') || '0';
    const currentIndex = parseInt(currentIndexStr);
    console.log(`[NEWS_DETAILS KV] Current queue index: ${currentIndex}`);

    // Process 40 items starting from current index
    const batchSize = 40;
    const endIndex = Math.min(currentIndex + batchSize, newsList.length);
    const itemsToProcess = newsList.slice(currentIndex, endIndex);
    console.log(`[NEWS_DETAILS BATCH] Processing items ${currentIndex}-${endIndex-1} (${itemsToProcess.length} items)`);

    if (itemsToProcess.length === 0) {
      console.log(`[NEWS_DETAILS COMPLETE] No more items to process. Queue completed.`);
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
    console.log(`[NEWS_DETAILS PROCESS] Processing in sub-batches of ${subrequestBatchSize}`);

    for (let i = 0; i < itemsToProcess.length; i += subrequestBatchSize) {
      const batch = itemsToProcess.slice(i, i + subrequestBatchSize);
      console.log(`[NEWS_DETAILS SUB_BATCH] Processing sub-batch ${Math.floor(i/subrequestBatchSize) + 1}: ${batch.length} items`);

      const batchPromises = batch.map(async (item, itemIndex) => {
        try {
          const newsDetailURL = new URL(`http://www.example.com/news-detail?news-id=${item.newsID}&newscast-id=${newscastID}&topic-index=${item.index}`);
          console.log(`[NEWS_DETAILS ITEM] Processing item ${i + itemIndex + 1}/${itemsToProcess.length}: ${item.newsID}`);
          const result = await handleNewsDetail(newsDetailURL, env);
          console.log(`[NEWS_DETAILS ITEM] Completed item ${i + itemIndex + 1}: ${result.status}`);
          return result;
        } catch (err) {
          console.error(`[NEWS_DETAILS ITEM] Failed item ${i + itemIndex + 1}: ${item.newsID}`, err);
          return response(cors(error(err instanceof Error ? err : 'Unknown error')));
        }
      });

      const batchResponses = await Promise.all(batchPromises);
      responses.push(...batchResponses);
      console.log(`[NEWS_DETAILS SUB_BATCH] Completed sub-batch ${Math.floor(i/subrequestBatchSize) + 1}`);
    }

    // Update KV with new index
    const newIndex = endIndex;
    console.log(`[NEWS_DETAILS KV] Updating queue index from ${currentIndex} to ${newIndex}`);
    await env.AI_NEWSCAST_KV.put('last-working-news-queue-index', newIndex.toString());
    console.log(`[NEWS_DETAILS KV] Queue index updated successfully`);

    const endTime = Date.now();
    const executionTime = endTime - startTime;

    // Count successful and failed responses
    const successCount = responses.filter(response => response.ok).length;
    const failureCount = responses.length - successCount;
    console.log(`[NEWS_DETAILS RESULT] Processed ${responses.length} items: ${successCount} success, ${failureCount} failures`);
    console.log(`[NEWS_DETAILS RESULT] Execution time: ${executionTime}ms`);

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

    console.log(`[NEWS_DETAILS SUCCESS] Returning response for ${itemsToProcess.length} processed items`);
    return response(cors(json(responseData)));

  } catch (err) {
    console.error(`[NEWS_DETAILS ERROR] ${new Date().toISOString()}`);
    console.error('[NEWS_DETAILS ERROR] Error details:', err);

    if (err instanceof Error) {
      console.error(`[NEWS_DETAILS ERROR] Error name: ${err.name}`);
      console.error(`[NEWS_DETAILS ERROR] Error message: ${err.message}`);
      console.error(`[NEWS_DETAILS ERROR] Error stack: ${err.stack}`);
    }

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