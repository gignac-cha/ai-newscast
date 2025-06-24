import { JSDOM } from 'jsdom';
import {
  Topic,
  TopicSchema,
  NewsItem,
  NewsItemSchema,
  NewsDetail,
  NewsDetailSchema,
  Metadata,
  HtmlUtils,
  Logger,
} from '@ai-newscast/core';

export class TopicParser {
  static parseTopicList(html: string): { metadata: Metadata; topics: Topic[] } {
    Logger.info('Parsing topic list from HTML...');
    
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract metadata
    const metadata = this.extractMetadata(document);
    
    // Extract topics
    const topics = this.extractTopics(document);
    
    metadata.total_topics = topics.length;
    
    Logger.info(`Parsed ${topics.length} topics successfully`);
    return { metadata, topics };
  }

  private static extractMetadata(document: Document): Metadata {
    const now = new Date();
    
    // Try to find date information from page
    let extractionDate = '';
    const dateElements = document.querySelectorAll('*');
    
    for (const element of dateElements) {
      const text = element.textContent || '';
      if (text.includes('2025년') && text.includes('월') && text.includes('일')) {
        extractionDate = text.trim();
        break;
      }
    }
    
    return {
      extraction_date: extractionDate,
      extraction_timestamp: now.toISOString(),
      total_topics: 0, // Will be updated later
    };
  }

  private static extractTopics(document: Document): Topic[] {
    const topics: Topic[] = [];
    const topicButtons = document.querySelectorAll('.issupop-btn');
    
    topicButtons.forEach((button, index) => {
      try {
        const topic = this.parseTopicButton(button as Element, index + 1);
        if (topic) {
          // Validate topic data
          const validatedTopic = TopicSchema.parse(topic);
          topics.push(validatedTopic);
        }
      } catch (error) {
        Logger.warn(`Failed to parse topic at index ${index}: ${error}`);
      }
    });
    
    return topics;
  }

  private static parseTopicButton(button: Element, defaultRank: number): Topic | null {
    const newsIdsStr = button.getAttribute('data-news-ids') || '';
    const topicText = HtmlUtils.decodeHtmlEntities(button.getAttribute('data-topic') || '');
    const issueName = HtmlUtils.decodeHtmlEntities(button.getAttribute('data-issue-name') || '');

    if (!topicText) {
      return null;
    }

    // Find parent li element
    const liParent = button.closest('li');
    
    // Extract rank
    let rank = defaultRank;
    if (liParent) {
      const rankElement = liParent.querySelector('.rank');
      if (rankElement?.textContent) {
        const rankText = rankElement.textContent.trim();
        const parsed = parseInt(rankText);
        if (!isNaN(parsed)) {
          rank = parsed;
        }
      }
    }

    // Extract news count
    let newsCount = 0;
    if (liParent) {
      const newsCountElement = liParent.querySelector('.newsNo');
      if (newsCountElement?.textContent) {
        const countText = newsCountElement.textContent.replace('건', '').trim();
        const parsed = parseInt(countText);
        if (!isNaN(parsed)) {
          newsCount = parsed;
        }
      }
    }

    // Extract summary
    let summary = '';
    if (liParent) {
      const summaryInput = liParent.querySelector('input[type="hidden"]');
      if (summaryInput) {
        summary = HtmlUtils.decodeHtmlEntities(summaryInput.getAttribute('value') || '');
      }
    }

    // Process news IDs
    const newsIds = newsIdsStr ? newsIdsStr.split(',').filter(id => id.trim()) : [];
    
    // Extract keywords from issue name
    const keywords = issueName ? issueName.split(/\s+/).filter(kw => kw.trim()) : [];

    return {
      rank,
      topic: HtmlUtils.cleanText(topicText),
      summary: HtmlUtils.cleanText(summary),
      keywords,
      news_count: newsCount,
      news_ids: newsIds,
      issue_name: HtmlUtils.cleanText(issueName),
    };
  }
}

export class NewsParser {
  static parseNewsList(responseData: any, topic: string): {
    topic: string;
    extraction_timestamp: string;
    total_news: number;
    news_list: NewsItem[];
    news_ids?: string[];
  } {
    Logger.info(`Parsing news list for topic: ${topic}`);
    
    const result = {
      topic,
      extraction_timestamp: new Date().toISOString(),
      total_news: 0,
      news_list: [] as NewsItem[],
      news_ids: responseData.newsIds || undefined,
    };

    if (!responseData.newsList || !Array.isArray(responseData.newsList)) {
      Logger.warn('No news list found in response data');
      return result;
    }

    const newsList = responseData.newsList;
    result.total_news = newsList.length;

    for (const newsItem of newsList) {
      try {
        const parsedNews = this.parseNewsItem(newsItem);
        if (parsedNews) {
          // Validate news item
          const validatedNews = NewsItemSchema.parse(parsedNews);
          result.news_list.push(validatedNews);
        }
      } catch (error) {
        Logger.warn(`Failed to parse news item: ${error}`);
      }
    }

    Logger.info(`Parsed ${result.news_list.length} news items successfully`);
    return result;
  }

  private static parseNewsItem(newsItem: any): NewsItem | null {
    if (!newsItem) return null;

    // Extract keywords
    const keywords: string[] = [];
    if (newsItem.inKeyword && Array.isArray(newsItem.inKeyword)) {
      for (const kw of newsItem.inKeyword) {
        if (kw.label) {
          keywords.push(kw.label);
        }
      }
    }

    return {
      news_id: newsItem.news_node_id || '',
      title: HtmlUtils.cleanText(newsItem.title || ''),
      provider_name: newsItem.provider_name || '',
      byline: newsItem.byline || '',
      published_date: newsItem.published_date || '',
      summary: HtmlUtils.cleanText(newsItem.summary || ''),
      keywords,
      category: newsItem.category || '',
      url: newsItem.url || '',
    };
  }
}

export class NewsDetailParser {
  static parseNewsDetail(responseData: any): NewsDetail {
    Logger.debug('Parsing news detail from response data');
    
    const result: NewsDetail = {
      extraction_timestamp: new Date().toISOString(),
      news_detail: undefined,
      content: undefined,
      metadata: {
        title: '',
        provider: '',
        byline: '',
        published_date: '',
        category: '',
        keywords: '',
        summary: '',
        url: '',
      },
    };

    if (!responseData.detail) {
      Logger.warn('No detail found in response data');
      return result;
    }

    const detail = responseData.detail;
    result.news_detail = detail;

    // Extract content
    result.content = HtmlUtils.cleanText(detail.CONTENT || '');

    // Extract metadata
    result.metadata = {
      title: HtmlUtils.cleanText(detail.TITLE || ''),
      provider: detail.PROVIDER_NAME || '',
      byline: detail.BYLINE || '',
      published_date: detail.PUBLISHED_DATE || '',
      category: detail.CATEGORY || '',
      keywords: detail.KEYWORDS || '',
      summary: HtmlUtils.cleanText(detail.SUMMARY || ''),
      url: detail.URL || '',
    };

    // Validate the result
    return NewsDetailSchema.parse(result);
  }
}