import fs from 'fs/promises';
import * as path from 'path';
import type { NewsList, NewsDetail } from '@ai-newscast/core';

/**
 * 뉴스 데이터 로딩을 담당하는 클래스
 */
export class NewsLoader {
  /**
   * 특정 주제 폴더에서 뉴스 목록 데이터를 로드합니다
   */
  async loadNewsList(topicFolderPath: string): Promise<NewsList> {
    const newsListPath = path.join(topicFolderPath, 'news-list.json');
    
    try {
      const content = await fs.readFile(newsListPath, 'utf-8');
      return JSON.parse(content) as NewsList;
    } catch (error) {
      throw new Error(`뉴스 목록 파일을 찾을 수 없습니다: ${newsListPath}`);
    }
  }

  /**
   * 특정 주제 폴더에서 개별 뉴스 상세 데이터들을 로드합니다
   */
  async loadNewsDetails(topicFolderPath: string): Promise<NewsDetail[]> {
    const newsItems: NewsDetail[] = [];
    const newsFolder = path.join(topicFolderPath, 'news');
    
    try {
      const files = await fs.readdir(newsFolder);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(newsFolder, file);
          try {
            const fileContent = await fs.readFile(filePath, 'utf-8');
            const newsItem: NewsDetail = JSON.parse(fileContent);
            
            // 유효한 내용이 있는 경우만 추가
            if (newsItem.content && newsItem.content.trim()) {
              newsItems.push(newsItem);
            }
          } catch (error) {
            console.warn(`⚠️  파일 읽기 오류 (${file}): ${error}`);
          }
        }
      }
    } catch (error) {
      console.warn(`⚠️  뉴스 폴더를 찾을 수 없습니다: ${newsFolder}`);
    }
    
    return newsItems;
  }

  /**
   * 특정 주제 폴더에서 모든 뉴스 데이터를 로드합니다
   */
  async loadAllNewsData(topicFolderPath: string): Promise<{ newsListData: NewsList; newsItems: NewsDetail[] }> {
    console.log(`📂 뉴스 데이터 로딩 중: ${topicFolderPath}`);
    
    const newsListData = await this.loadNewsList(topicFolderPath);
    const newsItems = await this.loadNewsDetails(topicFolderPath);
    
    console.log(`✅ 로딩 완료: ${newsItems.length}개 뉴스 상세 데이터`);
    return { newsListData, newsItems };
  }

  /**
   * 뉴스 항목들에서 언론사 목록을 추출합니다
   */
  extractSources(newsItems: NewsDetail[]): string[] {
    const sources = [...new Set(newsItems.map(item => 
      item.metadata?.provider || item.news_detail?.PROVIDER || ''
    ).filter(Boolean))];
    
    return sources;
  }

  /**
   * 뉴스 항목을 AI 입력용 텍스트로 변환합니다
   */
  formatNewsForAI(newsItems: NewsDetail[]): string {
    return newsItems.map((item, index) => {
      const title = item.metadata?.title || item.news_detail?.TITLE || '';
      const content = item.content || '';
      const provider = item.metadata?.provider || item.news_detail?.PROVIDER || '';
      const byline = item.metadata?.byline || item.news_detail?.BYLINE || '';
      
      return `=== 기사 ${index + 1} ===
언론사: ${provider}
기자: ${byline}
제목: ${title}
내용: ${content}
`;
    }).join('\n\n');
  }
}