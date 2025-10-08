import * as cheerio from 'cheerio';
import { NewsTopicsArraySchema, type NewsTopic } from './schemas.ts';

export interface CrawlTopicsOptions {
  includeHTML?: boolean;
}

export interface CrawlTopicsMetrics {
  newscastID: string;
  date: string;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
  };
  fileSizes: {
    topicsHTMLBytes: number;
    topicsJSONBytes: number;
    totalBytes: number;
  };
  content: {
    topicsCount: number;
    totalNewsIDs: number;
    averageNewsPerTopic: number;
    maximumNewsPerTopic: number;
    minimumNewsPerTopic: number;
  };
  performance: {
    fetchTime: number;
    parseTime: number;
    totalTime: number;
  };
}

export interface CrawlTopicsResult {
  topics: NewsTopic[];
  html?: string;
  metrics?: CrawlTopicsMetrics;
}

export async function crawlNewsTopics(options: CrawlTopicsOptions = {}): Promise<CrawlTopicsResult> {
  const url = 'https://www.bigkinds.or.kr/';
  const startTime = Date.now();
  const startedAt = new Date().toISOString();

  console.log(`[CRAWL_TOPICS START] ${startedAt} - URL: ${url}`);
  console.log(`[CRAWL_TOPICS OPTIONS] includeHTML: ${options.includeHTML}`);

  try {
    console.log(`[CRAWL_TOPICS FETCH] Starting fetch request to BigKinds`);
    const fetchStartTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    const fetchTime = Date.now() - fetchStartTime;
    console.log(`[CRAWL_TOPICS FETCH] Response received in ${fetchTime}ms - Status: ${response.status}`);

    if (!response.ok) {
      console.error(`[CRAWL_TOPICS ERROR] HTTP error: ${response.status} ${response.statusText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log(`[CRAWL_TOPICS PARSE] Reading response text`);
    const html = await response.text();
    console.log(`[CRAWL_TOPICS PARSE] HTML received: ${html.length} characters`);

    console.log(`[CRAWL_TOPICS PARSE] Loading HTML with Cheerio`);
    const $ = cheerio.load(html);
    
    // Find elements with data-topic attribute (similar to Python XPath)
    console.log(`[CRAWL_TOPICS ELEMENTS] Searching for topic elements: a[data-topic].issupop-btn`);
    const topicElements = $('a[data-topic].issupop-btn');
    console.log(`[CRAWL_TOPICS ELEMENTS] Found ${topicElements.length} topic elements`);

    // Deduplicate topics by title
    const seenTopics = new Set<string>();
    const topics: NewsTopic[] = [];

    console.log(`[CRAWL_TOPICS PARSE] Starting to parse topic elements`);
    topicElements.each((index, element) => {
      const $element = $(element);
      const title = $element.attr('data-topic')?.trim() ?? '';
      const issueName = $element.attr('data-issue-name')?.trim() ?? '';
      const newsIDsRaw = $element.attr('data-news-ids') ?? '';

      console.log(`[CRAWL_TOPICS ELEMENT] Processing element ${index + 1}: "${title}"`);

      if (!title || seenTopics.has(title)) {
        console.log(`[CRAWL_TOPICS ELEMENT] Skipping element ${index + 1}: ${!title ? 'no title' : 'duplicate'}`);
        return; // continue in jQuery each
      }

      seenTopics.add(title);

      // Extract rank from HTML structure
      const rankElement = $element.find('span.rank');
      const rankText = rankElement.text().trim();
      const rank = rankText ? parseInt(rankText) : topics.length + 1;

      // Parse keywords and news IDs
      const keywords = issueName.split(' ').map(kw => kw.trim()).filter(Boolean);
      const newsIDs = newsIDsRaw.split(',').map(nid => nid.trim()).filter(Boolean);

      // Construct href (URL encode the title for search)
      const encodedKeyword = encodeURIComponent(title);
      const href = `/v2/search/news?issueKeyword=${encodedKeyword}`;

      console.log(`[CRAWL_TOPICS ELEMENT] Added topic ${topics.length + 1}: rank=${rank}, title="${title}", newsIDs=${newsIDs.length}`);

      topics.push({
        rank,
        title,
        issue_name: issueName,
        keywords,
        news_count: newsIDs.length,
        news_ids: newsIDs,
        href
      });
    });

    console.log(`[CRAWL_TOPICS PARSE] Parsed ${topics.length} unique topics`);

    // Sort by rank
    console.log(`[CRAWL_TOPICS SORT] Sorting topics by rank`);
    topics.sort((a, b) => a.rank - b.rank);
    console.log(`[CRAWL_TOPICS SORT] Topics sorted successfully`);

    // Validate with Zod
    console.log(`[CRAWL_TOPICS VALIDATE] Validating topics with Zod schema`);
    const parseResult = NewsTopicsArraySchema.safeParse(topics);

    if (!parseResult.success) {
      console.warn(`[CRAWL_TOPICS VALIDATE] Topics validation failed:`, parseResult.error.issues);
      // Continue with unvalidated data but log issues
    } else {
      console.log(`[CRAWL_TOPICS VALIDATE] Topics validation successful`);
    }

    const validatedTopics = parseResult.success ? parseResult.data : topics;

    const totalTime = Date.now() - startTime;
    const parseTime = totalTime - fetchTime;
    const completedAt = new Date().toISOString();

    // Calculate content metrics
    const newsCountsPerTopic = validatedTopics.map(t => t.news_ids.length);
    const totalNewsIDs = newsCountsPerTopic.reduce((sum, count) => sum + count, 0);
    const averageNewsPerTopic = totalNewsIDs / validatedTopics.length;
    const maximumNewsPerTopic = Math.max(...newsCountsPerTopic);
    const minimumNewsPerTopic = Math.min(...newsCountsPerTopic);

    // Calculate file sizes
    const htmlBytes = html.length;
    const jsonBytes = JSON.stringify(validatedTopics).length;
    const totalBytes = htmlBytes + jsonBytes;

    // Generate newscast ID from timestamp
    const newscastID = startedAt.replace(/[:.]/g, '-');
    const date = startedAt.split('T')[0];

    // Return result based on options
    const result: CrawlTopicsResult = {
      topics: validatedTopics
    };

    if (options.includeHTML) {
      console.log(`[CRAWL_TOPICS RESULT] Including HTML in result (${html.length} chars)`);
      result.html = html;
    }

    // Always include metrics
    result.metrics = {
      newscastID,
      date,
      timing: {
        startedAt,
        completedAt,
        duration: totalTime
      },
      fileSizes: {
        topicsHTMLBytes: htmlBytes,
        topicsJSONBytes: jsonBytes,
        totalBytes
      },
      content: {
        topicsCount: validatedTopics.length,
        totalNewsIDs,
        averageNewsPerTopic: Math.round(averageNewsPerTopic * 10) / 10,
        maximumNewsPerTopic,
        minimumNewsPerTopic
      },
      performance: {
        fetchTime,
        parseTime,
        totalTime
      }
    };

    console.log(`[CRAWL_TOPICS SUCCESS] Completed in ${totalTime}ms - Found ${validatedTopics.length} topics`);

    return result;
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[CRAWL_TOPICS ERROR] Failed after ${totalTime}ms:`, error);

    if (error instanceof Error) {
      console.error(`[CRAWL_TOPICS ERROR] Error name: ${error.name}`);
      console.error(`[CRAWL_TOPICS ERROR] Error message: ${error.message}`);
      console.error(`[CRAWL_TOPICS ERROR] Error stack: ${error.stack}`);
    }

    throw error;
  }
}