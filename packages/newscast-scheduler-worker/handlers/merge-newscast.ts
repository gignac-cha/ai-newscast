import type { Env } from '../types/env';

/**
 * 10:11-10:20 - Merge Newscast (토픽별)
 *
 * newscast-generator-worker의 /newscast 엔드포인트 호출
 * 10:11 → 토픽 1, 10:12 → 토픽 2, ..., 10:20 → 토픽 10
 */
export async function handleMergeNewscast(request: Request, env: Env, topicIndex?: number): Promise<Response> {
	console.log('[MergeNewscast] Starting...');

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
		fetchURL.pathname = '/newscast';
		fetchURL.searchParams.set('newscast-id', newscastID);
		fetchURL.searchParams.set('topic-index', topic.toString());
		fetchURL.searchParams.set('save', 'true');
		const response = await env.NEWSCAST_GENERATOR_WORKER.fetch(fetchURL.toString(), {
			method: 'POST',
		});

		const result = await response.json();

		console.log(`[MergeNewscast] Success for topic ${topic}:`, result);

		return new Response(JSON.stringify({
			success: true,
			step: 'merge-newscast',
			newscastID,
			topicIndex: topic,
			timestamp: new Date().toISOString(),
			result,
		}, null, 2), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[MergeNewscast] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'merge-newscast',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
