import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';

export function handleHelp(): Response {
  const helpData = {
    service: 'AI Newscast News Generator Worker',
    version: '1.0.0',
    description: 'Cloudflare Worker for AI-powered news generation using Google Gemini',
    endpoints: {
      'GET /': 'Show this help message',
      'GET /help': 'Show this help message',
      'POST /news': 'Generate integrated news content from crawled articles',
      'GET /status': 'Check generation status for a newscast'
    },
    parameters: {
      'newscast-id': 'Required - The newscast timestamp ID (e.g., 2025-09-17T16-50-13-648Z)',
      'topic-index': 'Required for generation - Topic index (1-10)',
      'format': 'Optional - Response format (json|markdown), defaults to json',
      'save': 'Optional - Save to R2 bucket (true|false), defaults to false'
    },
    examples: {
      'Generate and save news for topic 1': 'POST /news?newscast-id=2025-09-17T16-50-13-648Z&topic-index=1&save=true',
      'Generate news without saving': 'POST /news?newscast-id=2025-09-17T16-50-13-648Z&topic-index=1',
      'Check status': 'GET /status?newscast-id=2025-09-17T16-50-13-648Z'
    }
  };

  return response(cors(json(helpData)));
}