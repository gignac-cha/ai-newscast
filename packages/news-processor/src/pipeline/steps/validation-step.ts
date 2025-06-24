import type { PipelineStep, PipelineContext, StepResult } from '../../interfaces/pipeline-step.ts';
import { FileManager } from '../../managers/file-manager.ts';

/**
 * 유효성 검사 단계
 */
export class ValidationStep implements PipelineStep {
  readonly name = 'validation';
  readonly description = '폴더 및 파일 유효성 검사';
  
  private fileManager: FileManager;
  
  constructor() {
    this.fileManager = new FileManager();
  }
  
  async execute(context: PipelineContext): Promise<StepResult> {
    const startTime = Date.now();
    
    try {
      // 폴더 유효성 검사
      await this.fileManager.validateTopicFolder(context.topicFolderPath);
      
      // 필수 파일 유효성 검사
      await this.fileManager.validateRequiredFiles(context.topicFolderPath);
      
      const validationTime = Date.now() - startTime;
      
      if (context.enableVerbose) {
        console.log('✅ 폴더 및 파일 유효성 검사 완료');
      }
      
      return {
        success: true,
        message: '유효성 검사 완료',
        metrics: { validationTime }
      };
      
    } catch (error) {
      return {
        success: false,
        error: error as Error,
        message: '유효성 검사 실패'
      };
    }
  }
  
  async validate(context: PipelineContext): Promise<boolean> {
    return !!context.topicFolderPath;
  }
}