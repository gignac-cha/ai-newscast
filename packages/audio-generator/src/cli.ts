#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { AudioGenerator } from './audio-generator.js';
import { AudioGeneratorConfig } from './types/index.js';
import { ErrorHandler } from './utils/error-handler.js';

interface CLIArgs {
  scriptPath: string;
  outputDirectory: string;
  configPath?: string;
  verbose?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('사용법: audio-generator <script-path> <output-directory> [options]');
    console.error('');
    console.error('Arguments:');
    console.error('  script-path      뉴스캐스트 스크립트 JSON 파일 경로');
    console.error('  output-directory 오디오 파일 출력 디렉토리');
    console.error('');
    console.error('Options:');
    console.error('  --config <path>  설정 파일 경로 (JSON)');
    console.error('  --verbose        상세 로그 출력');
    console.error('');
    console.error('예시:');
    console.error('  audio-generator ./newscast-script.json ./output');
    console.error('  audio-generator ./script.json ./output --config ./config.json --verbose');
    process.exit(1);
  }

  const result: CLIArgs = {
    scriptPath: args[0],
    outputDirectory: args[1],
  };

  // Parse options
  for (let i = 2; i < args.length; i++) {
    switch (args[i]) {
      case '--config':
        if (i + 1 >= args.length) {
          console.error('❌ --config 옵션에는 파일 경로가 필요합니다.');
          process.exit(1);
        }
        result.configPath = args[++i];
        break;
      case '--verbose':
        result.verbose = true;
        break;
      default:
        console.error(`❌ 알 수 없는 옵션: ${args[i]}`);
        process.exit(1);
    }
  }

  return result;
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<Partial<AudioGeneratorConfig>> {
  if (!configPath) {
    return {};
  }

  try {
    const configContent = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    console.log(`📋 설정 파일 로드: ${configPath}`);
    return config;
  } catch (error) {
    console.warn(`⚠️ 설정 파일 로드 실패 (${configPath}), 기본 설정 사용: ${error}`);
    return {};
  }
}

/**
 * Validate file paths
 */
async function validatePaths(scriptPath: string, outputDirectory: string): Promise<void> {
  // Check script file exists
  try {
    await fs.access(scriptPath);
  } catch {
    throw new Error(`스크립트 파일을 찾을 수 없습니다: ${scriptPath}`);
  }

  // Ensure output directory exists
  try {
    await fs.mkdir(outputDirectory, { recursive: true });
  } catch (error) {
    throw new Error(`출력 디렉토리 생성 실패: ${outputDirectory} - ${error}`);
  }
}

/**
 * Check environment setup
 */
function checkEnvironment(): void {
  // Check Google Cloud credentials
  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CLOUD_PROJECT) {
    console.warn('⚠️ Google Cloud 인증 설정이 확인되지 않습니다.');
    console.warn('   GOOGLE_APPLICATION_CREDENTIALS 환경변수를 설정하거나');
    console.warn('   Application Default Credentials (ADC)를 설정해주세요.');
    console.warn('   일단 시도해보겠습니다...');
  }
}

/**
 * Main CLI function
 */
async function main(): Promise<void> {
  const startTime = performance.now();
  
  try {
    const args = parseArgs();
    
    if (args.verbose) {
      console.log('🔧 상세 로그 모드 활성화');
      console.log(`📁 스크립트: ${args.scriptPath}`);
      console.log(`📁 출력 폴더: ${args.outputDirectory}`);
      if (args.configPath) {
        console.log(`⚙️ 설정 파일: ${args.configPath}`);
      }
    }

    // Environment checks
    checkEnvironment();

    // Validate paths
    await validatePaths(args.scriptPath, args.outputDirectory);

    // Load configuration
    const config = await loadConfig(args.configPath);

    // Initialize audio generator
    const audioGenerator = new AudioGenerator(config);

    // Setup progress callback for verbose mode
    const progressCallback = args.verbose 
      ? (update: any) => {
          console.log(`   📊 진행률: ${update.percentage.toFixed(1)}% - ${update.message}`);
        }
      : undefined;

    // Generate audio
    const result = await audioGenerator.generateNewscastAudio(
      args.scriptPath,
      args.outputDirectory,
      progressCallback
    );

    const totalTime = performance.now() - startTime;
    
    console.log(`\\n🎉 오디오 생성 성공!`);
    console.log(`   ⏱️ 총 실행 시간: ${(totalTime / 1000).toFixed(2)}초`);
    console.log(`   📊 성공률: ${result.metadata.success_rate}`);
    console.log(`   📁 결과 파일: ${path.join(args.outputDirectory, 'audio', 'audio-files.json')}`);

  } catch (error) {
    const audioError = ErrorHandler.handleTTSError(error, 'CLI 실행');
    console.error(`\\n❌ ${ErrorHandler.getUserFriendlyMessage(audioError)}`);
    
    if (error instanceof Error && error.stack) {
      console.error('\\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// ES 모듈에서 직접 실행 확인
const isMainModule = process.argv[1] && (
  process.argv[1].endsWith('cli.ts') || 
  process.argv[1].endsWith('cli.js')
);

if (isMainModule) {
  main();
}