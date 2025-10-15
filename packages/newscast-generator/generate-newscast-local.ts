import fs from 'fs/promises';
import path from 'path';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import ffmpeg from '@ffmpeg-installer/ffmpeg';
import type { AudioOutput } from './types.ts';
import type { NewscastMergeMetrics } from '@ai-newscast/core';

const execAsync = promisify(exec);

export interface MergeResult {
  title: string;
  programName: string;
  mergeTimestamp: string;
  inputFiles: number;
  outputFile: string;
  finalDurationSeconds: number;
  finalDurationFormatted: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  originalMetadata: AudioOutput['metadata'];
  metrics: NewscastMergeMetrics;
}

async function checkFFmpegInstallation(): Promise<boolean> {
  try {
    await execAsync(`"${ffmpeg.path}" -version`);
    return true;
  } catch (error) {
    console.warn('⚠️ FFmpeg 실행 확인 실패, 시스템 FFmpeg 확인 중...');
    try {
      await execAsync('ffmpeg -version');
      return true;
    } catch (systemError) {
      return false;
    }
  }
}

async function mergeAudioFiles(
  audioFiles: AudioOutput['audioFiles'],
  outputPath: string,
  topicFolderPath: string
): Promise<{ mergedCount: number; totalInputSize: number; mergeTime: number }> {
  console.log('🔧 오디오 파일 병합 중...');
  const mergeStartTime = performance.now();

  // 파일 존재 확인 및 정렬
  const existingFiles = [];
  let totalInputSize = 0;

  for (const audioFile of audioFiles.sort((a, b) => a.sequence - b.sequence)) {
    const fullPath = path.join(topicFolderPath, audioFile.filePath);
    try {
      await fs.access(fullPath);
      const stats = await fs.stat(fullPath);
      totalInputSize += stats.size;
      existingFiles.push(audioFile);
    } catch (error) {
      console.warn(`   ⚠️  파일 없음: ${audioFile.filePath}`);
    }
  }

  if (existingFiles.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  console.log(`   📊 병합 대상: ${existingFiles.length}개 파일`);

  // FFmpeg 파일 리스트 생성
  const fileListPath = path.join(path.dirname(outputPath), 'filelist.txt');
  const fileListContent = existingFiles
    .map(audioFile => `file '${path.resolve(topicFolderPath, audioFile.filePath)}'`)
    .join('\n');

  await fs.writeFile(fileListPath, fileListContent, 'utf-8');

  // FFmpeg 명령 실행 (concat demuxer 사용)
  const ffmpegPath = ffmpeg.path;
  const ffmpegCommand = [
    ffmpegPath,
    '-f', 'concat',
    '-safe', '0',
    '-i', fileListPath,
    '-c', 'copy',
    '-y', // 덮어쓰기
    outputPath
  ];

  console.log(`   🔧 FFmpeg 실행: ${ffmpegCommand.join(' ')}`);

  return new Promise((resolve, reject) => {
    const ffmpegProcess = spawn(ffmpegCommand[0], ffmpegCommand.slice(1), {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stderr = '';

    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', async (code) => {
      // 임시 파일 리스트 삭제
      try {
        await fs.unlink(fileListPath);
      } catch (error) {
        console.warn(`   ⚠️  임시 파일 삭제 실패: ${error}`);
      }

      if (code === 0) {
        const mergeTime = performance.now() - mergeStartTime;
        console.log(`   ✅ 오디오 병합 완료: ${mergeTime.toFixed(1)}ms`);
        resolve({
          mergedCount: existingFiles.length,
          totalInputSize,
          mergeTime
        });
      } else {
        console.error(`   ❌ FFmpeg 오류:\n${stderr}`);
        reject(new Error(`FFmpeg 프로세스가 코드 ${code}로 종료되었습니다.`));
      }
    });

    ffmpegProcess.on('error', (error) => {
      reject(new Error(`FFmpeg 실행 오류: ${error.message}`));
    });
  });
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

export async function generateNewscastLocal(topicFolderPath: string): Promise<MergeResult> {
  console.log('🎵 뉴스캐스트 오디오 병합 시작...');
  const startedAt = new Date().toISOString();
  const totalStartTime = performance.now();

  // FFmpeg 설치 확인
  const ffmpegInstalled = await checkFFmpegInstallation();
  if (!ffmpegInstalled) {
    throw new Error('FFmpeg가 설치되지 않았습니다. 오디오 병합을 위해 FFmpeg를 설치해주세요.');
  }

  // 오디오 파일 목록 로드
  const audioListPath = path.join(topicFolderPath, 'audio', 'audio-files.json');

  console.log('📄 오디오 파일 목록 로딩 중...');
  const loadStartTime = performance.now();

  const audioListContent = await fs.readFile(audioListPath, 'utf-8');
  const audioList: AudioOutput = JSON.parse(audioListContent);

  const loadTime = performance.now() - loadStartTime;
  console.log(`   ⏱️  파일 목록 로드: ${loadTime.toFixed(1)}ms`);
  console.log(`   📊 총 오디오 파일: ${audioList.audioFiles.length}개`);

  if (audioList.audioFiles.length === 0) {
    throw new Error('병합할 오디오 파일이 없습니다.');
  }

  // 출력 파일 경로
  const outputFileName = `newscast.mp3`;
  const outputPath = path.join(topicFolderPath, outputFileName);

  // 오디오 병합
  const mergeStats = await mergeAudioFiles(audioList.audioFiles, outputPath, topicFolderPath);

  // 최종 파일 정보
  const finalDuration = await getAudioDuration(outputPath);
  const fileStats = await fs.stat(outputPath);

  const completedAt = new Date().toISOString();
  const totalTime = performance.now() - totalStartTime;

  // Metrics 생성
  const metrics: NewscastMergeMetrics = {
    newscastID: audioList.metrics.newscastID,
    topicIndex: audioList.metrics.topicIndex,
    timing: {
      startedAt,
      completedAt,
      duration: totalTime,
      downloadTime: 0, // 로컬 파일이므로 다운로드 시간 없음
      mergeTime: mergeStats.mergeTime
    },
    input: {
      totalAudioFiles: audioList.audioFiles.length,
      downloadedFiles: mergeStats.mergedCount,
      failedDownloads: audioList.audioFiles.length - mergeStats.mergedCount,
      totalInputSize: mergeStats.totalInputSize
    },
    output: {
      mergedFileName: outputFileName,
      mergedFileSize: fileStats.size,
      estimatedDuration: finalDuration
    },
    performance: {
      filesPerSecond: mergeStats.mergedCount / (mergeStats.mergeTime / 1000),
      downloadSpeed: 0, // 로컬 파일이므로 다운로드 속도 없음
      successRate: `${((mergeStats.mergedCount / audioList.audioFiles.length) * 100).toFixed(1)}%`
    }
  };

  // 병합 결과 저장
  const mergeResult: MergeResult = {
    title: audioList.title,
    programName: audioList.programName,
    mergeTimestamp: completedAt,
    inputFiles: audioList.audioFiles.length,
    outputFile: outputFileName,
    finalDurationSeconds: finalDuration,
    finalDurationFormatted: `${Math.floor(finalDuration / 60)}분 ${Math.floor(finalDuration % 60)}초`,
    fileSizeBytes: fileStats.size,
    fileSizeFormatted: `${(fileStats.size / 1024 / 1024).toFixed(2)} MB`,
    originalMetadata: audioList.metadata,
    metrics
  };

  const mergeResultPath = path.join(topicFolderPath, 'newscast-audio-info.json');
  await fs.writeFile(mergeResultPath, JSON.stringify(mergeResult, null, 2), 'utf-8');

  console.log(`\n✅ 뉴스캐스트 오디오 병합 완료!`);
  console.log(`   🎬 프로그램: ${audioList.programName}`);
  console.log(`   📊 입력 파일: ${audioList.audioFiles.length}개`);
  console.log(`   🎵 최종 파일: ${outputFileName}`);
  console.log(`   ⏱️  재생 시간: ${mergeResult.finalDurationFormatted}`);
  console.log(`   💾 파일 크기: ${mergeResult.fileSizeFormatted}`);
  console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);
  console.log(`   📁 저장 위치: ${outputPath}`);

  return mergeResult;
}
