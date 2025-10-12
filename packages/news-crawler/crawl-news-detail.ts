import { BigKindsDetailResponseSchema, type BigKindsDetailResponse, type NewsDetail } from './schemas.ts';

interface CloudflareFetchOptions {
  minTlsVersion?: string;
}

export interface NewsDetailMetadata {
  title: string;
  provider: string;
  byline: string;
  publishedDate: string;
  category: string;
  keywords: string;
  summary: string;
  url: string;
}

export interface NewsDetailResult {
  extractionTimestamp: string;
  originalNewsID: string;
  apiNewsID: string;
  newsDetail: NewsDetail | null;
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
        minTlsVersion: "1.0"
      } as CloudflareFetchOptions
    } as RequestInit);

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
      extractionTimestamp: new Date().toISOString(),
      originalNewsID: newsId,
      apiNewsID: apiNewsId,
      newsDetail: null,
      content: null,
      metadata: {
        title: '',
        provider: '',
        byline: '',
        publishedDate: '',
        category: '',
        keywords: '',
        summary: '',
        url: ''
      }
    };

    if (responseData.detail) {
      console.log(`[CRAWL_DETAIL EXTRACT] Extracting news detail data`);
      const detail = responseData.detail;
      extracted.newsDetail = detail;

      // Extract main fields with proper fallbacks
      extracted.content = detail.CONTENT ?? '';
      extracted.metadata = {
        title: detail.TITLE ?? '',
        provider: detail.PROVIDER ?? detail.PROVIDER_NAME ?? '',
        byline: detail.BYLINE ?? '',
        publishedDate: detail.PUBLISHED_DATE ?? detail.DATE ?? '',
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

export interface NewsDetailsItem {
  newsID: string;
  topicIndex: number;
  status: 'success' | 'error';
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
  };
  fileSize?: number;
  error?: string;
}

export interface NewsDetailsMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;  // milliseconds
  };
  processing: {
    totalNewsIDs: number;
    successCount: number;
    errorCount: number;
    successRate: number;  // percentage
  };
  fileSizes: {
    totalBytes: number;
    averageBytes: number;
    maximumBytes: number;
    minimumBytes: number;
  };
  performance: {
    averageTime: number;
    maximumTime: number;
    minimumTime: number;
    totalTime: number;
  };
  items: NewsDetailsItem[];
}

export async function crawlNewsDetailsBatch(
  newsIDs: string[],
  newscastID: string,
  topicIndex: number
): Promise<{
  timestamp: string;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
  results: NewsDetailResult[];
  errors: { newsID: string; error: string }[];
  metrics: NewsDetailsMetrics;
}> {
  const batchStartTime = Date.now();
  const startedAt = new Date().toISOString();

  const results: NewsDetailResult[] = [];
  const errors: { newsID: string; error: string }[] = [];
  const individualTimes: number[] = [];
  const fileSizes: number[] = [];
  const items: NewsDetailsItem[] = [];

  for (let i = 0; i < newsIDs.length; i++) {
    const newsID = newsIDs[i];
    const itemStartTime = Date.now();
    const itemStartedAt = new Date().toISOString();

    try {
      console.log(`[BATCH] Processing ${i + 1}/${newsIDs.length}: ${newsID}`);
      const result = await crawlNewsDetail(newsID);
      results.push(result);

      const itemCompletedAt = new Date().toISOString();
      const itemTime = Date.now() - itemStartTime;
      individualTimes.push(itemTime);

      // Calculate file size from JSON stringification
      const jsonSize = JSON.stringify(result).length;
      fileSizes.push(jsonSize);

      // Add item details
      items.push({
        newsID,
        topicIndex,
        status: 'success',
        timing: {
          startedAt: itemStartedAt,
          completedAt: itemCompletedAt,
          duration: itemTime
        },
        fileSize: jsonSize
      });

      console.log(`[BATCH] Successfully processed ${newsID} in ${itemTime}ms (${jsonSize} bytes)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[BATCH] Error processing ${newsID}: ${errorMessage}`);
      errors.push({ newsID: newsID, error: errorMessage });

      const itemCompletedAt = new Date().toISOString();
      const itemTime = Date.now() - itemStartTime;
      individualTimes.push(itemTime);

      // Add error item details
      items.push({
        newsID,
        topicIndex,
        status: 'error',
        timing: {
          startedAt: itemStartedAt,
          completedAt: itemCompletedAt,
          duration: itemTime
        },
        error: errorMessage
      });
    }
  }

  const completedAt = new Date().toISOString();
  const duration = Date.now() - batchStartTime;

  // Calculate metrics
  const successCount = results.length;
  const errorCount = errors.length;
  const totalNewsIDs = newsIDs.length;
  const successRate = totalNewsIDs > 0 ? (successCount / totalNewsIDs) * 100 : 0;

  const totalBytes = fileSizes.reduce((sum, size) => sum + size, 0);
  const averageBytes = fileSizes.length > 0 ? totalBytes / fileSizes.length : 0;
  const maximumBytes = fileSizes.length > 0 ? Math.max(...fileSizes) : 0;
  const minimumBytes = fileSizes.length > 0 ? Math.min(...fileSizes) : 0;

  const totalTime = individualTimes.reduce((sum, time) => sum + time, 0);
  const averageTime = individualTimes.length > 0 ? totalTime / individualTimes.length : 0;
  const maximumTime = individualTimes.length > 0 ? Math.max(...individualTimes) : 0;
  const minimumTime = individualTimes.length > 0 ? Math.min(...individualTimes) : 0;

  const metrics: NewsDetailsMetrics = {
    newscastID,
    topicIndex,
    timing: {
      startedAt,
      completedAt,
      duration
    },
    processing: {
      totalNewsIDs,
      successCount,
      errorCount,
      successRate
    },
    fileSizes: {
      totalBytes,
      averageBytes,
      maximumBytes,
      minimumBytes
    },
    performance: {
      averageTime,
      maximumTime,
      minimumTime,
      totalTime
    },
    items
  };

  return {
    timestamp: completedAt,
    totalProcessed: totalNewsIDs,
    successCount: successCount,
    errorCount: errorCount,
    results,
    errors,
    metrics
  };
}