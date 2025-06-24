import { promises as fs } from 'fs';
import path from 'path';

import {
  AudioGenerationResult,
  AudioProcessingResult,
  AudioProcessorConfig,
  AudioProcessorConfigSchema,
  ProgressCallback,
} from './types/index.js';
import { FFmpegService } from './services/ffmpeg-service.js';
import { ErrorHandler, AudioProcessingError, ValidationError } from './utils/error-handler.js';

/**
 * Main audio processor class for merging and optimizing newscast audio
 */
export class AudioProcessor {
  private readonly config: AudioProcessorConfig;
  private readonly ffmpegService: FFmpegService;

  constructor(config: Partial<AudioProcessorConfig> = {}, progressCallback?: ProgressCallback) {
    // Validate and set default configuration
    this.config = AudioProcessorConfigSchema.parse(config);
    this.ffmpegService = new FFmpegService(this.config, progressCallback);
  }

  /**
   * Process newscast audio from audio-generator output
   */
  public async processNewscastAudio(
    audioListPath: string,
    outputDirectory: string,
    progressCallback?: ProgressCallback
  ): Promise<AudioProcessingResult> {
    console.log('🎵 뉴스캐스트 오디오 병합 시작...');
    const totalStartTime = performance.now();

    try {
      // Load and validate audio generation result
      const audioResult = await this.loadAudioGenerationResult(audioListPath);
      
      // Validate audio files exist - baseDirectory should be topic folder (parent of audio folder)
      const baseDirectory = path.dirname(path.dirname(audioListPath));
      await this.validateAudioFiles(audioResult, baseDirectory);

      // Generate output file path
      const outputPath = this.generateOutputPath(audioResult, outputDirectory);
      
      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      console.log(`📊 병합 대상: ${audioResult.audio_files.length}개 파일`);
      console.log(`🎯 출력 파일: ${path.basename(outputPath)}`);

      // Merge audio files with FFmpeg
      await this.ffmpegService.mergeAudioFiles(
        audioResult.audio_files,
        outputPath,
        baseDirectory
      );

      // Generate processing result
      const result = await this.generateProcessingResult(
        audioResult,
        outputPath,
        performance.now() - totalStartTime
      );

      // Save result metadata
      await this.saveProcessingResult(result, outputDirectory);

      // Print completion summary
      this.printCompletionSummary(result, outputPath);

      return result;

    } catch (error) {
      const audioError = ErrorHandler.handleError(error, '오디오 처리');
      console.error(`\\n❌ ${ErrorHandler.getUserFriendlyMessage(audioError)}`);
      throw audioError;
    }
  }

  /**
   * Process audio from topic folder (alternative interface)
   */
  public async processTopicAudio(
    topicFolderPath: string,
    progressCallback?: ProgressCallback
  ): Promise<AudioProcessingResult> {
    const audioListPath = path.join(topicFolderPath, 'audio', 'audio-files.json');
    
    try {
      await fs.access(audioListPath);
    } catch (error) {
      throw new ValidationError(
        `오디오 파일 목록을 찾을 수 없습니다: ${audioListPath}\\n` +
        '먼저 audio-generator를 실행하여 개별 오디오 파일들을 생성해주세요.',
        { audioListPath, topicFolderPath }
      );
    }

    return this.processNewscastAudio(audioListPath, topicFolderPath, progressCallback);
  }

  /**
   * Load and validate audio generation result
   */
  private async loadAudioGenerationResult(audioListPath: string): Promise<AudioGenerationResult> {
    console.log('📄 오디오 파일 목록 로딩 중...');
    const loadStartTime = performance.now();
    
    try {
      const audioListContent = await fs.readFile(audioListPath, 'utf-8');
      const audioResult = JSON.parse(audioListContent) as AudioGenerationResult;
      
      const loadTime = performance.now() - loadStartTime;
      console.log(`   ⏱️ 파일 목록 로드: ${loadTime.toFixed(1)}ms`);
      console.log(`   📊 총 오디오 파일: ${audioResult.audio_files.length}개`);
      console.log(`   🎬 프로그램: ${audioResult.program_name}`);

      if (audioResult.audio_files.length === 0) {
        throw new ValidationError('병합할 오디오 파일이 없습니다.');
      }

      return audioResult;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new ValidationError(
          `오디오 파일 목록 형식이 올바르지 않습니다: ${audioListPath}`,
          { audioListPath }
        );
      }
      throw ErrorHandler.handleError(error, '오디오 파일 목록 로딩');
    }
  }

  /**
   * Validate that audio files exist
   */
  private async validateAudioFiles(
    audioResult: AudioGenerationResult,
    baseDirectory: string
  ): Promise<void> {
    console.log('🔍 오디오 파일 존재 확인 중...');
    
    const missingFiles: string[] = [];
    
    for (const audioFile of audioResult.audio_files) {
      const fullPath = path.join(baseDirectory, audioFile.file_path);
      try {
        await fs.access(fullPath);
      } catch (error) {
        missingFiles.push(audioFile.file_path);
      }
    }

    if (missingFiles.length > 0) {
      throw new ValidationError(
        `다음 오디오 파일들을 찾을 수 없습니다:\\n${missingFiles.join('\\n')}`,
        { missingFiles, baseDirectory }
      );
    }

    console.log(`   ✅ 모든 오디오 파일 확인 완료`);
  }

  /**
   * Generate output file path based on configuration
   */
  private generateOutputPath(
    audioResult: AudioGenerationResult,
    outputDirectory: string
  ): string {
    // Use simple filename since we're already in timestamped folder structure
    const fileName = 'newscast.mp3';
    return path.join(outputDirectory, fileName);
  }

  /**
   * Generate processing result metadata
   */
  private async generateProcessingResult(
    audioResult: AudioGenerationResult,
    outputPath: string,
    processingTime: number
  ): Promise<AudioProcessingResult> {
    // Get final file information
    const finalDuration = await this.ffmpegService.getAudioDuration(outputPath);
    const fileStats = await fs.stat(outputPath);
    const audioMetrics = await this.ffmpegService.getAudioMetrics(outputPath);

    return {
      title: audioResult.title,
      program_name: audioResult.program_name,
      merge_timestamp: new Date().toISOString(),
      input_files: audioResult.audio_files.length,
      output_file: path.basename(outputPath),
      final_duration_seconds: finalDuration,
      final_duration_formatted: this.formatDuration(finalDuration),
      file_size_bytes: fileStats.size,
      file_size_formatted: this.formatFileSize(fileStats.size),
      processing_time_ms: processingTime,
      quality_metrics: audioMetrics,
      original_metadata: audioResult.metadata,
    };
  }

  /**
   * Save processing result to file
   */
  private async saveProcessingResult(
    result: AudioProcessingResult,
    outputDirectory: string
  ): Promise<void> {
    const resultPath = path.join(outputDirectory, 'newscast-audio-info.json');
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`📄 처리 결과 저장: ${path.basename(resultPath)}`);
  }

  /**
   * Print completion summary
   */
  private printCompletionSummary(result: AudioProcessingResult, outputPath: string): void {
    console.log(`\\n✅ 뉴스캐스트 오디오 병합 완료!`);
    console.log(`   🎬 프로그램: ${result.program_name}`);
    console.log(`   📊 입력 파일: ${result.input_files}개`);
    console.log(`   🎵 최종 파일: ${result.output_file}`);
    console.log(`   ⏱️ 재생 시간: ${result.final_duration_formatted}`);
    console.log(`   💾 파일 크기: ${result.file_size_formatted}`);
    console.log(`   🕐 처리 시간: ${(result.processing_time_ms / 1000).toFixed(2)}초`);
    console.log(`   📁 저장 위치: ${outputPath}`);

    if (result.quality_metrics?.peak_level_db !== undefined) {
      console.log(`   📈 최대 음량: ${result.quality_metrics.peak_level_db.toFixed(1)} dB`);
    }
    if (result.quality_metrics?.dynamic_range !== undefined) {
      console.log(`   📊 다이나믹 레인지: ${result.quality_metrics.dynamic_range.toFixed(1)} dB`);
    }
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}분 ${remainingSeconds}초`;
  }

  /**
   * Format file size in human-readable format
   */
  private formatFileSize(bytes: number): string {
    const mb = bytes / 1024 / 1024;
    return `${mb.toFixed(2)} MB`;
  }

  /**
   * Get service status
   */
  public async getServiceStatus(): Promise<{
    ffmpegAvailable: boolean;
    config: AudioProcessorConfig;
  }> {
    return {
      ffmpegAvailable: await this.ffmpegService.checkFFmpegInstallation(),
      config: this.config,
    };
  }
}