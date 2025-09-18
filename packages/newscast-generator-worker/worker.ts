// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleScript } from './handlers/script.ts';
import type { Env } from './types/env.ts';

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

      if (request.method === 'GET' && url.pathname === '/script') {
        return handleScript(request, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, GET /script?newscast-id=X&topic-index=N')));

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
        const scheduledTime = new Date(controller.scheduledTime);
        const scheduledHour = scheduledTime.getHours();
        const scheduledMinute = scheduledTime.getMinutes();
        const minuteOfDay = scheduledHour * 60 + scheduledMinute;
        const hourLabel = scheduledHour.toString().padStart(2, '0');
        const minuteLabel = scheduledMinute.toString().padStart(2, '0');

        switch (cronExpression) {
          case "51-59 9 * * *":
          case "0 10 * * *": {
            // Slots run from 09:51 UTC (topic 1) through 10:00 UTC (topic 10)
            if (!workingNewscastID) {
              console.log('[Schedule] Skipping script generation – no working newscast ID');
              break;
            }

            const firstSlotMinute = (9 * 60) + 51; // 09:51 UTC
            const offset = minuteOfDay - firstSlotMinute;
            const topicIndex = Math.min(Math.max(offset + 1, 1), 10);

            try {
              console.log(`[Schedule] (${hourLabel}:${minuteLabel}) Generating script for topic ${topicIndex}`);
              const scriptRequest = new Request(`http://www.example.com/script?newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);
              await handleScript(scriptRequest, env);
              console.log(`[Schedule] Completed script generation for topic ${topicIndex}`);
            } catch (error) {
              console.error(`[Schedule] Failed to generate script for topic ${topicIndex}:`, error);
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

// Import Cloudflare Workers types
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext;
type ScheduledController = import('@cloudflare/workers-types').ScheduledController;
