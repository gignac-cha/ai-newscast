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
  // Convert news ID format: replace hyphens with dots for API call
  const apiNewsId = newsId.replace(/-/g, '.');
  
  const url = new URL('https://www.bigkinds.or.kr/news/detailView.do');
  url.searchParams.set('docId', apiNewsId);
  url.searchParams.set('returnCnt', '1');
  url.searchParams.set('sectionDiv', '1000');
  
  const headers = {
    'Referer': 'https://www.bigkinds.or.kr/',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };
  
  try {
    const response = await fetch(url.toString(), {
      headers,
      // Add Cloudflare-specific options to handle SSL issues
      cf: {
        // Disable SSL verification for external requests
        minTlsVersion: "1.0"
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const rawResponseData = await response.json();

    // Validate response with Zod
    const parseResult = BigKindsDetailResponseSchema.safeParse(rawResponseData);

    if (!parseResult.success) {
      console.warn('Response validation failed:', parseResult.error.issues);
      // Continue with raw data for now
    }

    const responseData: BigKindsDetailResponse = parseResult.success
      ? parseResult.data
      : rawResponseData as BigKindsDetailResponse;

    // Extract data
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
    }
    
    return extracted;
  } catch (error) {
    console.error(`Error crawling news detail for ${newsId}:`, error);
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
      console.log(`[${i + 1}/${newsIds.length}] Processing ${newsId}...`);
      const result = await crawlNewsDetail(newsId);
      results.push(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing ${newsId}: ${errorMessage}`);
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