import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { error } from '../utils/error.ts';

interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
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
    const totalTopics = topicsData.count ?? 0;

    // Check generation status for each topic
    const topicStatus = [];
    for (let i = 1; i <= totalTopics; i++) {
      const topicIndexPadded = i.toString().padStart(2, '0');
      const newsJsonKey = `${basePath}/topic-${topicIndexPadded}/news.json`;
      const newsMarkdownKey = `${basePath}/topic-${topicIndexPadded}/news.md`;

      const jsonExists = await env.AI_NEWSCAST_BUCKET.get(newsJsonKey);
      const markdownExists = await env.AI_NEWSCAST_BUCKET.get(newsMarkdownKey);

      let generationTime = null;
      let articlesCount = 0;
      if (jsonExists) {
        const newsData = JSON.parse(await jsonExists.text());
        generationTime = newsData.generationTimestamp;
        articlesCount = newsData.inputArticlesCount ?? 0;
      }

      topicStatus.push({
        topicIndex: i,
        generated: !!jsonExists,
        hasJSON: !!jsonExists,
        hasMarkdown: !!markdownExists,
        generationTimestamp: generationTime,
        inputArticlesCount: articlesCount
      });
    }

    const generatedCount = topicStatus.filter(t => t.generated).length;
    const completionPercentage = totalTopics > 0 ? Math.round((generatedCount / totalTopics) * 100) : 0;

    const statusData = {
      success: true,
      newscastID,
      totalTopics,
      generatedTopics: generatedCount,
      completionPercentage,
      isComplete: generatedCount === totalTopics,
      topics: topicStatus,
      timestamp: new Date().toISOString()
    };

    return response(cors(json(statusData)));

  } catch (err) {
    console.error('Status check error:', err);
    return response(cors(error(err instanceof Error ? err : 'Unknown error')));
  }
}