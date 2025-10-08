import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
}

interface TopicDetailsStatus {
  topicIndex: number;
  newsListCount: number;
  hasNewsList: boolean;
  detailsStatus: {
    totalBatches: number;
    completedBatches: number;
    completionPercentage: number;
    processedNews: number;
    remainingNews: number;
    batches: {
      batchNumber: number;
      exists: boolean;
      newsCount?: number;
      successCount?: number;
      errorCount?: number;
    }[];
  };
}

export async function handleStatus(
  url: URL,
  env: Env
): Promise<Response> {
  const newscastID = url.searchParams.get('newscast-id');

  if (!newscastID) {
    return response(cors(error('Bad Request', 'Missing required parameter: newscast-id')));
  }

  try {
    const basePath = `newscasts/${newscastID}`;

    // Check if newscast exists
    const topicsFile = await env.AI_NEWSCAST_BUCKET.get(`${basePath}/topics.json`);
    if (!topicsFile) {
      return response(cors(error('Not Found', `Newscast ${newscastID} not found`)));
    }

    // Get topics data
    const topicsData = JSON.parse(await topicsFile.text());
    const totalTopics = topicsData.metrics?.processing?.totalTopics ?? 0;

    // Check news list
    const newsListFile = await env.AI_NEWSCAST_BUCKET.get(`${basePath}/news-list.json`);
    const hasNewsList = !!newsListFile;
    let totalNewsCount = 0;
    if (newsListFile) {
      const newsListData = JSON.parse(await newsListFile.text());
      totalNewsCount = newsListData.metrics?.processing?.totalNewsIDs ?? 0;
    }

    // Check details status for each topic
    const topicsStatus: TopicDetailsStatus[] = [];
    for (let i = 1; i <= totalTopics; i++) {
      const topicIndexPadded = i.toString().padStart(2, '0');
      const topicNewsListKey = `${basePath}/topic-${topicIndexPadded}/news-list.json`;

      const topicNewsListFile = await env.AI_NEWSCAST_BUCKET.get(topicNewsListKey);

      if (!topicNewsListFile) {
        topicsStatus.push({
          topicIndex: i,
          newsListCount: 0,
          hasNewsList: false,
          detailsStatus: {
            totalBatches: 0,
            completedBatches: 0,
            completionPercentage: 0,
            processedNews: 0,
            remainingNews: 0,
            batches: []
          }
        });
        continue;
      }

      const topicNewsListData = JSON.parse(await topicNewsListFile.text());
      const newsListCount = topicNewsListData.metrics?.processing?.totalNewsIDs ?? 0;

      // Calculate total batches (40 news per batch)
      const batchSize = 40;
      const totalBatches = Math.ceil(newsListCount / batchSize);

      // Check each batch
      const batches = [];
      let completedBatches = 0;
      let processedNews = 0;

      for (let batchNum = 1; batchNum <= totalBatches; batchNum++) {
        const batchKey = `${basePath}/topic-${topicIndexPadded}/news-details-${batchNum.toString().padStart(3, '0')}.json`;
        const batchFile = await env.AI_NEWSCAST_BUCKET.get(batchKey);

        if (batchFile) {
          const batchData = JSON.parse(await batchFile.text());
          const newsCount = batchData.metrics?.items?.length ?? 0;
          const successCount = batchData.metrics?.processing?.successCount ?? 0;
          const errorCount = batchData.metrics?.processing?.errorCount ?? 0;

          completedBatches++;
          processedNews += newsCount;

          batches.push({
            batchNumber: batchNum,
            exists: true,
            newsCount,
            successCount,
            errorCount
          });
        } else {
          batches.push({
            batchNumber: batchNum,
            exists: false
          });
        }
      }

      const completionPercentage = totalBatches > 0
        ? Math.round((completedBatches / totalBatches) * 100)
        : 0;
      const remainingNews = newsListCount - processedNews;

      topicsStatus.push({
        topicIndex: i,
        newsListCount,
        hasNewsList: true,
        detailsStatus: {
          totalBatches,
          completedBatches,
          completionPercentage,
          processedNews,
          remainingNews,
          batches
        }
      });
    }

    // Calculate overall statistics
    const totalDetailsProcessed = topicsStatus.reduce((sum, topic) => sum + topic.detailsStatus.processedNews, 0);
    const totalDetailsRemaining = topicsStatus.reduce((sum, topic) => sum + topic.detailsStatus.remainingNews, 0);
    const totalBatches = topicsStatus.reduce((sum, topic) => sum + topic.detailsStatus.totalBatches, 0);
    const completedBatches = topicsStatus.reduce((sum, topic) => sum + topic.detailsStatus.completedBatches, 0);
    const overallCompletionPercentage = totalBatches > 0
      ? Math.round((completedBatches / totalBatches) * 100)
      : 0;

    const statusData = {
      success: true,
      newscastID,
      overview: {
        totalTopics,
        hasNewsList,
        totalNewsCount,
        totalDetailsProcessed,
        totalDetailsRemaining,
        totalBatches,
        completedBatches,
        completionPercentage: overallCompletionPercentage,
        isComplete: completedBatches === totalBatches && totalBatches > 0
      },
      topics: topicsStatus,
      timestamp: new Date().toISOString()
    };

    return response(cors(json(statusData)));

  } catch (err) {
    console.error('Status check error:', err);
    return response(cors(error(err instanceof Error ? err : 'Unknown error')));
  }
}
