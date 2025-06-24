import type { NewsList, NewsDetail, ConsolidatedNews } from '@ai-newscast/core';
import type { ProcessingResult, ProcessingMetrics } from '../types/index.ts';

/**
 * 뉴스 비즈니스 로직 서비스
 */
export class NewsService {
  /**
   * 뉴스 데이터 유효성을 검증합니다
   */
  validateNewsData(newsListData: NewsList, newsItems: NewsDetail[]): void {
    if (!newsListData) {
      throw new Error('뉴스 목록 데이터가 없습니다.');
    }
    
    if (!newsItems || newsItems.length === 0) {
      throw new Error('통합할 뉴스 데이터가 없습니다.');
    }
    
    if (!newsListData.topic) {
      throw new Error('뉴스 주제가 설정되지 않았습니다.');
    }
  }
  
  /**
   * 뉴스 통계를 계산합니다
   */
  calculateNewsStats(newsItems: NewsDetail[], consolidatedContent: string): {
    totalArticles: number;
    consolidatedLength: number;
    averageArticleLength: number;
    sourcesCount: number;
  } {
    const totalArticles = newsItems.length;
    const consolidatedLength = consolidatedContent.length;
    const averageArticleLength = Math.round(
      newsItems.reduce((sum, item) => sum + (item.content?.length || 0), 0) / totalArticles
    );
    
    const uniqueSources = new Set(newsItems.map(item => item.news_agency));
    const sourcesCount = uniqueSources.size;
    
    return {
      totalArticles,
      consolidatedLength,
      averageArticleLength,
      sourcesCount
    };
  }
  
  /**
   * 처리 결과를 생성합니다
   */
  createProcessingResult(
    outputPath: string,
    totalTime: number,
    metrics: ProcessingMetrics
  ): ProcessingResult {
    return {
      outputPath,
      totalTime,
      metrics
    };
  }
  
  /**
   * 뉴스 미리보기를 생성합니다
   */
  createNewsPreview(consolidatedContent: string, maxLength: number = 200): string {
    if (consolidatedContent.length <= maxLength) {
      return consolidatedContent;
    }
    
    return consolidatedContent.substring(0, maxLength) + '...';
  }
  
  /**
   * 통합된 뉴스의 품질을 평가합니다
   */
  assessContentQuality(consolidatedContent: string): {
    score: number; // 0-100
    issues: string[];
    recommendations: string[];
  } {
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 100;
    
    // 길이 검사
    if (consolidatedContent.length < 100) {
      issues.push('통합 내용이 너무 짧습니다');
      recommendations.push('더 많은 뉴스 데이터를 포함하세요');
      score -= 20;
    }
    
    if (consolidatedContent.length > 5000) {
      issues.push('통합 내용이 너무 깁니다');
      recommendations.push('요약을 더 간결하게 작성하세요');
      score -= 10;
    }
    
    // 구조 검사
    const paragraphs = consolidatedContent.split('\n\n');
    if (paragraphs.length < 2) {
      issues.push('단락 구조가 부족합니다');
      recommendations.push('내용을 단락으로 나누어 구성하세요');
      score -= 15;
    }
    
    // 중복 내용 검사
    const sentences = consolidatedContent.split(/[.!?]+/);
    const duplicateThreshold = 0.8;
    let duplicateCount = 0;
    
    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const similarity = this.calculateStringSimilarity(
          sentences[i].trim(), 
          sentences[j].trim()
        );
        if (similarity > duplicateThreshold) {
          duplicateCount++;
        }
      }
    }
    
    if (duplicateCount > sentences.length * 0.1) {
      issues.push('중복 내용이 많습니다');
      recommendations.push('중복 제거를 강화하세요');
      score -= 25;
    }
    
    return {
      score: Math.max(0, score),
      issues,
      recommendations
    };
  }
  
  /**
   * 두 문자열의 유사도를 계산합니다 (0-1)
   */
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length < 10 || str2.length < 10) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  /**
   * 레벤슈타인 거리를 계산합니다
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}