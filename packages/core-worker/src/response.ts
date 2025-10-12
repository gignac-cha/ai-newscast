export interface ResponseData {
  data: any;
  options: {
    status?: number;
    headers?: Record<string, string>;
    contentType?: string;
  };
}

export function response(responseData: ResponseData): Response {
  const { data, options } = responseData;
  const { status = 200, headers = {}, contentType = 'application/json' } = options;

  const body = typeof data === 'string' ? data : JSON.stringify(data);

  return new Response(body, {
    status,
    headers: {
      'Content-Type': contentType,
      ...headers
    }
  });
}
