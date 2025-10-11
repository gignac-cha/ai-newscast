import type { Env } from '../types/env';

/**
 * MP3 헤더 파싱 - @ai-newscast/newscast-generator/mp3-duration-calculator.ts 기반
 */
function parseMP3Header(buffer: Uint8Array): { isValid: boolean } {
	if (buffer.length < 4) {
		return { isValid: false };
	}

	// 32비트 헤더 구성
	const header = (buffer[0] << 24) | (buffer[1] << 16) | (buffer[2] << 8) | buffer[3];

	// Frame sync 확인 (첫 11비트가 모두 1인지)
	const frameSync = (header >> 21) & 0x7FF;
	if (frameSync !== 0x7FF) {
		return { isValid: false };
	}

	return { isValid: true };
}

/**
 * R2에서 MP3 파일 검증
 */
async function validateMP3File(bucket: R2Bucket, path: string): Promise<{ valid: boolean; size: number; error?: string }> {
	try {
		const object = await bucket.get(path);

		if (!object) {
			return { valid: false, size: 0, error: 'File not found' };
		}

		// MP3 파일 헤더 검증을 위해 첫 4바이트 읽기
		const arrayBuffer = await object.arrayBuffer();
		const uint8Array = new Uint8Array(arrayBuffer);

		if (uint8Array.length === 0) {
			return { valid: false, size: 0, error: 'Empty file' };
		}

		// MP3 헤더 유효성 검증
		const headerInfo = parseMP3Header(uint8Array);
		if (!headerInfo.isValid) {
			return { valid: false, size: uint8Array.length, error: 'Invalid MP3 header' };
		}

		return { valid: true, size: uint8Array.length };
	} catch (error) {
		return {
			valid: false,
			size: 0,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * 10:30 UTC - Complete Pipeline (모든 토픽 검증 후 latest-newscast-id 업데이트)
 *
 * 1. R2에서 10개 토픽의 newscast.mp3 파일 존재 및 유효성 검증
 * 2. 모두 성공 시 newscast-latest-id-worker를 통해 latest-newscast-id 업데이트
 */
export async function handleComplete(request: Request, env: Env): Promise<Response> {
	console.log('[Complete] Starting pipeline completion validation...');

	try {
		// KV에서 최신 newscast-id 가져오기
		const newscastID = await env.AI_NEWSCAST_KV.get('last-working-newscast-id');

		if (!newscastID) {
			throw new Error('No newscast-id found in KV.');
		}

		console.log(`[Complete] Validating newscast-id: ${newscastID}`);

		// 10개 토픽의 MP3 파일 검증
		const validationResults = [];
		let allValid = true;

		for (let topicIndex = 1; topicIndex <= 10; topicIndex++) {
			const topicIndexPadded = topicIndex.toString().padStart(2, '0');
			const mp3Path = `newscasts/${newscastID}/topic-${topicIndexPadded}/newscast.mp3`;

			console.log(`[Complete] Validating topic ${topicIndex}: ${mp3Path}`);

			const result = await validateMP3File(env.AI_NEWSCAST_BUCKET, mp3Path);

			validationResults.push({
				topicIndex: topicIndex,
				path: mp3Path,
				valid: result.valid,
				size: result.size,
				error: result.error,
			});

			if (!result.valid) {
				allValid = false;
				console.error(`[Complete] Topic ${topicIndex} validation failed: ${result.error}`);
			} else {
				console.log(`[Complete] Topic ${topicIndex} validation passed (${result.size} bytes)`);
			}
		}

		// 모든 토픽이 유효한 경우에만 latest-newscast-id 업데이트
		if (allValid) {
			console.log(`[Complete] All topics validated successfully. Updating latest-newscast-id...`);

			// KV에 직접 업데이트
			const previousID = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
			await env.AI_NEWSCAST_KV.put('latest-newscast-id', newscastID);

			console.log(`[Complete] latest-newscast-id updated: ${previousID} -> ${newscastID}`);

			return new Response(JSON.stringify({
				success: true,
				step: 'complete',
				newscastID: newscastID,
				previousNewscastID: previousID,
				validationResults: validationResults,
				timestamp: new Date().toISOString(),
				message: 'Pipeline completed successfully. All topics validated and latest-newscast-id updated.',
			}, null, 2), {
				headers: { 'Content-Type': 'application/json' },
			});
		} else {
			console.error(`[Complete] Validation failed for some topics. latest-newscast-id NOT updated.`);

			return new Response(JSON.stringify({
				success: false,
				step: 'complete',
				newscastID: newscastID,
				validationResults: validationResults,
				timestamp: new Date().toISOString(),
				error: 'Some topics failed validation. latest-newscast-id NOT updated.',
			}, null, 2), {
				status: 500,
				headers: { 'Content-Type': 'application/json' },
			});
		}
	} catch (error) {
		console.error('[Complete] Error:', error);

		return new Response(JSON.stringify({
			success: false,
			step: 'complete',
			timestamp: new Date().toISOString(),
			error: error instanceof Error ? error.message : String(error),
		}, null, 2), {
			status: 500,
			headers: { 'Content-Type': 'application/json' },
		});
	}
}
