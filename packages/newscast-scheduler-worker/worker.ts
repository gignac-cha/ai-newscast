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
import { handleHelp } from './handlers/help';
import type { Env } from './types/env';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Health check
		if (url.pathname === '/health') {
			return new Response(JSON.stringify({ status: 'ok', service: 'newscast-scheduler-worker' }), {
				headers: { 'Content-Type': 'application/json' },
			});
		}

		// Help endpoint
		if (url.pathname === '/' || url.pathname === '/help') {
			return handleHelp(request, env);
		}

		// Manual trigger endpoints (for testing)
		if (url.pathname === '/trigger/crawl-topics') {
			return handleCrawlTopics(request, env);
		}

		if (url.pathname === '/trigger/crawl-news-details') {
			return handleCrawlNewsDetails(request, env);
		}

		if (url.pathname === '/trigger/generate-news') {
			return handleGenerateNews(request, env);
		}

		if (url.pathname === '/trigger/generate-script') {
			return handleGenerateScript(request, env);
		}

		if (url.pathname === '/trigger/generate-audio') {
			return handleGenerateAudio(request, env);
		}

		if (url.pathname === '/trigger/merge-newscast') {
			return handleMergeNewscast(request, env);
		}

		return new Response('Not Found', { status: 404 });
	},

	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		const now = new Date(event.scheduledTime);
		const hour = now.getUTCHours();
		const minute = now.getUTCMinutes();

		console.log(`[Scheduler] Triggered at ${hour}:${minute} UTC`);

		try {
			// 09:05 - Crawl Topics
			if (hour === 9 && minute === 5) {
				console.log('[Scheduler] Executing: Crawl Topics');
				await handleCrawlTopics(new Request('http://internal/scheduled'), env);
			}

			// 09:11-09:40 - Crawl News Details (매분)
			if (hour === 9 && minute >= 11 && minute <= 40) {
				console.log(`[Scheduler] Executing: Crawl News Details (minute ${minute})`);
				await handleCrawlNewsDetails(new Request('http://internal/scheduled'), env);
			}

			// 09:41-09:50 - Generate News (토픽별, 10개 토픽)
			if (hour === 9 && minute >= 41 && minute <= 50) {
				const topicIndex = minute - 40; // 41분 → 토픽 1, 50분 → 토픽 10
				console.log(`[Scheduler] Executing: Generate News (topic ${topicIndex})`);
				await handleGenerateNews(new Request('http://internal/scheduled'), env, topicIndex);
			}

			// 09:51-10:00 - Generate Script (토픽 1-10)
			if ((hour === 9 && minute >= 51) || (hour === 10 && minute === 0)) {
				const topicIndex = hour === 9 ? minute - 50 : 10; // 51분 → 1, 59분 → 9, 10:00 → 10
				console.log(`[Scheduler] Executing: Generate Script (topic ${topicIndex})`);
				await handleGenerateScript(new Request('http://internal/scheduled'), env, topicIndex);
			}

			// 10:01-10:10 - Generate Audio (토픽별, 10개 토픽)
			if (hour === 10 && minute >= 1 && minute <= 10) {
				const topicIndex = minute; // 1분 → 토픽 1, 10분 → 토픽 10
				console.log(`[Scheduler] Executing: Generate Audio (topic ${topicIndex})`);
				await handleGenerateAudio(new Request('http://internal/scheduled'), env, topicIndex);
			}

			// 10:11-10:20 - Merge Newscast (토픽별, 10개 토픽)
			if (hour === 10 && minute >= 11 && minute <= 20) {
				const topicIndex = minute - 10; // 11분 → 토픽 1, 20분 → 토픽 10
				console.log(`[Scheduler] Executing: Merge Newscast (topic ${topicIndex})`);
				await handleMergeNewscast(new Request('http://internal/scheduled'), env, topicIndex);
			}
		} catch (error) {
			console.error('[Scheduler] Error:', error);
			// Cron 실행은 계속되어야 하므로 에러를 삼킴
		}
	},
};
