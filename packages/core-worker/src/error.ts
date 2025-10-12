import type { ResponseData } from './response.ts';

export function error(errorData: string | Error, message?: string): ResponseData {
  const serializedError = typeof errorData === 'string' ? {
    success: false,
    error: errorData,
    message: message || errorData
  } : {
    success: false,
    error: errorData.name,
    message: errorData.message,
    details: {
      stack: errorData.stack,
      cause: errorData.cause
    }
  };

  return {
    data: serializedError,
    options: {
      status: 500
    }
  };
}
