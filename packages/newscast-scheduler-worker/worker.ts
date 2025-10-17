/**
 * Newscast Scheduler Worker
 *
 * 통합 Cron 스케줄러 - 시간 기반 작업 오케스트레이션
 *
 * Cloudflare Workers 무료 플랜 cron 제한 (5개) 대응
 */

import { handleCrawlTopics } from './handlers/crawl-topics';
import { handleCrawlNewsDetails } from './handlers/crawl-news-details';
import { handleGenerateNews } from './handlers/generate-news';
import { handleGenerateScript } from './handlers/generate-script';
import { handleGenerateAudio } from './handlers/generate-audio';
import { handleMergeNewscast } from './handlers/merge-newscast';
import { handleComplete } from './handlers/complete';
import { handleHelp } from './handlers/help';
import type { Env } from './types/env';
import { createCORSPreflightResponse, response, cors, json } from '@ai-newscast/core-worker';
import { determineWork } from './work-scheduler';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return createCORSPreflightResponse();
		}

		if (request.method === 'GET' && url.pathname === '/health') {
			return response(cors(json({ status: 'ok', service: 'newscast-scheduler-worker' }, {
				headers: {
					'Cache-Control': 'no-cache, no-store, must-revalidate',
				},
			})));
		}

		if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/help')) {
			return handleHelp(request, env);
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const BASE_URL = 'http://www.example.com';
		const now = new Date(event.scheduledTime);
		const hour = now.getUTCHours();
		const minute = now.getUTCMinutes();

		console.log(`[Scheduler] Triggered at ${hour}:${minute} UTC`);

		try {
			// 시간 → 작업 결정
			const work = determineWork(hour, minute);

			if (!work) {
				console.log('[Scheduler] No scheduled action for this time');
				return;
			}

			// 작업 실행
			const url = new URL(BASE_URL);
			url.pathname = '/scheduled';

			switch (work.type) {
				case 'CRAWL_TOPICS':
					console.log('[Scheduler] Executing: Crawl Topics');
					await handleCrawlTopics(new Request(url.toString()), env);
					break;

				case 'CRAWL_NEWS':
					console.log(`[Scheduler] Executing: Crawl News Details (minute ${minute})`);
					await handleCrawlNewsDetails(new Request(url.toString()), env);
					break;

				case 'GENERATE_NEWS':
					console.log(`[Scheduler] Executing: Generate News (topic ${work.topicIndex})`);
					await handleGenerateNews(new Request(url.toString()), env, work.topicIndex);
					break;

				case 'GENERATE_SCRIPT':
					console.log(`[Scheduler] Executing: Generate Script (topic ${work.topicIndex})`);
					await handleGenerateScript(new Request(url.toString()), env, work.topicIndex);
					break;

				case 'GENERATE_AUDIO':
					console.log(`[Scheduler] Executing: Generate Audio (topic ${work.topicIndex})`);
					await handleGenerateAudio(new Request(url.toString()), env, work.topicIndex);
					break;

				case 'MERGE_NEWSCAST':
					console.log(`[Scheduler] Executing: Merge Newscast (topic ${work.topicIndex})`);
					await handleMergeNewscast(new Request(url.toString()), env, work.topicIndex);
					break;

				case 'COMPLETE':
					console.log('[Scheduler] Executing: Complete Pipeline');
					await handleComplete(new Request(url.toString()), env);
					break;

				default:
					// TypeScript exhaustiveness check
					const _exhaustive: never = work;
					console.error('[Scheduler] Unknown work type:', _exhaustive);
			}
		} catch (error) {
			console.error('[Scheduler] Error:', error);
			// Cron 실행은 계속되어야 하므로 에러를 삼킴
		}
	},
};
