import type { ResponseData } from './response.ts';

export function json(data: any, options: Partial<ResponseData['options']> = {}): ResponseData {
  return {
    data,
    options: {
      contentType: 'application/json',
      ...options
    }
  };
}