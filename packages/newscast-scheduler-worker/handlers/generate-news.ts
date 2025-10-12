import type { Env } from '../types/env';

/**
 * 09:41-09:50 - Generate News (토픽별)
 *
 * news-generator-worker의 /generate 엔드포인트 호출
 * 09:41 → 토픽 1, 09:42 → 토픽 2, ..., 09:50 → 토픽 10
 */
export async function handleGenerateNews(request: Request, env: Env, topicIndex?: number): Promise<Response> {
	console.log('[GenerateNews] Starting...');

	try {
		// URL에서 topic-index 파라미터 읽기 (수동 트리거용)
		const url = new URL(request.url);
		const topicIndexParam = url.searchParams.get('topic-index');
		const topic = topicIndex ?? (topicIndexParam ? parseInt(topicIndexParam, 10) : null);

		if (!topic || topic < 1 || topic > 10) {
			throw new Error('Invalid topic-index. Must be 1-10.');
		}

		// KV에서 최신 newscast-id 가져오기
		const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

		if (!newscastID) {
			throw new Error('No newscast-id found in KV.');
		}

		// Service Binding을 통한 내부 호출
		const fetchURL = new URL('http://www.example.com');
		fetchURL.pathname = '/news';
		fetchURL.searchParams.set('newscast-id', newscastID);
		fetchURL.searchParams.set('topic-index', topic.toString());
		fetchURL.searchParams.set('save', 'true');
		const response = await env.NEWS_GENERATOR_WORKER.fetch(fetchURL.toString(), {
			method: 'POST',
		});

		const result = await response.json();

		console.log(`[GenerateNews] Success for topic ${topic}:`, result);

		return new Response(JSON.stringify({
			success: true,
			step: 'generate-news',
			newscastID,
			topicIndex: topic,
			timestamp: new Date().toISOString(),
			result,
		}, null, 2), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[GenerateNews] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'generate-news',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
