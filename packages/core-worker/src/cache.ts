import type { ResponseData } from './response.ts';

/**
 * No-cache headers for health check endpoints
 *
 * Health check must always return fresh data without caching
 */
export const NO_CACHE_HEADERS = {
	'Cache-Control': 'no-cache, no-store, must-revalidate',
} as const;

/**
 * Short cache headers (1 minute)
 *
 * Suitable for frequently updated data that can tolerate brief staleness
 */
export const SHORT_CACHE_HEADERS = {
	'Cache-Control': 'max-age=60',
} as const;

/**
 * Long cache headers (1 year)
 *
 * Suitable for immutable static assets
 */
export const LONG_CACHE_HEADERS = {
	'Cache-Control': 'public, max-age=31536000, immutable',
} as const;

/**
 * Apply no-cache headers to response
 */
export function noCache(responseData: ResponseData): ResponseData {
	return {
		...responseData,
		options: {
			...responseData.options,
			headers: {
				...NO_CACHE_HEADERS,
				...responseData.options.headers,
			},
		},
	};
}

/**
 * Apply short cache headers to response
 */
export function shortCache(responseData: ResponseData): ResponseData {
	return {
		...responseData,
		options: {
			...responseData.options,
			headers: {
				...SHORT_CACHE_HEADERS,
				...responseData.options.headers,
			},
		},
	};
}

/**
 * Apply long cache headers to response
 */
export function longCache(responseData: ResponseData): ResponseData {
	return {
		...responseData,
		options: {
			...responseData.options,
			headers: {
				...LONG_CACHE_HEADERS,
				...responseData.options.headers,
			},
		},
	};
}
