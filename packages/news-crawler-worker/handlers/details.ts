import { crawlNewsDetail, type NewsDetailsMetrics, type NewsDetailsItem } from '@ai-newscast/news-crawler/crawl-news-detail.ts';
import { response, cors, json, error } from '@ai-newscast/core-worker';

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

    const newsList: Array<{ topicIndex: number; newsID: string }> = JSON.parse(await newsListData.text());
    console.log(`[NEWS_DETAILS R2] Loaded news list with ${newsList.length} total items`);

    const invalidItems = newsList.filter((item) => typeof item.topicIndex !== 'number' || Number.isNaN(item.topicIndex));
    if (invalidItems.length > 0) {
      console.error(`[NEWS_DETAILS ERROR] Invalid topicIndex detected in news list`, invalidItems.slice(0, 5));
      return response(cors(error('Internal Server Error', 'Invalid news list format: topicIndex missing or not a number')));
    }

    // Get current queue index from KV
    const currentIndexStr = await env.AI_NEWSCAST_KV.get('last-working-news-queue-index') ?? '0';
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
        newscastID,
        message: 'No more items to process',
        currentIndex,
        totalItems: newsList.length
      })));
    }

    // Process news details in batches to avoid subrequest limits (max 10 per batch)
    const subrequestBatchSize = 10;
    const responses: Response[] = [];
    const items: NewsDetailsItem[] = [];
    const fileSizes: number[] = [];
    const individualTimes: number[] = [];
    console.log(`[NEWS_DETAILS PROCESS] Processing in sub-batches of ${subrequestBatchSize}`);

    for (let i = 0; i < itemsToProcess.length; i += subrequestBatchSize) {
      const batch = itemsToProcess.slice(i, i + subrequestBatchSize);
      console.log(`[NEWS_DETAILS SUB_BATCH] Processing sub-batch ${Math.floor(i/subrequestBatchSize) + 1}: ${batch.length} items`);

      const batchPromises = batch.map(async (item, itemIndex) => {
        const itemStartTime = Date.now();
        const itemStartedAt = new Date().toISOString();

        try {
          const topicIndex = item.topicIndex;
          const newsDetailURL = new URL('http://www.example.com');
          newsDetailURL.pathname = '/news-detail';
          newsDetailURL.searchParams.set('news-id', item.newsID);
          newsDetailURL.searchParams.set('newscast-id', newscastID);
          newsDetailURL.searchParams.set('topic-index', topicIndex.toString());
          newsDetailURL.searchParams.set('save', 'true');
          console.log(`[NEWS_DETAILS ITEM] Processing item ${i + itemIndex + 1}/${itemsToProcess.length}: ${item.newsID}`);
          const result = await handleNewsDetail(newsDetailURL, env);
          console.log(`[NEWS_DETAILS ITEM] Completed item ${i + itemIndex + 1}: ${result.status}`);

          const itemCompletedAt = new Date().toISOString();
          const itemTime = Date.now() - itemStartTime;
          individualTimes.push(itemTime);

          // Try to extract file size from response
          const resultData = await result.clone().json() as any;
          const fileSize = resultData?.data ? JSON.stringify(resultData.data).length : 0;
          fileSizes.push(fileSize);

          items.push({
            newsID: item.newsID,
            topicIndex: item.topicIndex,
            status: 'success',
            timing: {
              startedAt: itemStartedAt,
              completedAt: itemCompletedAt,
              duration: itemTime
            },
            fileSize
          });

          return result;
        } catch (err) {
          console.error(`[NEWS_DETAILS ITEM] Failed item ${i + itemIndex + 1}: ${item.newsID}`, err);

          const itemCompletedAt = new Date().toISOString();
          const itemTime = Date.now() - itemStartTime;
          individualTimes.push(itemTime);

          const errorMessage = err instanceof Error ? err.message : 'Unknown error';
          items.push({
            newsID: item.newsID,
            topicIndex: item.topicIndex,
            status: 'error',
            timing: {
              startedAt: itemStartedAt,
              completedAt: itemCompletedAt,
              duration: itemTime
            },
            error: errorMessage
          });

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

    const completedAt = new Date().toISOString();
    const endTime = Date.now();
    const duration = endTime - startTime;

    // Count successful and failed responses
    const successCount = responses.filter(response => response.ok).length;
    const errorCount = responses.length - successCount;
    const totalNewsIDs = itemsToProcess.length;
    const successRate = totalNewsIDs > 0 ? (successCount / totalNewsIDs) * 100 : 0;

    // Calculate file size metrics
    const totalBytes = fileSizes.reduce((sum, size) => sum + size, 0);
    const averageBytes = fileSizes.length > 0 ? totalBytes / fileSizes.length : 0;
    const maximumBytes = fileSizes.length > 0 ? Math.max(...fileSizes) : 0;
    const minimumBytes = fileSizes.length > 0 ? Math.min(...fileSizes) : 0;

    // Calculate performance metrics
    const totalTime = individualTimes.reduce((sum, time) => sum + time, 0);
    const averageTime = individualTimes.length > 0 ? totalTime / individualTimes.length : 0;
    const maximumTime = individualTimes.length > 0 ? Math.max(...individualTimes) : 0;
    const minimumTime = individualTimes.length > 0 ? Math.min(...individualTimes) : 0;

    console.log(`[NEWS_DETAILS RESULT] Processed ${responses.length} items: ${successCount} success, ${errorCount} failures`);
    console.log(`[NEWS_DETAILS RESULT] Execution time: ${duration}ms`);

    // Save metrics to R2
    const batchNumber = Math.floor(currentIndex / batchSize) + 1;
    const metricsKey = `newscasts/${newscastID}/news-details-${batchNumber.toString().padStart(3, '0')}.json`;

    const metrics = {
      newscastID,
      batchNumber,
      batchRange: {
        startIndex: currentIndex,
        endIndex: newIndex - 1,
        totalItems: totalNewsIDs
      },
      timing: {
        startedAt: new Date(startTime).toISOString(),
        completedAt,
        duration
      },
      processing: {
        totalNewsIDs,
        successCount,
        errorCount,
        successRate
      },
      fileSizes: {
        totalBytes,
        averageBytes,
        maximumBytes,
        minimumBytes
      },
      performance: {
        averageTime,
        maximumTime,
        minimumTime,
        totalTime
      },
      items
    };

    console.log(`[NEWS_DETAILS R2] Saving metrics to: ${metricsKey}`);
    await env.AI_NEWSCAST_BUCKET.put(metricsKey, JSON.stringify(metrics, null, 2));
    console.log(`[NEWS_DETAILS R2] Metrics saved successfully`);

    const responseData = {
      success: true,
      newscastID: newscastID,
      totalItems: newsList.length,
      processedBatchSize: itemsToProcess.length,
      currentIndex: currentIndex,
      newIndex: newIndex,
      successCount: successCount,
      errorCount: errorCount,
      executionTime: duration,
      timestamp: completedAt,
      metricsPath: metricsKey,
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
  const saveToR2 = url.searchParams.get('save') === 'true';

  if (!newsID) {
    return response(cors(error('Bad Request', 'Missing required parameter: news-id')));
  }

  const result = await crawlNewsDetail(newsID);

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  const responseData: {
    success: boolean;
    data: typeof result;
    timestamp: string;
    executionTime: number;
    message?: string;
    path?: string;
    newscastID?: string;
  } = {
    success: true,
    data: result,
    timestamp: new Date().toISOString(),
    executionTime,
  };

  // Save to R2 if newscastID and save=true are provided
  if (newscastID && saveToR2) {
    const newsDetailKey = topicIndex
      ? `newscasts/${newscastID}/topic-${topicIndex.padStart(2, '0')}/news/${newsID}.json`
      : `newscasts/${newscastID}/news/${newsID}.json`;

    const newsDetailData = {
      ...result,
      executionTime
    };
    await env.AI_NEWSCAST_BUCKET.put(newsDetailKey, JSON.stringify(newsDetailData, null, 2));

    responseData.message = 'News detail saved to R2';
    responseData.path = newsDetailKey;
    responseData.newscastID = newscastID;
  }

  return response(cors(json(responseData)));
}
