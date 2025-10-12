import type { Env } from '../types/env';
import { response, cors, json } from '@ai-newscast/core-worker';

export async function handleHelp(request: Request, env: Env): Promise<Response> {
	const help = {
		service: 'Newscast Scheduler Worker',
		description: 'Unified cron scheduler for AI newscast pipeline orchestration',
		version: '1.0.0',
		endpoints: {
			health: 'GET /health - Health check',
			help: 'GET / or /help - This help message',
			manual_triggers: {
				crawl_topics: 'GET /trigger/crawl-topics - Manually trigger topic crawling',
				crawl_news_details: 'GET /trigger/crawl-news-details - Manually trigger news details crawling',
				generate_news: 'GET /trigger/generate-news?topic-index=N - Manually trigger news generation',
				generate_script: 'GET /trigger/generate-script?topic-index=N - Manually trigger script generation',
				generate_audio: 'GET /trigger/generate-audio?topic-index=N - Manually trigger audio generation',
				merge_newscast: 'GET /trigger/merge-newscast?topic-index=N - Manually trigger newscast merging',
			},
		},
		schedule: {
			'09:05': 'Crawl Topics',
			'09:11-09:40': 'Crawl News Details (every minute, 30 min)',
			'09:41-09:50': 'Generate News (topics 1-10, 10 min)',
			'09:51-10:00': 'Generate Script (topics 1-10, 10 min)',
			'10:01-10:10': 'Generate Audio (topics 1-10, 10 min)',
			'10:11-10:20': 'Merge Newscast (topics 1-10, 10 min)',
		},
		service_bindings: {
			crawler: 'NEWS_CRAWLER_WORKER',
			generator: 'NEWS_GENERATOR_WORKER',
			newscast: 'NEWSCAST_GENERATOR_WORKER',
		},
	};

	return response(cors(json(help)));
}
