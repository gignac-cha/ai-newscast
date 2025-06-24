#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { AudioProcessor } from './audio-processor.js';
import { AudioProcessorConfig } from './types/index.js';
import { ErrorHandler } from './utils/error-handler.js';

interface CLIArgs {
  input: string;
  output?: string;
  configPath?: string;
  verbose?: boolean;
  help?: boolean;
}

/**
 * Parse command line arguments
 */
function parseArgs(): CLIArgs {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    return { input: '', help: true };
  }

  const result: CLIArgs = {
    input: args[0],
  };

  // Parse options
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '--output':
      case '-o':
        if (i + 1 >= args.length) {
          console.error('❌ --output 옵션에는 디렉토리 경로가 필요합니다.');
          process.exit(1);
        }
        result.output = args[++i];
        break;
      case '--config':
      case '-c':
        if (i + 1 >= args.length) {
          console.error('❌ --config 옵션에는 파일 경로가 필요합니다.');
          process.exit(1);
        }
        result.configPath = args[++i];
        break;
      case '--verbose':
      case '-v':
        result.verbose = true;
        break;
      case '--help':
      case '-h':
        result.help = true;
        break;
      default:
        console.error(`❌ 알 수 없는 옵션: ${args[i]}`);
        process.exit(1);
    }
  }

  return result;
}

/**
 * Show help message
 */
function showHelp(): void {
  console.log('사용법: audio-processor <input> [options]');
  console.log('');
  console.log('Arguments:');
  console.log('  input                오디오 파일 목록 JSON 또는 토픽 폴더 경로');
  console.log('');
  console.log('Options:');
  console.log('  -o, --output <dir>   출력 디렉토리 (기본: 입력과 같은 디렉토리)');
  console.log('  -c, --config <path>  설정 파일 경로 (JSON)');
  console.log('  -v, --verbose        상세 로그 출력');
  console.log('  -h, --help           도움말 표시');
  console.log('');
  console.log('입력 형식:');
  console.log('  1. audio-files.json 파일 경로:');
  console.log('     audio-processor ./output/topic-01/audio/audio-files.json');
  console.log('');
  console.log('  2. 토픽 폴더 경로 (audio/audio-files.json 자동 탐지):');
  console.log('     audio-processor ./output/topic-01');
  console.log('');
  console.log('예시:');
  console.log('  audio-processor ./output/topic-01');
  console.log('  audio-processor ./audio-files.json --output ./merged');
  console.log('  audio-processor ./topic-01 --config ./config.json --verbose');
}

/**
 * Load configuration from file
 */
async function loadConfig(configPath?: string): Promise<Partial<AudioProcessorConfig>> {
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
 * Determine input type and paths
 */
async function resolveInputPaths(input: string): Promise<{
  audioListPath: string;
  outputDirectory: string;
}> {
  try {
    const inputStats = await fs.stat(input);
    
    if (inputStats.isFile()) {
      // Direct audio-files.json path
      if (!input.endsWith('audio-files.json')) {
        throw new Error('파일 입력은 audio-files.json 파일이어야 합니다.');
      }
      
      return {
        audioListPath: input,
        outputDirectory: path.dirname(path.dirname(input)), // Go up from audio/ folder
      };
    } else if (inputStats.isDirectory()) {
      // Topic folder path - look for audio/audio-files.json
      const audioListPath = path.join(input, 'audio', 'audio-files.json');
      
      try {
        await fs.access(audioListPath);
      } catch (error) {
        throw new Error(
          `토픽 폴더에서 audio-files.json을 찾을 수 없습니다: ${audioListPath}\\n` +
          '먼저 audio-generator를 실행하여 오디오 파일을 생성해주세요.'
        );
      }
      
      return {
        audioListPath,
        outputDirectory: input,
      };
    } else {
      throw new Error('입력은 파일 또는 디렉토리여야 합니다.');
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes('ENOENT')) {
      throw new Error(`입력 경로를 찾을 수 없습니다: ${input}`);
    }
    throw error;
  }
}

/**
 * Check environment setup
 */
async function checkEnvironment(): Promise<void> {
  // Check FFmpeg installation
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);
    
    await execAsync('ffmpeg -version');
    console.log('✅ FFmpeg 설치 확인됨');
  } catch (error) {
    console.warn('⚠️ FFmpeg가 설치되지 않았거나 PATH에서 찾을 수 없습니다.');
    console.warn('   오디오 병합을 위해 FFmpeg를 설치해주세요:');
    console.warn('   - Ubuntu/Debian: sudo apt install ffmpeg');
    console.warn('   - macOS: brew install ffmpeg');
    console.warn('   - Windows: choco install ffmpeg');
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
    
    if (args.help || !args.input) {
      showHelp();
      process.exit(args.help ? 0 : 1);
    }

    if (args.verbose) {
      console.log('🔧 상세 로그 모드 활성화');
      console.log(`📁 입력: ${args.input}`);
      if (args.output) {
        console.log(`📁 출력: ${args.output}`);
      }
      if (args.configPath) {
        console.log(`⚙️ 설정 파일: ${args.configPath}`);
      }
    }

    // Environment checks
    await checkEnvironment();

    // Resolve input paths
    const { audioListPath, outputDirectory } = await resolveInputPaths(args.input);
    const finalOutputDirectory = args.output || outputDirectory;

    if (args.verbose) {
      console.log(`📄 오디오 목록: ${audioListPath}`);
      console.log(`📁 출력 디렉토리: ${finalOutputDirectory}`);
    }

    // Load configuration
    const config = await loadConfig(args.configPath);

    // Initialize audio processor
    const audioProcessor = new AudioProcessor(config);

    // Setup progress callback for verbose mode
    const progressCallback = args.verbose 
      ? (update: any) => {
          console.log(`   📊 ${update.stage}: ${update.percentage.toFixed(1)}% - ${update.message}`);
        }
      : undefined;

    // Process audio
    const result = await audioProcessor.processNewscastAudio(
      audioListPath,
      finalOutputDirectory,
      progressCallback
    );

    const totalTime = performance.now() - startTime;
    
    console.log(`\\n🎉 오디오 처리 성공!`);
    console.log(`   ⏱️ 총 실행 시간: ${(totalTime / 1000).toFixed(2)}초`);
    console.log(`   🎵 최종 파일: ${result.output_file}`);
    console.log(`   📊 재생 시간: ${result.final_duration_formatted}`);
    console.log(`   📄 결과 정보: ${path.join(finalOutputDirectory, 'newscast-audio-info.json')}`);

  } catch (error) {
    const audioError = ErrorHandler.handleError(error, 'CLI 실행');
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