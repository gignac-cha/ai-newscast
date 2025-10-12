import type { ResponseData } from './response.ts';

// Cloudflare Workers에서 SSL 인증서 문제를 해결하기 위한 fetch 옵션
const WORKER_FETCH_OPTIONS = {
  cf: {
    minTlsVersion: "1.0" as const
  }
};

export function workerFetch(url: string | URL, init?: RequestInit): Promise<Response> {
  return fetch(url, {
    ...init,
    ...WORKER_FETCH_OPTIONS
  });
}

export function http526Error(originalError?: any): ResponseData {
  return {
    data: {
      success: false,
      error: "HTTP_526_SSL_ERROR",
      message: "SSL certificate validation failed. This typically occurs when calling external APIs from Cloudflare Workers.",
      details: {
        description: "HTTP 526 errors in Workers are caused by strict SSL validation. Use workerFetch() utility instead of regular fetch().",
        solution: "Apply 'cots_on_external_fetch' compatibility flag and use minTlsVersion: '1.0'",
        originalError
      }
    },
    options: {
      status: 526
    }
  };
}
