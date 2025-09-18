import { GoogleGenAI } from '@google/genai';
import type { GeneratedNews } from '@ai-newscast/core';

export interface NewsDetail {
  extraction_timestamp: string;
  original_news_id: string;
  api_news_id: string;
  news_detail: any;
  content: string;
  metadata: {
    title: string;
    provider: string;
    byline: string;
    published_date: string;
    category: string;
    keywords: string;
    summary: string;
    url: string;
  };
}

export interface GenerationResult {
  generatedNews: GeneratedNews;
  executionTime: number;
}

export async function generateNews(
  newsDetails: NewsDetail[],
  promptTemplate: string,
  apiKey: string
): Promise<GenerationResult> {
  const startTime = Date.now();

  if (!apiKey) {
    throw new Error('Google AI API key is required');
  }

  if (newsDetails.length === 0) {
    throw new Error('No news details provided');
  }

  // Format news articles for prompt
  const newsArticles = newsDetails
    .map((news, index) => {
      const metadata = news.metadata;
      return `[기사 ${index + 1}]
제목: ${metadata.title}
언론사: ${metadata.provider}
발행일: ${metadata.published_date}
기자: ${metadata.byline}
요약: ${metadata.summary}
내용: ${news.content}
URL: ${metadata.url}`;
    })
    .join('\n\n---\n\n');

  // Replace placeholder in prompt
  const prompt = promptTemplate.replace('{news_articles}', newsArticles);

  // Initialize Google AI
  const genAI = new GoogleGenAI({ apiKey });

  // Generate content
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
  });
  const text = response.text ?? '';

  // Parse JSON response
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in generated content');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Group articles by provider with URLs
  const sourcesByProvider: { [provider: string]: { title: string; url: string }[] } = {};

  newsDetails.forEach((news) => {
    const provider = news.news_detail?.PROVIDER ?? news.metadata.provider ?? 'Unknown';
    const title = news.news_detail?.TITLE ?? news.metadata.title ?? 'Untitled';
    const url = news.news_detail?.PROVIDER_LINK_PAGE ?? news.metadata.url ?? '';

    if (!sourcesByProvider[provider]) {
      sourcesByProvider[provider] = [];
    }

    sourcesByProvider[provider].push({ title, url });
  });

  // Create output data
  const generatedNews: GeneratedNews = {
    title: parsed.title ?? '통합 뉴스',
    summary: parsed.summary ?? '',
    content: parsed.content ?? '',
    sources_count: Object.keys(sourcesByProvider).length,
    sources: sourcesByProvider,
    generation_timestamp: new Date().toISOString(),
    input_articles_count: newsDetails.length,
  };

  const endTime = Date.now();
  const executionTime = endTime - startTime;

  return {
    generatedNews,
    executionTime
  };
}

export function formatAsMarkdown(news: GeneratedNews): string {
  // Format sources list
  const sourcesList = Object.entries(news.sources)
    .map(([provider, articles]) => {
      const articlesList = articles
        .map((article) => `  - [${article.title}](${article.url})`)
        .join('\n');
      return `- **${provider}** (${articles.length}개)\n${articlesList}`;
    })
    .join('\n\n');

  return `# ${news.title}

> **AI 뉴스 통합 보고서**  
> 📅 생성일시: ${new Date(news.generation_timestamp).toLocaleString('ko-KR')}  
> 📰 참고 기사: ${news.input_articles_count}개  
> 🏢 참고 언론사: ${news.sources_count}개사

## 📝 요약

${news.summary}

## 📄 본문

${news.content}

## 📊 메타데이터

| 항목 | 내용 |
|------|------|
| **생성 시간** | ${news.generation_timestamp} |
| **참고 기사 수** | ${news.input_articles_count}개 |
| **참고 언론사 수** | ${news.sources_count}개사 |

## 📰 참고 기사 목록

${sourcesList}

---

*🤖 AI 뉴스 통합 시스템으로 생성된 콘텐츠입니다.*
`;
}

