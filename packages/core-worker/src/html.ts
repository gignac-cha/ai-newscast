import type { ResponseData } from './response.ts';

export function html(data: string, options: Partial<ResponseData['options']> = {}): ResponseData {
  return {
    data,
    options: {
      contentType: 'text/html; charset=utf-8',
      ...options
    }
  };
}
