/**
 * AI Newscast Latest ID Worker
 * Manages the latest newscast ID using Cloudflare KV storage
 */

interface Env {
  AI_NEWSCAST_KV: KVNamespace;
}

interface ApiResponse {
  'latest-newscast-id': string | null;
  timestamp: string;
  found: boolean;
}

interface UpdateRequest {
  id: string;
}

interface UpdateResponse {
  success: boolean;
  'updated-newscast-id': string;
  'previous-newscast-id': string | null;
  timestamp: string;
}

interface HistoryData {
  'newscast-id': string;
  'updated-at': string;
  'previous-newscast-id': string | null;
  'worker-version': string;
}

interface WorkerInfo {
  name: string;
  version: string;
  description: string;
  endpoints: {
    'GET /latest': string;
    'POST /update': string;
  };
  timestamp: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      switch (path) {
        case '/':
          return handleRoot();
        
        case '/latest':
          return await handleGetLatest(env);
        
        case '/update':
          if (request.method === 'POST') {
            return await handleUpdateLatest(request, env);
          }
          return new Response('Method not allowed', { status: 405 });
        
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('Worker error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return new Response(
        JSON.stringify({ error: 'Internal server error', message: errorMessage }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }
  },
};

function handleRoot(): Response {
  const info: WorkerInfo = {
    name: 'AI Newscast Latest ID Worker',
    version: '1.0.0',
    description: 'Manages latest newscast ID with KV storage',
    endpoints: {
      'GET /latest': 'Get the latest newscast ID',
      'POST /update': 'Update the latest newscast ID (requires JSON body with "id" field)'
    },
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(info, null, 2), {
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleGetLatest(env: Env): Promise<Response> {
  try {
    const latestId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
    
    const response: ApiResponse = {
      'latest-newscast-id': latestId,
      timestamp: new Date().toISOString(),
      found: latestId !== null
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 
        'Content-Type': 'application/json',
        'Cache-Control': 'max-age=60' // Cache for 1 minute
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get latest ID: ${errorMessage}`);
  }
}

async function handleUpdateLatest(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as UpdateRequest;
    
    if (!body.id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: id' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const newId = body.id;
    
    // Validate ID format (ISO timestamp format)
    const idPattern = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{6}$/;
    if (!idPattern.test(newId)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid ID format. Expected format: YYYY-MM-DDTHH-MM-SS-NNNNNN' 
        }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Get previous ID for comparison
    const previousId = await env.AI_NEWSCAST_KV.get('latest-newscast-id');
    
    // Update the latest ID
    await env.AI_NEWSCAST_KV.put('latest-newscast-id', newId);
    
    // Also store with timestamp for history
    const historyKey = `history:${newId}`;
    const historyData: HistoryData = {
      'newscast-id': newId,
      'updated-at': new Date().toISOString(),
      'previous-newscast-id': previousId,
      'worker-version': '1.0.0'
    };
    
    await env.AI_NEWSCAST_KV.put(historyKey, JSON.stringify(historyData));
    
    const response: UpdateResponse = {
      success: true,
      'updated-newscast-id': newId,
      'previous-newscast-id': previousId,
      timestamp: new Date().toISOString()
    };
    
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    if (error instanceof Error && error.name === 'SyntaxError') {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }), 
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update latest ID: ${errorMessage}`);
  }
}