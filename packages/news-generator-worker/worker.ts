// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleGenerate } from './handlers/generate.ts';
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

      if (request.method === 'POST' && url.pathname === '/generate') {
        return handleGenerate(url, env);
      }

      if (request.method === 'GET' && url.pathname === '/status') {
        return handleStatus(url, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, POST /generate?newscast-id=Z&topic-index=N, GET /status?newscast-id=Z')));

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
          case "41-50 9 * * *": {
            // Daily at 9:41-50AM - Generate news for specific topic based on minute
            if (workingNewscastID) {
              // Extract minute from scheduled time to determine which topic to process
              const scheduledTime = new Date(controller.scheduledTime);
              const minute = scheduledTime.getUTCMinutes();

              // Map minute to topic index: 41->1, 42->2, 43->3, 44->4, 45->5, 46->6, 47->7, 48->8, 49->9, 50->10
              const topicIndex = minute - 40; // 41-40=1, 42-40=2, ..., 50-40=10

              try {
                console.log(`[Schedule] Generating news for topic ${topicIndex} (minute ${minute}) in newscast: ${workingNewscastID}`);
                const generateURL = new URL(`http://www.example.com/generate?newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);
                await handleGenerate(generateURL, env);
                console.log(`[Schedule] Completed news generation for topic ${topicIndex}`);
              } catch (error) {
                console.error(`[Schedule] Failed to generate news for topic ${topicIndex}:`, error);
              }
            } else {
              console.log('[Schedule] No working newscast ID found, skipping news generation');
            }
            break;
          }

          default:
            console.log(`[Schedule] Unknown cron expression: ${cronExpression}`);
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

  // Environment variables
  GOOGLE_GEN_AI_API_KEY: string;
}

// Import Cloudflare Workers types
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext;