/**
 * Cloudflare Workers Environment
 */
export interface Env {
	// KV Namespace
	AI_NEWSCAST_KV: KVNamespace;

	// R2 Bucket
	AI_NEWSCAST_BUCKET: R2Bucket;

	// Service Bindings (worker 간 내부 통신)
	NEWS_CRAWLER_WORKER: Fetcher;
	NEWS_GENERATOR_WORKER: Fetcher;
	NEWSCAST_GENERATOR_WORKER: Fetcher;
}
