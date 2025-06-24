/**
 * 뉴스 처리 프롬프트 템플릿 로더
 * 외부 파일에서 프롬프트를 로드하고 변수를 치환하는 기능
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface ConsolidationPromptVariables {
  TOPIC: string;
  NEWS_COUNT: string;
  SOURCES_COUNT: string;
  FORMATTED_NEWS: string;
}

export class PromptLoader {
  private static readonly PROMPT_DIR = './prompts';
  
  /**
   * 뉴스 통합 프롬프트 템플릿을 로드하고 변수를 치환
   */
  static loadConsolidationPrompt(variables: ConsolidationPromptVariables): string {
    try {
      // 현재 작업 디렉토리에서 프롬프트 파일 경로 구성
      const currentDir = process.cwd();
      let promptPath: string;
      
      // news-processor 패키지 내에서 실행되는 경우
      if (currentDir.includes('news-processor')) {
        promptPath = join(currentDir, 'dist', 'prompts', 'news-consolidation-prompt.md');
      } else {
        // 루트에서 실행되는 경우
        promptPath = join(currentDir, 'packages', 'news-processor', 'dist', 'prompts', 'news-consolidation-prompt.md');
      }
      
      let template = readFileSync(promptPath, 'utf-8');
      
      // 템플릿 변수 치환
      for (const [key, value] of Object.entries(variables)) {
        const placeholder = `{{${key}}}`;
        template = template.replace(new RegExp(placeholder, 'g'), value);
      }
      
      return template;
      
    } catch (error) {
      throw new Error(`프롬프트 로드 실패: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * 템플릿 변수가 모두 치환되었는지 검증
   */
  static validateTemplate(content: string): boolean {
    // {{변수명}} 패턴이 남아있으면 false
    const remainingPlaceholders = content.match(/\{\{[A-Z_]+\}\}/g);
    return remainingPlaceholders === null;
  }
  
  /**
   * 남은 템플릿 변수 목록 반환
   */
  static getRemainingPlaceholders(content: string): string[] {
    const matches = content.match(/\{\{([A-Z_]+)\}\}/g);
    return matches ? matches.map(match => match.slice(2, -2)) : [];
  }
}