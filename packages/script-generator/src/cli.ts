#!/usr/bin/env node
/**
 * CLI for @ai-newscast/script-generator
 */

import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';
import { ScriptGenerator } from './script-generator.ts';
import { ConsolidatedNews } from './interfaces/index.ts';

// Load environment variables
config();

interface CLIOptions {
  newsPath: string;
  outputPath?: string;
  voicesConfig?: string;
  verbose?: boolean;
  help?: boolean;
}

/**
 * CLI 도움말 출력
 */
function printHelp(): void {
  console.log(`
🎬 AI News Cast Script Generator

사용법:
  script-generator <news-json-path> [options]

매개변수:
  news-json-path    통합 뉴스 JSON 파일 경로 (news.json)

옵션:
  -o, --output <path>      출력 디렉토리 (기본값: ./script-output)
  -v, --voices <path>      TTS 음성 설정 파일 경로 (기본값: tts-voices.json)
  --verbose               상세 로그 출력
  -h, --help              도움말 출력

예시:
  script-generator ./output/topic-01/news.json
  script-generator ./output/topic-01/news.json -o ./scripts
  script-generator ./output/topic-01/news.json -v ./config/voices.json --verbose

환경변수:
  GOOGLE_AI_API_KEY       Google Gemini API 키 (필수)
`);
}

/**
 * CLI 인수 파싱
 */
function parseArguments(): CLIOptions {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('-h') || args.includes('--help')) {
    return { newsPath: '', help: true };
  }

  const options: CLIOptions = {
    newsPath: args[0],
    verbose: args.includes('--verbose')
  };

  // 출력 경로
  const outputIndex = args.findIndex(arg => arg === '-o' || arg === '--output');
  if (outputIndex !== -1 && args[outputIndex + 1]) {
    options.outputPath = args[outputIndex + 1];
  }

  // 음성 설정 경로
  const voicesIndex = args.findIndex(arg => arg === '-v' || arg === '--voices');
  if (voicesIndex !== -1 && args[voicesIndex + 1]) {
    options.voicesConfig = args[voicesIndex + 1];
  }

  return options;
}

/**
 * 뉴스 데이터 로드 (경로 자동 해결)
 */
async function loadNewsData(inputPath: string): Promise<ConsolidatedNews> {
  try {
    // 절대경로로 변환
    const basePath = path.isAbsolute(inputPath) ? inputPath : path.resolve(process.cwd(), inputPath);
    
    let newsFilePath: string;
    
    // 입력이 디렉토리인지 파일인지 확인
    const stat = await fs.stat(basePath);
    
    if (stat.isDirectory()) {
      // 디렉토리인 경우 news.json 파일 찾기
      newsFilePath = path.join(basePath, 'news.json');
      
      // news.json이 없으면 에러
      try {
        await fs.access(newsFilePath);
      } catch {
        throw new Error(`뉴스 파일을 찾을 수 없습니다: ${basePath}/news.json`);
      }
    } else {
      // 파일인 경우 그대로 사용
      newsFilePath = basePath;
    }
    
    const content = await fs.readFile(newsFilePath, 'utf-8');
    const data = JSON.parse(content);
    
    // 기본 유효성 검증
    if (!data.topic || !data.consolidated_content) {
      throw new Error('유효하지 않은 뉴스 데이터 형식입니다');
    }

    return data as ConsolidatedNews;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`뉴스 파일을 찾을 수 없습니다: ${inputPath}`);
    }
    throw error;
  }
}

/**
 * 진행상황 표시
 */
function createProgressHandler(verbose: boolean) {
  return (step: string, progress: number, message?: string) => {
    if (verbose) {
      console.log(`[${progress.toFixed(1)}%] ${step}: ${message || ''}`);
    } else {
      // 간단한 진행률 표시
      const bar = '█'.repeat(Math.floor(progress / 5)) + '░'.repeat(20 - Math.floor(progress / 5));
      process.stdout.write(`\r🎬 스크립트 생성 중... [${bar}] ${progress.toFixed(1)}%`);
      
      if (progress >= 100) {
        console.log(''); // 새 줄
      }
    }
  };
}

/**
 * 메인 실행 함수
 */
async function main(): Promise<void> {
  const options = parseArguments();

  if (options.help) {
    printHelp();
    return;
  }

  if (!options.newsPath) {
    console.error('❌ 오류: 뉴스 JSON 파일 경로가 필요합니다');
    console.error('도움말: script-generator --help');
    process.exit(1);
  }

  // API 키 확인
  if (!process.env.GOOGLE_AI_API_KEY) {
    console.error('❌ 오류: GOOGLE_AI_API_KEY 환경변수가 설정되지 않았습니다');
    console.error('Google AI Studio에서 API 키를 발급받아 환경변수로 설정해주세요');
    process.exit(1);
  }

  try {
    const startTime = Date.now();
    
    console.log('🎬 AI 뉴스캐스트 스크립트 생성기 시작');
    
    if (options.verbose) {
      console.log(`📄 뉴스 파일: ${options.newsPath}`);
      console.log(`📁 출력 경로: ${options.outputPath || './script-output'}`);
      console.log(`🎤 음성 설정: ${options.voicesConfig || 'tts-voices.json'}`);
    }

    // 뉴스 데이터 로드
    console.log('📖 뉴스 데이터 로딩 중...');
    
    if (options.verbose) {
      console.log(`   입력 경로: ${options.newsPath}`);
      console.log(`   절대 경로: ${path.resolve(options.newsPath)}`);
    }
    
    const newsData = await loadNewsData(options.newsPath);
    
    if (options.verbose) {
      console.log(`   주제: ${newsData.topic}`);
      console.log(`   기사 수: ${newsData.total_articles}개`);
      console.log(`   언론사: ${newsData.sources.length}개`);
    }

    // 스크립트 생성기 초기화
    const generator = new ScriptGenerator({
      outputPath: options.outputPath,
      voicesConfigPath: options.voicesConfig,
      enableProgress: true,
      enableMetrics: true
    });

    // 진행상황 핸들러 설정
    generator.setProgressCallback(createProgressHandler(options.verbose || false));

    // 스크립트 생성
    console.log('🚀 스크립트 생성 시작...');
    const { script, metrics } = await generator.generateScript(newsData);

    const endTime = Date.now();
    const totalTime = endTime - startTime;

    // 결과 출력
    console.log('\n✅ 뉴스캐스트 스크립트 생성 완료!');
    console.log(`🎬 제목: ${script.title}`);
    console.log(`👥 진행자: ${script.hosts.host1.name}, ${script.hosts.host2.name}`);
    console.log(`🕐 예상 시간: ${script.metadata.estimated_duration}`);
    console.log(`📝 대화 라인: ${script.metadata.total_dialogue_lines}개`);
    console.log(`⏱️  생성 시간: ${totalTime}ms`);

    if (options.verbose && metrics) {
      console.log('\n📊 상세 성능 메트릭스:');
      console.log(`   음성 설정 로드: ${metrics.voiceLoadTime.toFixed(1)}ms`);
      console.log(`   AI 스크립트 생성: ${metrics.aiGenerationTime.toFixed(1)}ms`);
      console.log(`   대화 라인 파싱: ${metrics.parsingTime.toFixed(1)}ms`);
      console.log(`   파일 저장: ${metrics.savingTime.toFixed(1)}ms`);
      console.log(`   스크립트 길이: ${metrics.scriptLength}자`);
    }

    // 정리
    generator.dispose();

  } catch (error) {
    console.error('\n❌ 스크립트 생성 실패:', error instanceof Error ? error.message : String(error));
    
    if (options.verbose && error instanceof Error) {
      console.error('\n상세 오류 정보:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ 치명적 오류:', error);
    process.exit(1);
  });
}