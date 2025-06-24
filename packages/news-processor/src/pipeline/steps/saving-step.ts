import type { PipelineStep, PipelineContext, StepResult } from '../../interfaces/pipeline-step.ts';
import type { SaveResult } from '../../types/index.ts';
import { FileManager } from '../../managers/file-manager.ts';
import { NewsLoader } from '../../loaders/news-loader.ts';

/**
 * 결과 저장 단계
 */
export class SavingStep implements PipelineStep<void, SaveResult> {
  readonly name = 'saving';
  readonly description = '결과 저장';
  
  private fileManager: FileManager;
  private newsLoader: NewsLoader;
  
  constructor() {
    this.fileManager = new FileManager();
    this.newsLoader = new NewsLoader();
  }
  
  async execute(context: PipelineContext): Promise<StepResult<SaveResult>> {
    const startTime = Date.now();
    
    try {
      const { newsListData, newsItems, consolidatedContent } = context.data;
      
      if (!newsListData || !newsItems || !consolidatedContent) {
        throw new Error('필요한 데이터가 준비되지 않았습니다.');
      }
      
      if (context.enableVerbose) {
        console.log('\n💾 결과 저장 중...');
      }
      
      const outputPath = this.fileManager.createOutputPath(
        context.topicFolderPath, 
        context.outputFilename
      );
      
      const sources = this.newsLoader.extractSources(newsItems);
      
      const { jsonPath, textPath } = await this.fileManager.saveConsolidatedNews(
        newsListData,
        newsItems,
        consolidatedContent,
        sources,
        outputPath
      );
      
      const saveTime = Date.now() - startTime;
      
      // 파일 크기 정보 수집
      const fs = await import('fs');
      const jsonStats = await fs.promises.stat(jsonPath);
      const textStats = await fs.promises.stat(textPath);
      
      const result: SaveResult = {
        jsonPath,
        textPath,
        saveTime,
        fileSizes: {
          json: this.formatFileSize(jsonStats.size),
          text: this.formatFileSize(textStats.size)
        }
      };
      
      if (context.enableVerbose) {
        await this.fileManager.displaySavedFileInfo(jsonPath, textPath);
      }
      
      return {
        success: true,
        data: result,
        message: '결과 저장 완료',
        metrics: { saveTime }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: '결과 저장 실패'
      };
    }
  }
  
  async validate(context: PipelineContext): Promise<boolean> {
    const { newsListData, newsItems, consolidatedContent } = context.data;
    return !!(newsListData && newsItems && consolidatedContent);
  }
  
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}