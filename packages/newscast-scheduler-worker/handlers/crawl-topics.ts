import type { Env } from '../types/env';

/**
 * 09:05 - Crawl Topics
 *
 * news-crawler-worker의 /topics 엔드포인트 호출
 */
export async function handleCrawlTopics(request: Request, env: Env): Promise<Response> {
	console.log('[CrawlTopics] Starting...');

	try {
		// Service Binding을 통한 내부 호출
		const url = new URL('http://www.example.com');
		url.pathname = '/topics';
		url.searchParams.set('save', 'true');
		const response = await env.NEWS_CRAWLER_WORKER.fetch(url.toString(), {
			method: 'POST',
		});

		const result = await response.json();

		console.log('[CrawlTopics] Success:', result);

		return new Response(JSON.stringify({
			success: true,
			step: 'crawl-topics',
			timestamp: new Date().toISOString(),
			result,
		}, null, 2), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[CrawlTopics] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'crawl-topics',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
