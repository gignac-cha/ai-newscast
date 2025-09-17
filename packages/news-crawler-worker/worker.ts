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
      try {
        const cronExpression = controller.cron;
        const workingNewscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

        switch (cronExpression) {
          case "0 * * * *": {
            const topicsURL = new URL('http://www.example.com/topics?save=true');
            await handleTopics(topicsURL, env);
            break;
          }

          case "5-30 * * * *": {
            // Every hour at 5-30 minutes - Run news detail crawling

            if (workingNewscastID) {
              // Use handleNewsDetails without topic-index
              const newsDetailsURL = new URL(`http://www.example.com/news-details?newscast-id=${workingNewscastID}`);
              await handleNewsDetails(newsDetailsURL, env);
            }
            break;
          }

          default:
            break;
        }
      } catch (error) {
        console.error('Scheduled task error:', error);
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