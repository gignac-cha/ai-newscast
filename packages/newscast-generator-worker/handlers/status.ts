import type { Env } from '../types/env.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';
import { response } from '../utils/response.ts';

export interface StatusResponse {
  status: 'healthy';
  service: 'newscast-generator-worker';
  version: string;
  timestamp: string;
  endpoints: {
    script: string;
    audio: string;
    newscast: string;
  };
  environment: {
    hasGeminiAPIKey: boolean;
    hasTTSAPIKey: boolean;
    hasBucket: boolean;
    hasKV: boolean;
  };
}

export async function handleStatus(
  _request: Request,
  env: Env
): Promise<Response> {
  const statusData: StatusResponse = {
    status: 'healthy',
    service: 'newscast-generator-worker',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      script: 'GET /script?newscast-id={id}&topic-index={n}',
      audio: 'GET /audio?newscast-id={id}&topic-index={n}',
      newscast: 'GET /newscast?newscast-id={id}&topic-index={n}',
    },
    environment: {
      hasGeminiAPIKey: !!env.GOOGLE_GEN_AI_API_KEY,
      hasTTSAPIKey: !!env.GOOGLE_CLOUD_API_KEY,
      hasBucket: !!env.AI_NEWSCAST_BUCKET,
      hasKV: !!env.AI_NEWSCAST_KV,
    },
  };

  return response(cors(json(statusData)));
}
