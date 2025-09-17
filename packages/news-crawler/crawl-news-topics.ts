import * as cheerio from 'cheerio';
import { NewsTopicsArraySchema, type NewsTopic } from './schemas.ts';

export interface CrawlTopicsOptions {
  includeHtml?: boolean;
}

export interface CrawlTopicsResult {
  topics: NewsTopic[];
  html?: string;
}

export async function crawlNewsTopics(options: CrawlTopicsOptions = {}): Promise<CrawlTopicsResult> {
  const url = 'https://www.bigkinds.or.kr/';
  
  try {
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    
    // Find elements with data-topic attribute (similar to Python XPath)
    const topicElements = $('a[data-topic].issupop-btn');
    
    // Deduplicate topics by title
    const seenTopics = new Set<string>();
    const topics: NewsTopic[] = [];
    
    topicElements.each((index, element) => {
      const $element = $(element);
      const title = $element.attr('data-topic')?.trim() ?? '';
      const issueName = $element.attr('data-issue-name')?.trim() ?? '';
      const newsIdsRaw = $element.attr('data-news-ids') ?? '';
      
      if (!title || seenTopics.has(title)) {
        return; // continue in jQuery each
      }
      
      seenTopics.add(title);
      
      // Extract rank from HTML structure
      const rankElement = $element.find('span.rank');
      const rankText = rankElement.text().trim();
      const rank = rankText ? parseInt(rankText) : topics.length + 1;
      
      // Parse keywords and news IDs
      const keywords = issueName.split(' ').map(kw => kw.trim()).filter(Boolean);
      const newsIds = newsIdsRaw.split(',').map(nid => nid.trim()).filter(Boolean);
      
      // Construct href (URL encode the title for search)
      const encodedKeyword = encodeURIComponent(title);
      const href = `/v2/search/news?issueKeyword=${encodedKeyword}`;
      
      topics.push({
        rank,
        title,
        issue_name: issueName,
        keywords,
        news_count: newsIds.length,
        news_ids: newsIds,
        href
      });
    });
    
    // Sort by rank
    topics.sort((a, b) => a.rank - b.rank);

    // Validate with Zod
    const parseResult = NewsTopicsArraySchema.safeParse(topics);

    if (!parseResult.success) {
      console.warn('Topics validation failed:', parseResult.error.issues);
      // Continue with unvalidated data but log issues
    }

    const validatedTopics = parseResult.success ? parseResult.data : topics;

    // Return result based on options
    const result: CrawlTopicsResult = {
      topics: validatedTopics
    };

    if (options.includeHtml) {
      result.html = html;
    }

    return result;
  } catch (error) {
    console.error('Error crawling news topics:', error);
    throw error;
  }
}