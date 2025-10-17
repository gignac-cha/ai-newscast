import type { Env } from '../types/env';

/**
 * 09:10-09:40 - Crawl News Details (매분 배치 처리)
 *
 * news-crawler-worker의 /news-details 엔드포인트 호출
 * KV에서 last-working-newscast-id 읽어서 전달
 */
export async function handleCrawlNewsDetails(request: Request, env: Env): Promise<Response> {
	console.log('[CrawlNewsDetails] Starting...');

	try {
		// KV에서 최신 newscast-id 가져오기
		const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

		if (!newscastID) {
			throw new Error('No newscast-id found in KV. Run crawl-topics first.');
		}

		// Service Binding을 통한 내부 호출
		const response = await env.NEWS_CRAWLER_WORKER.fetch(`http://www.example.com/details?newscast-id=${newscastID}`, {
			method: 'POST',
		});

		const result = await response.json();

		console.log('[CrawlNewsDetails] Success:', result);

		return new Response(JSON.stringify({
			success: true,
			step: 'crawl-news-details',
			newscast_id: newscastID,
			timestamp: new Date().toISOString(),
			result,
		}, null, 2), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[CrawlNewsDetails] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'crawl-news-details',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
