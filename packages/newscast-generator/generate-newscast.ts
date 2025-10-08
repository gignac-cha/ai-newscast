import type { AudioOutput } from './types.ts';
import type { NewscastMergeMetrics } from '@ai-newscast/core';

interface MergeResult {
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
  audioData: Uint8Array;
  metrics: NewscastMergeMetrics;
}

interface GenerateNewscastOptions {
  newscastID: string;
  topicIndex: number;
  lambdaApiURL: string;
}

export async function generateNewscast(options: GenerateNewscastOptions): Promise<MergeResult> {
  const { newscastID, topicIndex, lambdaApiURL } = options;

  console.log('🎵 뉴스캐스트 오디오 병합 시작...');
  const totalStartTime = performance.now();

  // Call Lambda API Gateway
  const url = `${lambdaApiURL}/prod/newscast`;
  console.log(`   🔗 Lambda API 호출: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      newscast_id: newscastID,
      topic_index: topicIndex,
      dry_run: false,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Lambda API 호출 실패: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log(`   ✅ Lambda 병합 완료: ${result.output_file_size} bytes`);

  if (!result.audio_base64) {
    throw new Error('Lambda 응답에 audio_base64 데이터가 없습니다.');
  }

  // Decode base64 audio data
  console.log('🔧 Base64 디코딩 중...');
  const binaryString = atob(result.audio_base64);
  const audioData = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    audioData[i] = binaryString.charCodeAt(i);
  }

  const totalTime = performance.now() - totalStartTime;

  // Convert snake_case metrics from Lambda to camelCase
  const lambdaMetrics = result.metrics;
  const metrics: NewscastMergeMetrics = {
    newscastID: lambdaMetrics.newscast_id,
    topicIndex: lambdaMetrics.topic_index,
    timing: {
      startedAt: lambdaMetrics.timing.started_at,
      completedAt: lambdaMetrics.timing.completed_at,
      duration: lambdaMetrics.timing.duration,
      downloadTime: lambdaMetrics.timing.download_time,
      mergeTime: lambdaMetrics.timing.merge_time
    },
    input: {
      totalAudioFiles: lambdaMetrics.input.total_audio_files,
      downloadedFiles: lambdaMetrics.input.downloaded_files,
      failedDownloads: lambdaMetrics.input.failed_downloads,
      totalInputSize: lambdaMetrics.input.total_input_size
    },
    output: {
      mergedFileName: lambdaMetrics.output.merged_file_name,
      mergedFileSize: lambdaMetrics.output.merged_file_size,
      estimatedDuration: lambdaMetrics.output.estimated_duration
    },
    performance: {
      filesPerSecond: lambdaMetrics.performance.files_per_second,
      downloadSpeed: lambdaMetrics.performance.download_speed,
      successRate: lambdaMetrics.performance.success_rate
    }
  };

  const mergeResult: MergeResult = {
    title: result.title ?? 'AI 뉴스캐스트',
    programName: result.program_name ?? 'AI 뉴스캐스트',
    mergeTimestamp: new Date().toISOString(),
    inputFiles: result.input_files ?? 0,
    outputFile: 'newscast.mp3',
    finalDurationSeconds: metrics.output.estimatedDuration,
    finalDurationFormatted: `${metrics.output.estimatedDuration.toFixed(1)}초`,
    fileSizeBytes: result.output_file_size ?? audioData.length,
    fileSizeFormatted: `${((result.output_file_size ?? audioData.length) / 1024 / 1024).toFixed(2)} MB`,
    originalMetadata: result.original_metadata ?? {},
    audioData: audioData,
    metrics: metrics,
  };

  console.log(`\n✅ 뉴스캐스트 오디오 병합 완료!`);
  console.log(`   🎬 프로그램: ${mergeResult.programName}`);
  console.log(`   📊 입력 파일: ${mergeResult.inputFiles}개`);
  console.log(`   🎵 최종 파일: ${mergeResult.outputFile}`);
  console.log(`   💾 파일 크기: ${mergeResult.fileSizeFormatted}`);
  console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);

  return mergeResult;
}