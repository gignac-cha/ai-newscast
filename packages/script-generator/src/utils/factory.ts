/**
 * Factory functions for convenient script generation
 */

import { ScriptGenerator } from '../script-generator.ts';
import {
  ScriptGeneratorOptions,
  ConsolidatedNews,
  NewscastScript,
  ScriptGenerationMetrics
} from '../interfaces/index.ts';

/**
 * ScriptGenerator 인스턴스 생성
 */
export function createScriptGenerator(options?: ScriptGeneratorOptions): ScriptGenerator {
  return new ScriptGenerator(options);
}

/**
 * 단일 스크립트 생성 편의 함수
 */
export async function generateScript(
  newsData: ConsolidatedNews,
  options?: ScriptGeneratorOptions & { outputPath?: string }
): Promise<{ script: NewscastScript; metrics: ScriptGenerationMetrics }> {
  const generator = createScriptGenerator(options);
  
  try {
    const result = await generator.generateScript(newsData, options?.outputPath);
    return result;
  } finally {
    generator.dispose();
  }
}

/**
 * 배치 스크립트 생성 편의 함수
 */
export async function generateBatchScripts(
  newsDataList: ConsolidatedNews[],
  options?: ScriptGeneratorOptions & { baseOutputPath?: string }
): Promise<{ scripts: NewscastScript[]; metrics: ScriptGenerationMetrics[] }> {
  const generator = createScriptGenerator(options);
  
  try {
    const result = await generator.generateBatchScripts(newsDataList, options?.baseOutputPath);
    return result;
  } finally {
    generator.dispose();
  }
}