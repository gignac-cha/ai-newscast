import { response } from '../utils/response.ts';
import { cors } from '../utils/cors.ts';
import { json } from '../utils/json.ts';

export function handleHelp(): Response {
  const helpText = `AI Newscast - News Crawler Worker

Available endpoints:

GET /
  Show this help message

POST /topics
  Crawl news topics from BigKinds and create new topics resource
  Query parameters:
    - save=true (optional): Save to R2 bucket

POST /detail
  Crawl detail for a specific news item
  Query parameters:
    - news-id (required): News ID to crawl
    - newscast-id (optional): Newscast ID for folder structure
    - topic-index (optional): Topic index for organized folder structure
    - save=true (optional): Save to R2 bucket

POST /details
  Crawl all news details for a newscast using queue-based batch processing
  Query parameters:
    - newscast-id (required): Newscast ID to process
  Note: Always saves to R2 with save=true internally

GET /status?newscast-id=<id>
  Check crawling progress and batch completion status
  Query parameters:
    - newscast-id (required): Newscast ID to check

Examples:
  POST /topics?save=true
  POST /detail?news-id=01100201.20250915005551001&newscast-id=2025-09-15T01-23-45-678Z&topic-index=1&save=true
  POST /details?newscast-id=2025-09-15T01-23-45-678Z
  GET /status?newscast-id=2025-09-15T01-23-45-678Z
`;

  return response(cors(json(helpText, { contentType: 'text/plain' })));
}