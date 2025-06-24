/**
 * AI Newscast Latest ID API
 * Cloudflare Workers API for managing latest newscast batch timestamps
 */

interface Env {
  AI_NEWSCAST_KV: KVNamespace;
  API_VERSION: string;
}

interface APIResponse {
  success: boolean;
  data?: any;
  error?: string;
  timestamp?: string;
}

interface BatchUpdateRequest {
  id?: string;
  timestamp?: string;
}

interface LatestBatchData {
  latest_id: string | null;
  output_folder: string | null;
  retrieved_at: string;
}

interface UpdateBatchData {
  updated_id: string;
  output_folder: string;
  updated_at: string;
}

interface HealthData {
  status: 'healthy' | 'unhealthy';
  kv_connection: 'ok' | 'error';
  api_version: string;
  timestamp: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
};

const LATEST_ID_KEY = 'LATEST_ID';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { 
        status: 200,
        headers: CORS_HEADERS 
      });
    }
    
    try {
      // GET /latest - 최신 ID 조회
      if (url.pathname === '/latest' && request.method === 'GET') {
        return await handleGetLatest(env);
      }
      
      // POST /update - ID 업데이트  
      if (url.pathname === '/update' && request.method === 'POST') {
        return await handleUpdateLatest(request, env);
      }
      
      // GET /health - 헬스체크
      if (url.pathname === '/health' && request.method === 'GET') {
        return await handleHealth(env);
      }
      
      // 404 - Not Found
      return jsonResponse({
        success: false,
        error: 'Endpoint not found. Available: /latest, /update, /health'
      }, 404);
      
    } catch (error) {
      console.error('Worker error:', error);
      return jsonResponse({
        success: false,
        error: 'Internal server error'
      }, 500);
    }
  }
};

/**
 * 최신 ID 조회
 */
async function handleGetLatest(env: Env): Promise<Response> {
  try {
    const latestId = await env.AI_NEWSCAST_KV.get(LATEST_ID_KEY);
    
    const data: LatestBatchData = {
      latest_id: latestId,
      output_folder: latestId ? `output/${latestId}` : null,
      retrieved_at: new Date().toISOString()
    };
    
    return jsonResponse({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Get latest error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to retrieve latest ID'
    }, 500);
  }
}

/**
 * ID 업데이트
 */
async function handleUpdateLatest(request: Request, env: Env): Promise<Response> {
  try {
    const body = await request.json() as BatchUpdateRequest;
    
    if (!body.id && !body.timestamp) {
      return jsonResponse({
        success: false,
        error: 'Missing required field: id or timestamp'
      }, 400);
    }
    
    const newId = body.id || body.timestamp!;
    
    // ID 형식 검증 (ISO timestamp 형식)
    if (!isValidTimestamp(newId)) {
      return jsonResponse({
        success: false,
        error: 'Invalid ID format. Expected ISO timestamp format like "2025-06-23T10-30-45-123456"'
      }, 400);
    }
    
    // KV에 저장
    await env.AI_NEWSCAST_KV.put(LATEST_ID_KEY, newId);
    
    const data: UpdateBatchData = {
      updated_id: newId,
      output_folder: `output/${newId}`,
      updated_at: new Date().toISOString()
    };
    
    return jsonResponse({
      success: true,
      data
    });
    
  } catch (error) {
    console.error('Update error:', error);
    return jsonResponse({
      success: false,
      error: 'Failed to update latest ID'
    }, 500);
  }
}

/**
 * 헬스체크
 */
async function handleHealth(env: Env): Promise<Response> {
  try {
    // KV 연결 테스트
    const testKey = 'health_check';
    const testValue = Date.now().toString();
    
    await env.AI_NEWSCAST_KV.put(testKey, testValue, { expirationTtl: 60 });
    const retrieved = await env.AI_NEWSCAST_KV.get(testKey);
    await env.AI_NEWSCAST_KV.delete(testKey);
    
    const kvHealthy = retrieved === testValue;
    
    const data: HealthData = {
      status: kvHealthy ? 'healthy' : 'unhealthy',
      kv_connection: kvHealthy ? 'ok' : 'error',
      api_version: env.API_VERSION,
      timestamp: new Date().toISOString()
    };
    
    return jsonResponse({
      success: true,
      data
    }, kvHealthy ? 200 : 500);
    
  } catch (error) {
    console.error('Health check error:', error);
    
    const data: HealthData = {
      status: 'unhealthy',
      kv_connection: 'error',
      api_version: env.API_VERSION,
      timestamp: new Date().toISOString()
    };
    
    return jsonResponse({
      success: false,
      error: 'Health check failed',
      data
    }, 500);
  }
}

/**
 * JSON 응답 헬퍼
 */
function jsonResponse(data: APIResponse, status: number = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: CORS_HEADERS
  });
}

/**
 * 타임스탬프 형식 검증
 */
function isValidTimestamp(id: string): boolean {
  // ISO 형식: 2025-06-23T10-30-45-123456
  const timestampRegex = /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{6}$/;
  return timestampRegex.test(id);
}