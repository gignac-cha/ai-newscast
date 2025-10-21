/**
 * BigKinds Mock Worker
 * Provides mock responses for BigKinds API testing using R2 files
 */

import { createCORSPreflightResponse, response, cors, json, html, error, longCache } from '@ai-newscast/core-worker';

interface Env {
  AI_NEWSCAST_R2: R2Bucket;
}

interface WorkerInfo {
  name: string;
  version: string;
  description: string;
  endpoints: Record<string, string>;
  timestamp: string;
}

// Mapping of mock endpoint paths to R2 file paths
const MOCK_FILES: Record<string, string> = {
  '/1': 'newscasts/2025-10-18T09-06-02-142Z/topics.raw.html',
  '/2': 'newscasts/2025-10-19T09-05-38-085Z/topics.raw.html',
  '/3': 'newscasts/2025-10-20T09-05-32-895Z/topics.raw.html',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return createCORSPreflightResponse();
    }

    try {
      // Root path - return service info
      if (path === '/' || path === '/help') {
        if (request.method !== 'GET') {
          return response(cors(error('Method Not Allowed', 'Only GET is allowed for this endpoint')));
        }
        return handleRoot();
      }

      // Mock endpoints
      if (path in MOCK_FILES) {
        if (request.method !== 'GET') {
          return response(cors(error('Method Not Allowed', 'Only GET is allowed for mock endpoints')));
        }
        return await handleMockRequest(path, env);
      }

      // Unknown path
      return response(cors(error('Not Found', `Path ${path} is not available. Available paths: ${Object.keys(MOCK_FILES).join(', ')}`)));

    } catch (err) {
      console.error('Worker error:', err);
      return response(cors(error(err instanceof Error ? err : 'Unknown error')));
    }
  },
};

function handleRoot(): Response {
  const endpoints: Record<string, string> = {};
  for (const [path, r2Path] of Object.entries(MOCK_FILES)) {
    endpoints[`GET ${path}`] = `Proxy to ${r2Path}`;
  }

  const info: WorkerInfo = {
    name: 'BigKinds Mock Worker',
    version: '1.0.0',
    description: 'Mock server for BigKinds API testing - proxies R2 HTML files',
    endpoints,
    timestamp: new Date().toISOString()
  };

  return response(cors(json(info)));
}

async function handleMockRequest(path: string, env: Env): Promise<Response> {
  const r2FilePath = MOCK_FILES[path];

  console.log(`Reading mock data from R2: ${r2FilePath}`);

  try {
    // Get the HTML file from R2 using binding (internal network, no egress cost)
    const r2Object = await env.AI_NEWSCAST_R2.get(r2FilePath);

    if (r2Object === null) {
      console.error(`R2 object not found: ${r2FilePath}`);
      return response(cors(error('File not found in R2', `R2 path: ${r2FilePath}`)));
    }

    // Get the HTML content
    const htmlContent = await r2Object.text();

    // Return the HTML content with appropriate headers
    // Note: Using longCache (1 year) since these are static test files
    return response(longCache(cors(html(htmlContent))));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`Failed to read from R2: ${errorMessage}`);
    throw new Error(`Failed to read mock data: ${errorMessage}`);
  }
}
