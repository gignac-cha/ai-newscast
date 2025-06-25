import { NewsConsolidator } from './consolidator.ts';
import type { NewsProcessorOptions } from './types/index.ts';
import * as path from 'path';
import fs from 'fs/promises';

/**
 * CLI 메인 함수
 */
async function main() {
  const startTime = Date.now();
  
  try {
    // 명령행 인자 처리
    const args = process.argv.slice(2);
    if (args.length < 1) {
      console.log('AI News Cast - News Processor v2.0.0');
      console.log('');
      console.log('사용법: pnpm process <topic-folder-path>');
      console.log('');
      console.log('예시:');
      console.log('  pnpm process ./output/2025-06-21T10:30:45.123456/topic-01');
      console.log('  pnpm process /path/to/bigkinds/folder/topic-02');
      console.log('');
      console.log('결과: 해당 주제 폴더에 news.json 및 news.txt 파일로 저장됩니다.');
      process.exit(1);
    }
    
    // 루트 프로젝트 기준 상대경로 해결
    const inputPath = args[0];
    const topicFolderPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    
    try {
      const stat = await fs.stat(topicFolderPath);
      if (!stat.isDirectory()) {
        throw new Error(`지정된 경로가 폴더가 아닙니다: ${topicFolderPath}`);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`주제 폴더를 찾을 수 없습니다: ${topicFolderPath} (오류: ${errorMessage})`);
    }
    
    console.log('🚀 AI News Cast - News Processor');
    console.log('='.repeat(50));
    
    // 뉴스 통합 프로세서 초기화
    const options: NewsProcessorOptions = {
      verbose: true,
      enableRetry: true,
      enableMetrics: true
    };
    const consolidator = new NewsConsolidator(options);
    
    // 뉴스 통합 실행
    const result = await consolidator.processTopicFolder(topicFolderPath);
    const { outputPath, totalTime, metrics } = result;
    
    console.log('\n🎉 처리 완료!');
    console.log(`📁 출력 파일: ${outputPath}`);
    console.log(`⏱️  총 실행 시간: ${(totalTime / 1000).toFixed(2)}초`);
    console.log(`\n📊 처리 메트릭:`);
    console.log(`  📰 통합된 기사 수: ${metrics.totalArticles}개`);
    console.log(`  📏 통합 내용 길이: ${metrics.consolidatedLength.toLocaleString()}자`);
    console.log(`  📺 참고 언론사 수: ${metrics.sourcesCount}개`);
    
  } catch (error) {
    console.error('\n❌ 오류 발생:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// CLI 실행
main();