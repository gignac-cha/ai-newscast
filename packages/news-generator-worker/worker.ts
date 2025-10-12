// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleGenerateNews } from './handlers/news.ts';
import { handleStatus } from './handlers/status.ts';

// Import utilities
import { createCORSPreflightResponse, response, cors, json, error } from '@ai-newscast/core-worker';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return createCORSPreflightResponse();
    }

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return response(cors(json({ status: 'ok', service: 'news-generator-worker' }, {
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        })));
      }

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/help')) {
        return handleHelp();
      }

      if (request.method === 'POST' && url.pathname === '/news') {
        return handleGenerateNews(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/status') {
        return handleStatus(url, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, POST /news?newscast-id=Z&topic-index=N, GET /status?newscast-id=Z')));

    } catch (err) {
      console.error('Worker error:', err);
      return response(cors(error(err instanceof Error ? err : 'Unknown error')));
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const executeScheduledTask = async () => {
      const startTime = new Date().toISOString();
      console.log(`[NEWS_GENERATOR_SCHEDULED START] ${startTime} - Cron: ${controller.cron}`);

      try {
        const BASE_URL = 'http://www.example.com';
        const cronExpression = controller.cron;
        console.log(`[NEWS_GENERATOR_SCHEDULED INFO] Processing cron expression: ${cronExpression}`);

        const workingNewscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
        console.log(`[NEWS_GENERATOR_SCHEDULED INFO] Retrieved working newscast ID: ${workingNewscastID}`);

        switch (cronExpression) {
          case "41-50 9 * * *": {
            console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Daily news generation at 9:41-50AM`);

            if (workingNewscastID) {
              // Extract minute from scheduled time to determine which topic to process
              const scheduledTime = new Date(controller.scheduledTime);
              const minute = scheduledTime.getUTCMinutes();

              // Map minute to topic index: 41->1, 42->2, 43->3, 44->4, 45->5, 46->6, 47->7, 48->8, 49->9, 50->10
              const topicIndex = minute - 40; // 41-40=1, 42-40=2, ..., 50-40=10

              console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Scheduled time: ${scheduledTime.toISOString()}, minute: ${minute}, topic: ${topicIndex}`);

              try {
                console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Starting news generation for topic ${topicIndex} in newscast: ${workingNewscastID}`);
                const generateURL = new URL(BASE_URL);
                generateURL.pathname = '/news';
                generateURL.searchParams.set('newscast-id', workingNewscastID);
                generateURL.searchParams.set('topic-index', topicIndex.toString());
                generateURL.searchParams.set('save', 'true');
                console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Calling handleGenerateNews with URL: ${generateURL.toString()}`);

                const result = await handleGenerateNews(generateURL, env);
                console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Generate request completed. Status: ${result.status}`);

                if (result.status === 200) {
                  const responseText = await result.text();
                  console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Response: ${responseText.substring(0, 500)}...`);
                } else {
                  console.error(`[NEWS_GENERATOR_SCHEDULED GENERATE] Failed with status ${result.status}`);
                }

                console.log(`[NEWS_GENERATOR_SCHEDULED GENERATE] Completed news generation for topic ${topicIndex}`);
              } catch (error) {
                console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Failed to generate news for topic ${topicIndex}:`, error);

                if (error instanceof Error) {
                  console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error name: ${error.name}`);
                  console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error message: ${error.message}`);
                  console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error stack: ${error.stack}`);
                }
              }
            } else {
              console.warn(`[NEWS_GENERATOR_SCHEDULED SKIP] No working newscast ID found in KV. Skipping news generation.`);
            }
            break;
          }

          default:
            console.warn(`[NEWS_GENERATOR_SCHEDULED WARN] Unknown cron expression: ${cronExpression}`);
            break;
        }

        const endTime = new Date().toISOString();
        console.log(`[NEWS_GENERATOR_SCHEDULED SUCCESS] Completed at ${endTime} - Cron: ${cronExpression}`);

      } catch (error) {
        const errorTime = new Date().toISOString();
        console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] ${errorTime} - Cron: ${controller.cron}`);
        console.error('[NEWS_GENERATOR_SCHEDULED ERROR] Error details:', error);

        if (error instanceof Error) {
          console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error name: ${error.name}`);
          console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error message: ${error.message}`);
          console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Error stack: ${error.stack}`);
        } else {
          console.error(`[NEWS_GENERATOR_SCHEDULED ERROR] Non-Error object: ${JSON.stringify(error)}`);
        }
      }
    };

    // Use ctx.waitUntil to ensure the scheduled task completes
    ctx.waitUntil(executeScheduledTask());
  }
};

interface Env {
  // R2 bucket binding
  AI_NEWSCAST_BUCKET: R2Bucket;

  // KV namespace binding
  AI_NEWSCAST_KV: KVNamespace;

  // Environment variables
  GOOGLE_GEN_AI_API_KEY: string;
}

// Import Cloudflare Workers types
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext;