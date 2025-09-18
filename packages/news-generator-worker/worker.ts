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