import type { ResponseData } from './response.ts';

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

export function cors(responseData: ResponseData): ResponseData {
  return {
    ...responseData,
    options: {
      ...responseData.options,
      headers: {
        ...CORS_HEADERS,
        ...responseData.options.headers
      }
    }
  };
}

export function createCORSPreflightResponse(): Response {
  return new Response(null, {
    headers: CORS_HEADERS
  });
}
