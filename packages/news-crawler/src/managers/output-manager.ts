import { join } from 'path';
import type { OutputManager } from '../interfaces/output-manager.ts';
import { FileUtils, Logger } from '@ai-newscast/core';

/**
 * 파일 출력 관리자
 */
export class FileOutputManager implements OutputManager {
  private outputPath: string;
  
  constructor(outputPath: string) {
    this.outputPath = outputPath;
  }
  
  /**
   * JSON 데이터를 저장합니다
   */
  async saveJson<T>(filename: string, data: T): Promise<string> {
    const filePath = join(this.outputPath, filename);
    await FileUtils.saveJson(filePath, data);
    Logger.info(`JSON saved to: ${filePath}`);
    return filePath;
  }
  
  /**
   * HTML 데이터를 저장합니다
   */
  async saveHtml(filename: string, content: string): Promise<string> {
    const filePath = join(this.outputPath, filename);
    await FileUtils.saveText(filePath, content);
    Logger.info(`HTML saved to: ${filePath}`);
    return filePath;
  }
  
  /**
   * 출력 디렉토리를 설정합니다
   */
  setOutputDir(path: string): void {
    this.outputPath = path;
  }
  
  /**
   * 출력 디렉토리를 생성합니다
   */
  async ensureOutputDir(): Promise<void> {
    await FileUtils.ensureDir(this.outputPath);
  }
  
  /**
   * 현재 출력 경로를 반환합니다
   */
  getOutputPath(): string {
    return this.outputPath;
  }
  
  /**
   * 하위 디렉토리 경로를 생성합니다
   */
  async createSubDir(subPath: string): Promise<string> {
    const fullPath = join(this.outputPath, subPath);
    await FileUtils.ensureDir(fullPath);
    return fullPath;
  }
  
  /**
   * 개별 뉴스 상세를 저장합니다
   */
  async saveNewsDetail(newsId: string, data: any, subDir: string = 'news'): Promise<string> {
    const newsDir = await this.createSubDir(subDir);
    const filePath = join(newsDir, `${newsId}.json`);
    await FileUtils.saveJson(filePath, data);
    return filePath;
  }
}