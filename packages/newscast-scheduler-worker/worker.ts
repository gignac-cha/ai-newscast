/**
 * Newscast Scheduler Worker
 *
 * 통합 Cron 스케줄러 - 모든 뉴스캐스트 파이프라인 단계 조율
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
			// 09:05 UTC (18:05 KST) - Crawl Topics
			if (hour === 9 && minute === 5) {
				console.log('[Scheduler] Executing: Crawl Topics');
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleCrawlTopics(new Request(url.toString()), env);
			}

			// 09:11-09:40 UTC (18:11-18:40 KST) - Crawl News Details (매분)
			if (hour === 9 && minute >= 11 && minute <= 40) {
				console.log(`[Scheduler] Executing: Crawl News Details (minute ${minute})`);
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleCrawlNewsDetails(new Request(url.toString()), env);
			}

			// 09:41-09:50 UTC (18:41-18:50 KST) - Generate News (토픽별, 10개 토픽)
			if (hour === 9 && minute >= 41 && minute <= 50) {
				const topicIndex = minute - 40; // 41분 → 토픽 1, 50분 → 토픽 10
				console.log(`[Scheduler] Executing: Generate News (topic ${topicIndex})`);
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleGenerateNews(new Request(url.toString()), env, topicIndex);
			}

			// 09:51-10:00 UTC (18:51-19:00 KST) - Generate Script (토픽 1-10)
			if ((hour === 9 && minute >= 51) || (hour === 10 && minute === 0)) {
				const topicIndex = hour === 9 ? minute - 50 : 10; // 51분 → 1, 59분 → 9, 10:00 → 10
				console.log(`[Scheduler] Executing: Generate Script (topic ${topicIndex})`);
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleGenerateScript(new Request(url.toString()), env, topicIndex);
			}

			// 10:01-10:10 UTC (19:01-19:10 KST) - Generate Audio (토픽별, 10개 토픽)
			if (hour === 10 && minute >= 1 && minute <= 10) {
				const topicIndex = minute; // 1분 → 토픽 1, 10분 → 토픽 10
				console.log(`[Scheduler] Executing: Generate Audio (topic ${topicIndex})`);
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleGenerateAudio(new Request(url.toString()), env, topicIndex);
			}

			// 10:11-10:20 UTC (19:11-19:20 KST) - Merge Newscast (토픽별, 10개 토픽)
			if (hour === 10 && minute >= 11 && minute <= 20) {
				const topicIndex = minute - 10; // 11분 → 토픽 1, 20분 → 토픽 10
				console.log(`[Scheduler] Executing: Merge Newscast (topic ${topicIndex})`);
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleMergeNewscast(new Request(url.toString()), env, topicIndex);
			}

			// 10:30 UTC (19:30 KST) - Complete Pipeline (모든 토픽 검증 후 latest-newscast-id 업데이트)
			if (hour === 10 && minute === 30) {
				console.log('[Scheduler] Executing: Complete Pipeline');
				const url = new URL(BASE_URL);
				url.pathname = '/scheduled';
				await handleComplete(new Request(url.toString()), env);
			}
		} catch (error) {
			console.error('[Scheduler] Error:', error);
			// Cron 실행은 계속되어야 하므로 에러를 삼킴
		}
	},
};
