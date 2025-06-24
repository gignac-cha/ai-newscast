import { promises as fs } from 'fs';
import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

import { 
  AudioFileInfo, 
  AudioProcessorConfig, 
  FFmpegProcessingOptions,
  ProgressCallback,
  ProcessingProgress 
} from '../types/index.js';
import { ErrorHandler, FFmpegError } from '../utils/error-handler.js';

const execAsync = promisify(exec);

/**
 * FFmpeg service for audio processing and merging
 */
export class FFmpegService {
  private readonly config: AudioProcessorConfig;
  private progressCallback?: ProgressCallback;

  constructor(config: AudioProcessorConfig, progressCallback?: ProgressCallback) {
    this.config = config;
    this.progressCallback = progressCallback;
  }

  /**
   * Check if FFmpeg is installed and accessible
   */
  public async checkFFmpegInstallation(): Promise<boolean> {
    try {
      const ffmpegPath = this.config.ffmpeg.path || 'ffmpeg';
      await execAsync(`${ffmpegPath} -version`);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Merge audio files with silence insertion
   */
  public async mergeAudioFiles(
    audioFiles: AudioFileInfo[],
    outputPath: string,
    baseDirectory: string
  ): Promise<void> {
    this.reportProgress('validation', 0, 'FFmpeg 설치 확인 중...');
    
    const ffmpegInstalled = await this.checkFFmpegInstallation();
    if (!ffmpegInstalled) {
      throw new FFmpegError('FFmpeg가 설치되지 않았습니다. 오디오 병합을 위해 FFmpeg를 설치해주세요.');
    }

    this.reportProgress('validation', 10, '입력 파일 검증 중...');
    
    // Validate and sort audio files
    const validFiles = await this.validateAudioFiles(audioFiles, baseDirectory);
    if (validFiles.length === 0) {
      throw new FFmpegError('병합할 유효한 오디오 파일이 없습니다.');
    }

    console.log(`🔧 오디오 파일 병합 중... (${validFiles.length}개 파일)`);
    
    this.reportProgress('silence_generation', 20, '무음 구간 생성 중...');
    
    // Generate silence file
    const silencePath = await this.generateSilenceFile(outputPath);

    try {
      this.reportProgress('merging', 40, 'FFmpeg 필터 생성 중...');
      
      // Use complex filter for proper audio merging with silence
      await this.mergeWithComplexFilter(validFiles, silencePath, outputPath, baseDirectory);
      
      this.reportProgress('optimization', 80, '오디오 최적화 중...');
      
      // Optimize final output if needed
      if (this.config.processing.normalizeLevels) {
        await this.normalizeAudio(outputPath);
      }

      this.reportProgress('metadata', 90, '메타데이터 처리 중...');

    } finally {
      // Cleanup temporary files
      try {
        await fs.unlink(silencePath);
      } catch (error) {
        console.warn(`⚠️ 임시 파일 삭제 실패: ${error}`);
      }
    }

    this.reportProgress('metadata', 100, '병합 완료');
    console.log(`✅ 오디오 병합 완료: ${path.basename(outputPath)}`);
  }

  /**
   * Get audio duration using ffprobe
   */
  public async getAudioDuration(filePath: string): Promise<number> {
    try {
      const ffprobePath = this.config.ffmpeg.path?.replace('ffmpeg', 'ffprobe') || 'ffprobe';
      const { stdout } = await execAsync(
        `${ffprobePath} -v quiet -show_entries format=duration -of csv=p=0 "${filePath}"`
      );
      return parseFloat(stdout.trim());
    } catch (error) {
      console.warn(`⚠️ 오디오 길이 측정 실패: ${error}`);
      return 0;
    }
  }

  /**
   * Get audio quality metrics
   */
  public async getAudioMetrics(filePath: string): Promise<{
    peak_level_db?: number;
    average_level_db?: number;
    dynamic_range?: number;
  }> {
    try {
      const ffmpegPath = this.config.ffmpeg.path || 'ffmpeg';
      const { stdout } = await execAsync(
        `${ffmpegPath} -i "${filePath}" -af "volumedetect,astats" -f null - 2>&1`
      );
      
      // Parse FFmpeg output for audio metrics
      const peakMatch = stdout.match(/max_volume: (-?[\d.]+) dB/);
      const meanMatch = stdout.match(/mean_volume: (-?[\d.]+) dB/);
      
      return {
        peak_level_db: peakMatch ? parseFloat(peakMatch[1]) : undefined,
        average_level_db: meanMatch ? parseFloat(meanMatch[1]) : undefined,
        dynamic_range: peakMatch && meanMatch ? 
          Math.abs(parseFloat(peakMatch[1]) - parseFloat(meanMatch[1])) : undefined,
      };
    } catch (error) {
      console.warn(`⚠️ 오디오 메트릭 측정 실패: ${error}`);
      return {};
    }
  }

  /**
   * Validate audio files existence and sort by sequence
   */
  private async validateAudioFiles(
    audioFiles: AudioFileInfo[],
    baseDirectory: string
  ): Promise<AudioFileInfo[]> {
    const validFiles: AudioFileInfo[] = [];
    
    for (const audioFile of audioFiles.sort((a, b) => a.sequence - b.sequence)) {
      const fullPath = path.join(baseDirectory, audioFile.file_path);
      try {
        await fs.access(fullPath);
        validFiles.push(audioFile);
      } catch (error) {
        console.warn(`⚠️ 파일 없음: ${audioFile.file_path}`);
      }
    }

    return validFiles;
  }

  /**
   * Generate temporary silence file
   */
  private async generateSilenceFile(outputPath: string): Promise<string> {
    const silencePath = path.join(path.dirname(outputPath), 'temp_silence.mp3');
    const ffmpegPath = this.config.ffmpeg.path || 'ffmpeg';
    
    const silenceDuration = this.config.processing.silenceDuration;
    const sampleRate = this.config.output.sampleRate;
    
    const command = [
      ffmpegPath,
      '-f', 'lavfi',
      '-i', `anullsrc=channel_layout=mono:sample_rate=${sampleRate}`,
      '-t', silenceDuration.toString(),
      '-c:a', 'mp3',
      '-b:a', this.config.output.bitrate,
      '-y',
      silencePath
    ];

    await this.executeFFmpegCommand(command, '무음 파일 생성');
    return silencePath;
  }

  /**
   * Merge audio files using filter_complex (legacy approach for better quality)
   */
  private async mergeWithComplexFilter(
    audioFiles: AudioFileInfo[],
    silencePath: string,
    outputPath: string,
    baseDirectory: string
  ): Promise<void> {
    const ffmpegPath = this.config.ffmpeg.path || 'ffmpeg';
    
    // Create file list with silence insertion
    const fileListPath = path.join(path.dirname(outputPath), 'temp_filelist.txt');
    const fileListContent: string[] = [];
    
    for (let i = 0; i < audioFiles.length; i++) {
      const audioPath = path.resolve(baseDirectory, audioFiles[i].file_path);
      fileListContent.push(`file '${audioPath}'`);
      
      // Add silence after each file except the last one
      if (i < audioFiles.length - 1) {
        fileListContent.push(`file '${silencePath}'`);
      }
    }
    
    await fs.writeFile(fileListPath, fileListContent.join('\n'), 'utf-8');
    
    const command = [
      ffmpegPath,
      '-f', 'concat',
      '-safe', '0',
      '-i', fileListPath,
      '-c', 'copy',  // Use copy instead of re-encoding to preserve quality
    ];

    // Note: fade effects are disabled when using -c copy to preserve original quality

    if (this.config.ffmpeg.overwrite) {
      command.push('-y');
    }
    
    command.push(outputPath);

    try {
      await this.executeFFmpegCommand(command, '오디오 병합');
    } finally {
      // Cleanup temp file list
      try {
        await fs.unlink(fileListPath);
      } catch (error) {
        console.warn(`⚠️ 임시 파일 리스트 삭제 실패: ${error}`);
      }
    }
  }

  /**
   * Normalize audio levels
   */
  private async normalizeAudio(outputPath: string): Promise<void> {
    const tempPath = outputPath.replace('.mp3', '_temp.mp3');
    const ffmpegPath = this.config.ffmpeg.path || 'ffmpeg';
    
    const command = [
      ffmpegPath,
      '-i', outputPath,
      '-af', 'dynaudnorm=p=0.9:m=100:s=12:g=9',
      '-c:a', 'mp3',
      '-b:a', this.config.output.bitrate,
      '-y',
      tempPath
    ];

    await this.executeFFmpegCommand(command, '오디오 정규화');
    
    // Replace original with normalized version
    await fs.rename(tempPath, outputPath);
  }

  /**
   * Execute FFmpeg command with proper error handling
   */
  private async executeFFmpegCommand(command: string[], operation: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const process = spawn(command[0], command.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stderr = '';
      let stdout = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      const timeout = setTimeout(() => {
        process.kill('SIGKILL');
        reject(new FFmpegError(`${operation} 시간 초과 (${this.config.ffmpeg.timeout}ms)`));
      }, this.config.ffmpeg.timeout);

      process.on('close', (code) => {
        clearTimeout(timeout);
        
        if (code === 0) {
          resolve();
        } else {
          console.error(`FFmpeg stderr: ${stderr}`);
          console.error(`FFmpeg stdout: ${stdout}`);
          const error = new FFmpegError(
            `${operation} 실패: FFmpeg 프로세스가 코드 ${code}로 종료되었습니다.\\nStderr: ${stderr}`,
            { stdout, stderr, exitCode: code }
          );
          reject(error);
        }
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        reject(new FFmpegError(`${operation} 실행 오류: ${error.message}`));
      });
    });
  }

  /**
   * Report progress to callback if available
   */
  private reportProgress(
    stage: ProcessingProgress['stage'],
    percentage: number,
    message: string
  ): void {
    if (this.progressCallback) {
      this.progressCallback({ stage, percentage, message });
    }
  }
}