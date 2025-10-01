// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleTopics } from './handlers/topics.ts';
import { handleNewsDetail, handleNewsDetails } from './handlers/news-detail.ts';

// Import utilities
import { createCORSPreflightResponse } from './utils/cors.ts';
import { response } from './utils/response.ts';
import { cors } from './utils/cors.ts';
import { error } from './utils/error.ts';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return createCORSPreflightResponse();
    }

    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return handleHelp();
      }

      if (request.method === 'GET' && url.pathname === '/topics') {
        return handleTopics(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/news-detail') {
        return handleNewsDetail(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/news-details') {
        return handleNewsDetails(url, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, GET /topics, GET /news-detail?news-id=Z, GET /news-details?news-id=Z&news-id=Y&newscast-id=Z')));

    } catch (err) {
      console.error('Worker error:', err);
      return response(cors(error(err instanceof Error ? err : 'Unknown error')));
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const executeScheduledTask = async () => {
      const startTime = new Date().toISOString();
      console.log(`[SCHEDULED START] ${startTime} - Cron: ${controller.cron}`);

      try {
        const cronExpression = controller.cron;
        console.log(`[SCHEDULED INFO] Processing cron expression: ${cronExpression}`);

        const workingNewscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
        console.log(`[SCHEDULED INFO] Retrieved working newscast ID: ${workingNewscastID}`);

        switch (cronExpression) {
          case "5 9 * * *": {
            console.log(`[SCHEDULED TOPICS] Starting topics collection at ${new Date().toISOString()}`);
            const topicsURL = new URL('http://www.example.com/topics?save=true');
            console.log(`[SCHEDULED TOPICS] Calling handleTopics with URL: ${topicsURL.toString()}`);

            const result = await handleTopics(topicsURL, env);
            console.log(`[SCHEDULED TOPICS] Topics collection completed. Status: ${result.status}`);

            if (result.status === 200) {
              const responseText = await result.text();
              console.log(`[SCHEDULED TOPICS] Response: ${responseText.substring(0, 500)}...`);
            } else {
              console.error(`[SCHEDULED TOPICS] Failed with status ${result.status}`);
            }
            break;
          }

          case "11-40 9 * * *": {
            console.log(`[SCHEDULED NEWS] Starting news details collection at ${new Date().toISOString()}`);

            if (workingNewscastID) {
              const newsDetailsURL = new URL(`http://www.example.com/news-details?newscast-id=${workingNewscastID}`);
              console.log(`[SCHEDULED NEWS] Calling handleNewsDetails with URL: ${newsDetailsURL.toString()}`);

              const result = await handleNewsDetails(newsDetailsURL, env);
              console.log(`[SCHEDULED NEWS] News details collection completed. Status: ${result.status}`);

              if (result.status === 200) {
                const responseText = await result.text();
                console.log(`[SCHEDULED NEWS] Response: ${responseText.substring(0, 500)}...`);
              } else {
                console.error(`[SCHEDULED NEWS] Failed with status ${result.status}`);
              }
            } else {
              console.warn(`[SCHEDULED NEWS] No working newscast ID found in KV. Skipping news details collection.`);
            }
            break;
          }

          default:
            console.warn(`[SCHEDULED WARN] Unknown cron expression: ${cronExpression}`);
            break;
        }

        const endTime = new Date().toISOString();
        console.log(`[SCHEDULED SUCCESS] Completed at ${endTime} - Cron: ${cronExpression}`);

      } catch (error) {
        const errorTime = new Date().toISOString();
        console.error(`[SCHEDULED ERROR] ${errorTime} - Cron: ${controller.cron}`);
        console.error('[SCHEDULED ERROR] Error details:', error);

        if (error instanceof Error) {
          console.error(`[SCHEDULED ERROR] Error name: ${error.name}`);
          console.error(`[SCHEDULED ERROR] Error message: ${error.message}`);
          console.error(`[SCHEDULED ERROR] Error stack: ${error.stack}`);
        } else {
          console.error(`[SCHEDULED ERROR] Non-Error object: ${JSON.stringify(error)}`);
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
}

// Import Cloudflare Workers types
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext;
type ScheduledController = import('@cloudflare/workers-types').ScheduledController;