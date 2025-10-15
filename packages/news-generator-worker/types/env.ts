import type { R2Bucket, KVNamespace } from '@cloudflare/workers-types';

export interface Env {
  AI_NEWSCAST_BUCKET: R2Bucket;
  AI_NEWSCAST_KV: KVNamespace;
  GOOGLE_GEN_AI_API_KEY: string;
  GEMINI_MODEL?: string;
}
