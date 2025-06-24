import fs from 'fs/promises';
import * as path from 'path';
import type { NewsList, NewsDetail, ConsolidatedNews } from '@ai-newscast/core';

/**
 * 파일 저장과 관리를 담당하는 클래스
 */
export class FileManager {
  
  /**
   * 통합된 뉴스를 ConsolidatedNews 객체로 구성합니다
   */
  createConsolidatedNews(
    newsListData: NewsList,
    newsItems: NewsDetail[],
    consolidatedContent: string,
    sources: string[]
  ): ConsolidatedNews {
    return {
      topic: newsListData.topic,
      total_articles: newsItems.length,
      sources: sources,
      consolidated_content: consolidatedContent,
      original_timestamp: newsListData.extraction_timestamp,
      consolidation_timestamp: new Date().toISOString()
    };
  }

  /**
   * ConsolidatedNews를 JSON 파일로 저장합니다
   */
  async saveAsJSON(consolidatedNews: ConsolidatedNews, outputPath: string): Promise<void> {
    await fs.writeFile(outputPath, JSON.stringify(consolidatedNews, null, 2), 'utf-8');
    console.log(`💾 JSON 파일 저장: ${outputPath}`);
  }

  /**
   * ConsolidatedNews를 읽기 쉬운 텍스트 파일로 저장합니다
   */
  async saveAsText(consolidatedNews: ConsolidatedNews, outputPath: string): Promise<void> {
    const textContent = this.formatAsText(consolidatedNews);
    await fs.writeFile(outputPath, textContent, 'utf-8');
    console.log(`📝 텍스트 파일 저장: ${outputPath}`);
  }

  /**
   * ConsolidatedNews를 텍스트 형식으로 포맷팅합니다
   */
  private formatAsText(consolidatedNews: ConsolidatedNews): string {
    return `주제: ${consolidatedNews.topic}
총 기사 수: ${consolidatedNews.total_articles}개
참고 언론사: ${consolidatedNews.sources.join(', ')}
정리 일시: ${consolidatedNews.consolidation_timestamp}

=== 통합 내용 ===
${consolidatedNews.consolidated_content}
`;
  }

  /**
   * 통합된 뉴스를 JSON과 텍스트 파일로 모두 저장합니다
   */
  async saveConsolidatedNews(
    newsListData: NewsList,
    newsItems: NewsDetail[],
    consolidatedContent: string,
    sources: string[],
    outputPath: string
  ): Promise<{ jsonPath: string; textPath: string }> {
    // ConsolidatedNews 객체 생성
    const consolidatedNews = this.createConsolidatedNews(
      newsListData,
      newsItems,
      consolidatedContent,
      sources
    );

    // JSON 파일 저장
    await this.saveAsJSON(consolidatedNews, outputPath);
    
    // 텍스트 파일 저장
    const textOutputPath = outputPath.replace('.json', '.txt');
    await this.saveAsText(consolidatedNews, textOutputPath);

    return {
      jsonPath: outputPath,
      textPath: textOutputPath
    };
  }

  /**
   * 주어진 경로가 유효한 폴더인지 확인합니다
   */
  async validateTopicFolder(topicFolderPath: string): Promise<void> {
    try {
      const stat = await fs.stat(topicFolderPath);
      if (!stat.isDirectory()) {
        throw new Error(`지정된 경로가 폴더가 아닙니다: ${topicFolderPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`주제 폴더를 찾을 수 없습니다: ${topicFolderPath} (오류: ${errorMessage})`);
    }
  }

  /**
   * 필수 파일들이 주제 폴더에 존재하는지 확인합니다
   */
  async validateRequiredFiles(topicFolderPath: string): Promise<void> {
    const newsListPath = path.join(topicFolderPath, 'news-list.json');
    const newsFolder = path.join(topicFolderPath, 'news');

    try {
      await fs.access(newsListPath);
    } catch (error) {
      throw new Error(`뉴스 목록 파일이 없습니다: ${newsListPath}`);
    }

    try {
      const stat = await fs.stat(newsFolder);
      if (!stat.isDirectory()) {
        throw new Error(`뉴스 폴더가 없습니다: ${newsFolder}`);
      }
    } catch (error) {
      throw new Error(`뉴스 폴더에 접근할 수 없습니다: ${newsFolder}`);
    }
  }

  /**
   * 출력 경로를 생성합니다
   */
  createOutputPath(topicFolderPath: string, filename: string = 'news.json'): string {
    return path.join(topicFolderPath, filename);
  }

  /**
   * 파일 크기를 사람이 읽기 쉬운 형태로 반환합니다
   */
  async getFileSize(filePath: string): Promise<string> {
    try {
      const stats = await fs.stat(filePath);
      const bytes = stats.size;
      
      if (bytes === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
      return 'Unknown';
    }
  }

  /**
   * 저장된 파일들의 정보를 출력합니다
   */
  async displaySavedFileInfo(jsonPath: string, textPath: string): Promise<void> {
    const jsonSize = await this.getFileSize(jsonPath);
    const textSize = await this.getFileSize(textPath);
    
    console.log(`📁 저장된 파일 정보:`);
    console.log(`  📄 JSON: ${jsonPath} (${jsonSize})`);
    console.log(`  📝 텍스트: ${textPath} (${textSize})`);
  }
}