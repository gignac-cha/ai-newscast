import { BigKindsDetailResponseSchema, type BigKindsDetailResponse, type NewsDetail } from './schemas.ts';

export interface NewsDetailMetadata {
  title: string;
  provider: string;
  byline: string;
  published_date: string;
  category: string;
  keywords: string;
  summary: string;
  url: string;
}

export interface NewsDetailResult {
  extraction_timestamp: string;
  original_news_id: string;
  api_news_id: string;
  news_detail: NewsDetail | null;
  content: string | null;
  metadata: NewsDetailMetadata;
}

export async function crawlNewsDetail(newsId: string): Promise<NewsDetailResult> {
  const startTime = Date.now();

  console.log(`[CRAWL_DETAIL START] ${new Date().toISOString()} - newsId: ${newsId}`);

  // Convert news ID format: replace hyphens with dots for API call
  const apiNewsId = newsId.replace(/-/g, '.');
  console.log(`[CRAWL_DETAIL ID] Converted ${newsId} -> ${apiNewsId}`);

  const url = new URL('https://www.bigkinds.or.kr/news/detailView.do');
  url.searchParams.set('docId', apiNewsId);
  url.searchParams.set('returnCnt', '1');
  url.searchParams.set('sectionDiv', '1000');
  console.log(`[CRAWL_DETAIL URL] Request URL: ${url.toString()}`);

  const headers = {
    'Referer': 'https://www.bigkinds.or.kr/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  try {
    console.log(`[CRAWL_DETAIL FETCH] Starting fetch request to BigKinds detail API`);
    const response = await fetch(url.toString(), {
      headers,
      // Add Cloudflare-specific options to handle SSL issues
      cf: {
        // Disable SSL verification for external requests
        minTlsVersion: "1.0"
      }
    });

    const fetchTime = Date.now() - startTime;
    console.log(`[CRAWL_DETAIL FETCH] Response received in ${fetchTime}ms - Status: ${response.status}`);

    if (!response.ok) {
      console.error(`[CRAWL_DETAIL ERROR] HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`[CRAWL_DETAIL PARSE] Reading JSON response`);
    const rawResponseData = await response.json();
    console.log(`[CRAWL_DETAIL PARSE] JSON parsed successfully`);

    // Validate response with Zod
    console.log(`[CRAWL_DETAIL VALIDATE] Validating response with Zod schema`);
    const parseResult = BigKindsDetailResponseSchema.safeParse(rawResponseData);

    if (!parseResult.success) {
      console.warn(`[CRAWL_DETAIL VALIDATE] Response validation failed:`, parseResult.error.issues);
      // Continue with raw data for now
    } else {
      console.log(`[CRAWL_DETAIL VALIDATE] Response validation successful`);
    }

    const responseData: BigKindsDetailResponse = parseResult.success
      ? parseResult.data
      : rawResponseData as BigKindsDetailResponse;

    // Extract data
    console.log(`[CRAWL_DETAIL EXTRACT] Creating result structure`);
    const extracted: NewsDetailResult = {
      extraction_timestamp: new Date().toISOString(),
      original_news_id: newsId,
      api_news_id: apiNewsId,
      news_detail: null,
      content: null,
      metadata: {
        title: '',
        provider: '',
        byline: '',
        published_date: '',
        category: '',
        keywords: '',
        summary: '',
        url: ''
      }
    };

    if (responseData.detail) {
      console.log(`[CRAWL_DETAIL EXTRACT] Extracting news detail data`);
      const detail = responseData.detail;
      extracted.news_detail = detail;

      // Extract main fields with proper fallbacks
      extracted.content = detail.CONTENT ?? '';
      extracted.metadata = {
        title: detail.TITLE ?? '',
        provider: detail.PROVIDER ?? detail.PROVIDER_NAME ?? '',
        byline: detail.BYLINE ?? '',
        published_date: detail.PUBLISHED_DATE ?? detail.DATE ?? '',
        category: detail.CATEGORY ?? detail.CATEGORY_MAIN ?? '',
        keywords: detail.KEYWORDS ?? '',
        summary: detail.SUMMARY ?? '',
        url: detail.PROVIDER_LINK_PAGE ?? detail.URL ?? ''
      };
      console.log(`[CRAWL_DETAIL EXTRACT] Extracted: title="${extracted.metadata.title}", provider="${extracted.metadata.provider}"`);
    } else {
      console.warn(`[CRAWL_DETAIL EXTRACT] No detail found in response`);
    }

    const totalTime = Date.now() - startTime;
    console.log(`[CRAWL_DETAIL SUCCESS] Completed in ${totalTime}ms for ${newsId}`);

    return extracted;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[CRAWL_DETAIL ERROR] Failed after ${totalTime}ms for ${newsId}:`, error);

    if (error instanceof Error) {
      console.error(`[CRAWL_DETAIL ERROR] Error name: ${error.name}`);
      console.error(`[CRAWL_DETAIL ERROR] Error message: ${error.message}`);
      console.error(`[CRAWL_DETAIL ERROR] Error stack: ${error.stack}`);
    }

    throw error;
  }
}

export async function crawlNewsDetailsBatch(newsIds: string[]): Promise<{
  timestamp: string;
  total_processed: number;
  success_count: number;
  error_count: number;
  results: NewsDetailResult[];
  errors: { newsId: string; error: string }[];
}> {
  const results: NewsDetailResult[] = [];
  const errors: { newsId: string; error: string }[] = [];
  
  for (let i = 0; i < newsIds.length; i++) {
    const newsId = newsIds[i];
    try {
      console.log(`[BATCH] Processing ${i + 1}/${newsIds.length}: ${newsId}`);
      const result = await crawlNewsDetail(newsId);
      results.push(result);
      console.log(`[BATCH] Successfully processed ${newsId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BATCH] Error processing ${newsId}: ${errorMessage}`);
      errors.push({ newsId, error: errorMessage });
    }
  }
  
  return {
    timestamp: new Date().toISOString(),
    total_processed: newsIds.length,
    success_count: results.length,
    error_count: errors.length,
    results,
    errors
  };
}