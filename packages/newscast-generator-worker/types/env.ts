import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
  GOOGLE_GEN_AI_API_KEY: string;
  GOOGLE_CLOUD_API_KEY: string;
  AWS_LAMBDA_NEWSCAST_API_URL: string;
  GEMINI_MODEL?: string;
  TTS_DELAY_MS?: string;
}
