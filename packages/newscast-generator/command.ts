#!/usr/bin/env node

import { Command } from 'commander';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname, join, basename, relative } from 'path';
import { existsSync } from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import { generateNewscastScript } from './generate-newscast-script.ts';
import { generateNewscastAudio } from './generate-newscast-audio.ts';
import { loadPrompt, loadTTSHosts } from './utils.ts';
import type { GeneratedNews, NewscastOutput } from './types.ts';

const execAsync = promisify(exec);

interface ScriptCommandOptions {
  inputFile: string;
  outputFile: string;
  printFormat?: 'json' | 'text';
  printLogFile?: string;
}

interface AudioCommandOptions {
  inputFile: string;
  outputDir: string;
  printFormat?: 'json' | 'text';
  printLogFile?: string;
}

async function generateScriptToFiles({
  inputFile,
  outputFile,
  printFormat = 'text',
  printLogFile,
}: ScriptCommandOptions) {
  const apiKey = process.env.GOOGLE_GEN_AI_API_KEY;

  if (!apiKey) {
    throw new Error('GOOGLE_GEN_AI_API_KEY environment variable is required');
  }

  const [newsContent, promptTemplate, voices] = await Promise.all([
    readFile(inputFile, 'utf-8'),
    loadPrompt(),
    loadTTSHosts(),
  ]);

  const newsData = JSON.parse(newsContent) as GeneratedNews;
  const result = await generateNewscastScript({
    news: newsData,
    promptTemplate,
    voices,
    apiKey,
  });

  await mkdir(dirname(outputFile), { recursive: true });
  await writeFile(outputFile, JSON.stringify(result.output, null, 2), 'utf-8');

  const markdownFile = outputFile.endsWith('.json')
    ? outputFile.replace(/\.json$/i, '.md')
    : `${outputFile}.md`;
  await writeFile(markdownFile, result.markdown, 'utf-8');

  const logPayload = {
    timestamp: result.stats.completedAt,
    started_at: result.stats.startedAt,
    elapsed_ms: result.stats.elapsedMs,
    script_lines: result.stats.scriptLines,
    hosts: `${result.stats.hosts.host1}, ${result.stats.hosts.host2}`,
    input_file: inputFile,
    output_file: outputFile,
    markdown_file: markdownFile,
  };

  if (printFormat === 'json') {
    console.log(JSON.stringify(logPayload, null, 2));
  } else {
    console.log(`✅ Generated newscast script: ${outputFile}`);
    console.log(`📝 Script lines: ${result.stats.scriptLines}`);
    console.log(`🎙️ Hosts: ${result.stats.hosts.host1}, ${result.stats.hosts.host2}`);
    console.log(`⏱️ Elapsed: ${(result.stats.elapsedMs / 1000).toFixed(2)}s`);
  }

  if (printLogFile) {
    await mkdir(dirname(printLogFile), { recursive: true });
    await writeFile(printLogFile, JSON.stringify(logPayload, null, 2), 'utf-8');
  }

  return { markdownFile };
}

async function getAudioDuration(filePath: string): Promise<number> {
  try {
    const ffmpegPath = ffmpeg.path;
    const ffprobePath = ffmpegPath.replace('ffmpeg', 'ffprobe');
    const { stdout } = await execAsync(`"${ffprobePath}" -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
    return parseFloat(stdout.trim());
  } catch (error) {
    // ffprobe 실패 시 시스템 ffprobe 시도
    try {
      const { stdout } = await execAsync(`ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`);
      return parseFloat(stdout.trim());
    } catch (systemError) {
      console.warn(`   ⚠️  오디오 길이 측정 실패: ${error}`);
      return 0;
    }
  }
}

export async function generateAudioToFiles({
  inputFile,
  outputDir,
  printFormat = 'text',
  printLogFile,
}: AudioCommandOptions) {
  const startTime = Date.now();

  // Google Cloud API 키 확인
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_CLOUD_API_KEY environment variable is required');
  }

  // 입력 파일 확인
  if (!existsSync(inputFile)) {
    throw new Error(`Input file does not exist: ${inputFile}`);
  }

  // 스크립트 데이터 로드
  const scriptContent = await readFile(inputFile, 'utf-8');
  const newscastData: NewscastOutput = JSON.parse(scriptContent);

  // 오디오 생성
  const result = await generateNewscastAudio({
    newscastData,
    apiKey,
  });

  // 오디오 폴더 생성
  const audioFolderPath = join(outputDir, 'audio');
  await mkdir(audioFolderPath, { recursive: true });

  console.log('🎙️ 뉴스캐스트 오디오 생성 시작...');
  console.log(`   📊 총 스크립트 라인: ${newscastData.script.length}개`);
  console.log(`   👥 진행자: ${newscastData.hosts.host1.name} (${newscastData.hosts.host1.voice_model}), ${newscastData.hosts.host2.name} (${newscastData.hosts.host2.voice_model})`);

  console.log('\n🎵 개별 스크립트 라인 오디오 저장 중...');

  // 오디오 파일 저장 및 duration 측정
  for (const audioFile of result.audioFiles) {
    const audioFilePath = join(audioFolderPath, audioFile.fileName);
    await writeFile(audioFilePath, audioFile.audioContent);

    // duration 측정 및 업데이트
    const duration = await getAudioDuration(audioFilePath);
    const audioFileInfo = result.audioOutput.audio_files.find(f => f.sequence === audioFile.sequence);
    if (audioFileInfo) {
      audioFileInfo.duration_seconds = duration;
    }

    console.log(`   ✅ 저장 완료: ${basename(audioFilePath)} (${duration.toFixed(2)}s)`);
    console.log(`   🎤 음성 생성 중: ${audioFile.sequence.toString().padStart(3, '0')}. [${audioFile.scriptLine.name ?? audioFile.scriptLine.role}]`);
  }

  // 오디오 파일 목록 저장
  const audioListPath = join(audioFolderPath, 'audio-files.json');
  await writeFile(audioListPath, JSON.stringify(result.audioOutput, null, 2), 'utf-8');

  const endTime = Date.now();
  const elapsedSeconds = ((endTime - startTime) / 1000).toFixed(2);

  // 로그 출력 생성
  const logOutput = {
    timestamp: new Date().toISOString(),
    'elapsed-time': `${elapsedSeconds}s`,
    'dialogue-lines': result.stats.dialogueCount,
    'music-lines': result.stats.musicCount,
    'audio-files-generated': result.stats.successCount,
    'files-skipped': result.stats.skipCount,
    'files-failed': result.stats.failCount,
    'success-rate': result.stats.successRate,
    'output-dir': audioFolderPath,
  };

  // 로그 출력
  if (printFormat === 'json') {
    console.log(JSON.stringify(logOutput, null, 2));
  } else {
    console.log(`\n✅ 뉴스캐스트 오디오 생성 완료!`);
    console.log(`   🎬 프로그램: ${newscastData.program_name}`);
    console.log(`   📊 대화 라인: ${result.stats.dialogueCount}개, 음악 구간: ${result.stats.musicCount}개`);
    console.log(`   🎤 TTS 생성: ${result.stats.successCount}개 성공, ${result.stats.failCount}개 실패`);
    console.log(`   🎵 음악 구간: ${result.stats.skipCount}개 스킵`);
    console.log(`   📈 TTS 성공률: ${result.stats.successRate}`);
    console.log(`   ⏱️  오디오 생성 시간: ${result.stats.elapsedMs}ms`);
    console.log(`   🕐 전체 소요 시간: ${elapsedSeconds}s`);
    console.log(`   📁 저장 위치: ${audioFolderPath}`);

    if (result.stats.failCount > 0) {
      console.warn(`\n⚠️  ${result.stats.failCount}개 스크립트 라인 생성 실패. Google Cloud TTS API 설정을 확인해주세요.`);
    }

    if (result.stats.skipCount > 0) {
      console.log(`\n💡 ${result.stats.skipCount}개 음악 구간은 별도로 음악 파일을 준비하여 추가해주세요:`);
      newscastData.script
        .filter(line => line.type !== 'dialogue')
        .forEach((line) => {
          const sequence = newscastData.script.indexOf(line) + 1;
          const fileName = `${sequence.toString().padStart(3, '0')}-${line.type}.mp3`;
          console.log(`   🎵 ${fileName}: ${line.content}`);
        });
    }
  }

  // 로그 파일 저장
  if (printLogFile) {
    await mkdir(dirname(printLogFile), { recursive: true });
    await writeFile(printLogFile, JSON.stringify(logOutput, null, 2));
  }

  return { audioFolderPath, audioListPath };
}

const program = new Command();

program
  .name('newscast-generator')
  .description('AI-powered newscast script and audio generator with Google TTS integration')
  .version('1.0.0');

// Script Generation Command
program
  .command('script')
  .description('Generate newscast script from consolidated news')
  .requiredOption('-i, --input-file <path>', 'Input JSON file containing consolidated news')
  .requiredOption('-o, --output-file <path>', 'Output file path for generated script')
  .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
  .option('-l, --print-log-file <path>', 'File to write JSON log output')
  .action(async (options) => {
    try {
      const { inputFile, outputFile, printFormat, printLogFile } = options;
      await generateScriptToFiles({ inputFile, outputFile, printFormat, printLogFile });
    } catch (error) {
      console.error('❌ Error generating script:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

// Audio Generation Command
program
  .command('audio')
  .description('Generate TTS audio from newscast script')
  .requiredOption('-i, --input-file <path>', 'Input JSON file containing newscast script')
  .requiredOption('-o, --output-dir <path>', 'Output directory for generated audio files')
  .option('-f, --print-format <format>', 'Output format (json|text)', 'text')
  .option('-l, --print-log-file <path>', 'File to write JSON log output')
  .action(async (options) => {
    try {
      const { inputFile, outputDir, printFormat, printLogFile } = options;
      await generateAudioToFiles({ inputFile, outputDir, printFormat, printLogFile });
    } catch (error) {
      console.error('❌ Error generating audio:', error instanceof Error ? error.message : error);
      process.exit(1);
    }
  });

program.parse();
