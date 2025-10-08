// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleTopics } from './handlers/topics.ts';
import { handleNewsDetail, handleNewsDetails } from './handlers/details.ts';
import { handleStatus } from './handlers/status.ts';

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

      if (request.method === 'GET' && url.pathname === '/detail') {
        return handleNewsDetail(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/details') {
        return handleNewsDetails(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/status') {
        return handleStatus(url, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, GET /topics, GET /detail?news-id=Z, GET /details?newscast-id=Z, GET /status?newscast-id=Z')));

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
            console.log(`[SCHEDULED DETAILS] Starting details collection at ${new Date().toISOString()}`);

            if (workingNewscastID) {
              const detailsURL = new URL(`http://www.example.com/details?newscast-id=${workingNewscastID}`);
              console.log(`[SCHEDULED DETAILS] Calling handleDetails with URL: ${detailsURL.toString()}`);

              const result = await handleNewsDetails(detailsURL, env);
              console.log(`[SCHEDULED DETAILS] Details collection completed. Status: ${result.status}`);

              if (result.status === 200) {
                const responseText = await result.text();
                console.log(`[SCHEDULED DETAILS] Response: ${responseText.substring(0, 500)}...`);
              } else {
                console.error(`[SCHEDULED DETAILS] Failed with status ${result.status}`);
              }
            } else {
              console.warn(`[SCHEDULED DETAILS] No working newscast ID found in KV. Skipping details collection.`);
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