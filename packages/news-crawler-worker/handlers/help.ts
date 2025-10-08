import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';

export function handleHelp(): Response {
  const helpText = `AI Newscast - News Crawler Worker

Available endpoints:

GET /
  Show this help message

GET /topics
  Crawl news topics from BigKinds
  Query parameters:
    - save=true: Save HTML and JSON to R2 bucket

GET /detail?news-id=<id>&newscast-id=<id>&topic-index=<n>
  Crawl detail for a specific news item
  Query parameters:
    - news-id (required): News ID to crawl
    - newscast-id (optional): Newscast ID to save to R2 bucket
    - topic-index (optional): Topic index for organized folder structure

GET /details?newscast-id=<id>
  Crawl all news details for a newscast using queue-based batch processing
  Query parameters:
    - newscast-id (required): Newscast ID to process

GET /status?newscast-id=<id>
  Check crawling progress and batch completion status
  Query parameters:
    - newscast-id (required): Newscast ID to check

Examples:
  GET /topics
  GET /topics?save=true
  GET /detail?news-id=01100201.20250915005551001
  GET /details?newscast-id=2025-09-15T01-23-45-678Z
  GET /status?newscast-id=2025-09-15T01-23-45-678Z
`;

  return response(cors(json(helpText, { contentType: 'text/plain' })));
}