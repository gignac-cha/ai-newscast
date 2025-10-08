// Import handlers
import { handleHelp } from './handlers/help.ts';
import { handleScript } from './handlers/script.ts';
import { handleAudio } from './handlers/audio.ts';
import { handleNewscast } from './handlers/newscast.ts';
import { handleStatus } from './handlers/status.ts';
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

      if (request.method === 'GET' && url.pathname === '/status') {
        return handleStatus(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/script') {
        return handleScript(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/audio') {
        return handleAudio(request, env);
      }

      if (request.method === 'GET' && url.pathname === '/newscast') {
        return handleNewscast(request, env);
      }

      return response(cors(error('Not Found', 'Available endpoints: GET /, GET /status, GET /script?newscast-id=X&topic-index=N, GET /audio?newscast-id=X&topic-index=N, GET /newscast?newscast-id=X&topic-index=N')));

    } catch (err) {
      console.error('Worker error:', err);
      return response(cors(error(err instanceof Error ? err : 'Unknown error')));
    }
  },

  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    const executeScheduledTask = async () => {
      const startTime = new Date().toISOString();
      console.log(`[NEWSCAST_SCHEDULED START] ${startTime} - Cron: ${controller.cron}`);

      try {
        const cronExpression = controller.cron;
        console.log(`[NEWSCAST_SCHEDULED INFO] Processing cron expression: ${cronExpression}`);

        const workingNewscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');
        console.log(`[NEWSCAST_SCHEDULED INFO] Retrieved working newscast ID: ${workingNewscastID}`);

        const scheduledTime = new Date(controller.scheduledTime);
        const scheduledHour = scheduledTime.getHours();
        const scheduledMinute = scheduledTime.getMinutes();
        const minuteOfDay = scheduledHour * 60 + scheduledMinute;
        const hourLabel = scheduledHour.toString().padStart(2, '0');
        const minuteLabel = scheduledMinute.toString().padStart(2, '0');
        console.log(`[NEWSCAST_SCHEDULED TIME] Scheduled time: ${hourLabel}:${minuteLabel} UTC (minute of day: ${minuteOfDay})`);

        switch (cronExpression) {
          case "1-10 10 * * *": {
            console.log(`[NEWSCAST_SCHEDULED SCRIPT] Daily slots run from 10:01 UTC (topic 1) through 10:10 UTC (topic 10)`);

            if (!workingNewscastID) {
              console.warn(`[NEWSCAST_SCHEDULED SKIP] No working newscast ID found in KV. Skipping script generation.`);
              break;
            }

            const firstSlotMinute = (10 * 60) + 1; // 10:01 UTC
            const offset = minuteOfDay - firstSlotMinute;
            const topicIndex = Math.min(Math.max(offset + 1, 1), 10);
            console.log(`[NEWSCAST_SCHEDULED SCRIPT] First slot minute: ${firstSlotMinute}, offset: ${offset}, topic index: ${topicIndex}`);

            try {
              console.log(`[NEWSCAST_SCHEDULED SCRIPT] Starting script generation for topic ${topicIndex} at ${hourLabel}:${minuteLabel}`);
              const scriptRequest = new Request(`http://www.example.com/script?newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);
              console.log(`[NEWSCAST_SCHEDULED SCRIPT] Calling handleScript with newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);

              const result = await handleScript(scriptRequest, env);
              console.log(`[NEWSCAST_SCHEDULED SCRIPT] Script generation completed. Status: ${result.status}`);

              if (result.status === 200) {
                const responseText = await result.text();
                console.log(`[NEWSCAST_SCHEDULED SCRIPT] Response: ${responseText.substring(0, 500)}...`);
              } else {
                console.error(`[NEWSCAST_SCHEDULED SCRIPT] Failed with status ${result.status}`);
              }
            } catch (error) {
              console.error(`[NEWSCAST_SCHEDULED ERROR] Failed to generate script for topic ${topicIndex}:`, error);

              if (error instanceof Error) {
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error name: ${error.name}`);
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error message: ${error.message}`);
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error stack: ${error.stack}`);
              }
            }
            break;
          }

          case "11-20 10 * * *": {
            console.log(`[NEWSCAST_SCHEDULED AUDIO] Test slots run from 10:11 UTC (topic 1) through 10:20 UTC (topic 10)`);

            if (!workingNewscastID) {
              console.warn(`[NEWSCAST_SCHEDULED SKIP] No working newscast ID found in KV. Skipping audio generation.`);
              break;
            }

            const firstSlotMinute = (10 * 60) + 11; // 10:11 UTC
            const offset = minuteOfDay - firstSlotMinute;
            const topicIndex = Math.min(Math.max(offset + 1, 1), 10);
            console.log(`[NEWSCAST_SCHEDULED AUDIO] First slot minute: ${firstSlotMinute}, offset: ${offset}, topic index: ${topicIndex}`);

            try {
              console.log(`[NEWSCAST_SCHEDULED AUDIO] Starting audio generation for topic ${topicIndex} at ${hourLabel}:${minuteLabel}`);
              const audioRequest = new Request(`http://www.example.com/audio?newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);
              console.log(`[NEWSCAST_SCHEDULED AUDIO] Calling handleAudio with newscast-id=${workingNewscastID}&topic-index=${topicIndex}`);

              const result = await handleAudio(audioRequest, env);
              console.log(`[NEWSCAST_SCHEDULED AUDIO] Audio generation completed. Status: ${result.status}`);

              if (result.status === 200) {
                const responseText = await result.text();
                console.log(`[NEWSCAST_SCHEDULED AUDIO] Response: ${responseText.substring(0, 500)}...`);
              } else {
                console.error(`[NEWSCAST_SCHEDULED AUDIO] Failed with status ${result.status}`);
              }
            } catch (error) {
              console.error(`[NEWSCAST_SCHEDULED ERROR] Failed to generate audio for topic ${topicIndex}:`, error);

              if (error instanceof Error) {
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error name: ${error.name}`);
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error message: ${error.message}`);
                console.error(`[NEWSCAST_SCHEDULED ERROR] Error stack: ${error.stack}`);
              }
            }
            break;
          }

          default:
            console.warn(`[NEWSCAST_SCHEDULED WARN] Unknown cron expression: ${cronExpression}`);
            break;
        }

        const endTime = new Date().toISOString();
        console.log(`[NEWSCAST_SCHEDULED SUCCESS] Completed at ${endTime} - Cron: ${cronExpression}`);

      } catch (error) {
        const errorTime = new Date().toISOString();
        console.error(`[NEWSCAST_SCHEDULED ERROR] ${errorTime} - Cron: ${controller.cron}`);
        console.error('[NEWSCAST_SCHEDULED ERROR] Error details:', error);

        if (error instanceof Error) {
          console.error(`[NEWSCAST_SCHEDULED ERROR] Error name: ${error.name}`);
          console.error(`[NEWSCAST_SCHEDULED ERROR] Error message: ${error.message}`);
          console.error(`[NEWSCAST_SCHEDULED ERROR] Error stack: ${error.stack}`);
        } else {
          console.error(`[NEWSCAST_SCHEDULED ERROR] Non-Error object: ${JSON.stringify(error)}`);
        }
      }
    };

    // Use ctx.waitUntil to ensure the scheduled task completes
    ctx.waitUntil(executeScheduledTask());
  }
};

// Import Cloudflare Workers types
type ExecutionContext = import('@cloudflare/workers-types').ExecutionContext;
type ScheduledController = import('@cloudflare/workers-types').ScheduledController;
