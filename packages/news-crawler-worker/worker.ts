// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleTopics } from './handlers/topics.ts';
import { handleNewsDetail, handleNewsDetails } from './handlers/details.ts';
import { handleStatus } from './handlers/status.ts';

// Import utilities
import { createCORSPreflightResponse, response, cors, json, error, noCache } from '@ai-newscast/core-worker';

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return createCORSPreflightResponse();
    }

    try {
      if (request.method === 'GET' && url.pathname === '/health') {
        return response(noCache(cors(json({ status: 'ok', service: 'news-crawler-worker' }))));
      }

      if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/help')) {
        return handleHelp();
      }

      if (request.method === 'POST' && url.pathname === '/topics') {
        // POST: Create new topics resource (add ?save=true to save to R2)
        return handleTopics(url, env);
      }

      if (request.method === 'POST' && url.pathname === '/detail') {
        // POST: Create new news detail resource (add ?save=true to save to R2)
        return handleNewsDetail(url, env);
      }

      if (request.method === 'POST' && url.pathname === '/details') {
        // POST: Create news details batch (always saves to R2)
        return handleNewsDetails(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/status') {
        return handleStatus(url, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, POST /topics, POST /detail, POST /details, GET /status')));

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
        const BASE_URL = 'http://www.example.com';
        const cronExpression = controller.cron;
        console.log(`[SCHEDULED INFO] Processing cron expression: ${cronExpression}`);

        const workingNewscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
        console.log(`[SCHEDULED INFO] Retrieved working newscast ID: ${workingNewscastID}`);

        switch (cronExpression) {
          case "5 9 * * *": {
            console.log(`[SCHEDULED TOPICS] Starting topics collection at ${new Date().toISOString()}`);
            const topicsURL = new URL(BASE_URL);
            topicsURL.pathname = '/topics';
            topicsURL.searchParams.set('save', 'true');
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
              const detailsURL = new URL(BASE_URL);
              detailsURL.pathname = '/details';
              detailsURL.searchParams.set('newscast-id', workingNewscastID);
              detailsURL.searchParams.set('save', 'true');
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