import type { Env } from '../types/env';

/**
 * 10:01-10:10 - Generate Audio (토픽별)
 *
 * newscast-generator-worker의 /audio 엔드포인트 호출
 * 10:01 → 토픽 1, 10:02 → 토픽 2, ..., 10:10 → 토픽 10
 */
export async function handleGenerateAudio(request: Request, env: Env, topicIndex?: number): Promise<Response> {
	console.log('[GenerateAudio] Starting...');

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
		const response = await env.NEWSCAST_GENERATOR_WORKER.fetch(`http://internal/audio?newscast-id=${newscastID}&topic-index=${topic}`, {
			method: 'GET',
		});

		const result = await response.json();

		console.log(`[GenerateAudio] Success for topic ${topic}:`, result);

		return new Response(JSON.stringify({
			success: true,
			step: 'generate-audio',
			newscast_id: newscastID,
			topic_index: topic,
			timestamp: new Date().toISOString(),
			result,
		}, null, 2), {
			headers: { 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('[GenerateAudio] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'generate-audio',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
