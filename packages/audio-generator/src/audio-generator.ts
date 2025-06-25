import { promises as fs } from 'fs';
import path from 'path';

import {
  NewscastScript,
  AudioGenerationResult,
  AudioGeneratorConfig,
  AudioGeneratorConfigSchema,
  DialogueLine,
  AudioFileInfo,
} from './types/index.js';
import { TTSService } from './services/tts-service.js';
import { VoiceMappingService } from './services/voice-mapping.js';
import { AudioProgressTracker, ProgressCallback } from './monitoring/progress-tracker.js';
import { ErrorHandler, AudioGenerationError } from './utils/error-handler.js';

/**
 * Main audio generator class that orchestrates TTS generation
 */
export class AudioGenerator {
  private readonly ttsService: TTSService;
  private readonly config: AudioGeneratorConfig;

  constructor(config: Partial<AudioGeneratorConfig> = {}) {
    // Validate and set default configuration
    this.config = AudioGeneratorConfigSchema.parse(config);
    this.ttsService = new TTSService(this.config);
  }

  /**
   * Generate audio files for a newscast script
   */
  public async generateNewscastAudio(
    scriptPath: string,
    outputDirectory: string,
    progressCallback?: ProgressCallback
  ): Promise<AudioGenerationResult> {
    console.log('🎙️ 뉴스캐스트 오디오 생성 시작...');
    const totalStartTime = performance.now();

    try {
      // Load and validate script
      const script = await this.loadScript(scriptPath);
      
      // Setup output directory
      const audioFolderPath = path.join(outputDirectory, this.config.outputConfig.audioFolder);
      await fs.mkdir(audioFolderPath, { recursive: true });

      // Initialize progress tracking
      const dialogueCount = script.dialogue_lines.filter(line => line.type === 'dialogue').length;
      const musicCount = script.dialogue_lines.filter(line => line.type !== 'dialogue').length;
      const progressTracker = new AudioProgressTracker(dialogueCount, musicCount, progressCallback);

      console.log(`   📊 총 대사 라인: ${script.dialogue_lines.length}개`);
      console.log(`   👥 진행자: ${script.hosts.host1.name} (${script.hosts.host1.voice_model}), ${script.hosts.host2.name} (${script.hosts.host2.voice_model})`);
      console.log(`   💬 대화 구간: ${dialogueCount}개, 음악 구간: ${musicCount}개`);

      // Validate TTS service
      if (!(await this.ttsService.validateCredentials())) {
        console.warn('⚠️ Google Cloud TTS 인증 검증 실패. 계속 진행하겠습니다...');
      }

      // Generate audio for each dialogue line (병렬 처리)
      console.log('\\n🎵 개별 대사 라인 오디오 생성 중... (병렬 처리)');
      const audioGenerationStart = performance.now();
      
      const audioFiles: AudioFileInfo[] = [];

      // 대화 라인만 필터링 (음악 구간은 스킵)
      const dialogueLines = script.dialogue_lines.filter(line => line.type === 'dialogue');
      const musicLines = script.dialogue_lines.filter(line => line.type !== 'dialogue');
      
      // 음악 구간 스킵 처리
      musicLines.forEach(() => progressTracker.recordSkip());
      
      if (dialogueLines.length === 0) {
        console.log('   ℹ️ 처리할 대화 라인이 없습니다.');
      } else {
        // 병렬 처리 (동시 최대 3개, Rate Limiting 고려)
        const maxConcurrency = 3;
        const results = await this.processDialoguesInBatches(
          dialogueLines, 
          audioFolderPath, 
          outputDirectory, 
          maxConcurrency, 
          progressTracker
        );
        
        audioFiles.push(...results);
      }

      const audioGenerationTime = performance.now() - audioGenerationStart;

      // Generate result metadata
      const result = await this.generateResult(
        script,
        audioFiles,
        progressTracker,
        audioGenerationTime,
        outputDirectory
      );

      // Save result metadata
      await this.saveResultMetadata(result, audioFolderPath);

      const totalTime = performance.now() - totalStartTime;
      
      // Print completion summary
      this.printCompletionSummary(result, audioFolderPath, totalTime);

      return result;

    } catch (error) {
      const audioError = ErrorHandler.handleTTSError(error, '오디오 생성');
      console.error(`\\n❌ ${ErrorHandler.getUserFriendlyMessage(audioError)}`);
      throw audioError;
    }
  }

  /**
   * 대화 라인들을 배치로 나누어 병렬 처리
   */
  private async processDialoguesInBatches(
    dialogueLines: DialogueLine[],
    audioFolderPath: string,
    outputDirectory: string,
    maxConcurrency: number,
    progressTracker: AudioProgressTracker
  ): Promise<AudioFileInfo[]> {
    const audioFiles: AudioFileInfo[] = [];
    
    console.log(`   📊 총 ${dialogueLines.length}개 대화 라인을 ${maxConcurrency}개씩 병렬 처리`);
    
    for (let i = 0; i < dialogueLines.length; i += maxConcurrency) {
      const batch = dialogueLines.slice(i, i + maxConcurrency);
      const batchNumber = Math.floor(i / maxConcurrency) + 1;
      const totalBatches = Math.ceil(dialogueLines.length / maxConcurrency);
      
      console.log(`   🔄 배치 ${batchNumber}/${totalBatches} 처리 중... (${batch.length}개 라인)`);
      
      // 배치 내 모든 대화 라인을 병렬 처리
      const batchPromises = batch.map(async (dialogue) => {
        return await this.processSingleDialogue(
          dialogue, 
          audioFolderPath, 
          outputDirectory, 
          progressTracker
        );
      });
      
      // 배치 완료 대기
      const batchResults = await Promise.allSettled(batchPromises);
      
      // 성공한 결과만 수집
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          audioFiles.push(result.value);
        } else if (result.status === 'rejected') {
          const dialogue = batch[index];
          console.error(`   ❌ 대사 라인 ${dialogue.sequence} 처리 실패:`, result.reason);
        }
      });
      
      console.log(`   ✅ 배치 ${batchNumber} 완료`);
      
      // Rate limiting: 배치 간 짧은 지연
      if (i + maxConcurrency < dialogueLines.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return audioFiles.sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * 개별 대화 라인 처리
   */
  private async processSingleDialogue(
    dialogue: DialogueLine,
    audioFolderPath: string,
    outputDirectory: string,
    progressTracker: AudioProgressTracker
  ): Promise<AudioFileInfo | null> {
    const startTime = performance.now();
    
    try {
      const audioFileName = this.ttsService.generateAudioFilename(dialogue);
      const audioFilePath = path.join(audioFolderPath, audioFileName);
      
      await this.ttsService.generateAudio(dialogue, audioFilePath);
      
      const audioFileInfo: AudioFileInfo = {
        file_path: path.relative(outputDirectory, audioFilePath),
        sequence: dialogue.sequence,
        type: dialogue.type,
        speaker: VoiceMappingService.getDisplayName(dialogue.speaker),
      };
      
      const processingTime = performance.now() - startTime;
      progressTracker.recordSuccess(processingTime);
      
      return audioFileInfo;
      
    } catch (error) {
      const audioError = ErrorHandler.handleTTSError(error, `대사 라인 ${dialogue.sequence}`);
      console.error(`   ❌ ${ErrorHandler.getUserFriendlyMessage(audioError)}`);
      progressTracker.recordFailure(audioError);
      
      if (!audioError.retryable) {
        console.warn(`   ⚠️ 대사 라인 ${dialogue.sequence}: 복구 불가능한 오류로 건너뜀`);
      }
      
      return null;
    }
  }

  /**
   * Load and validate newscast script
   */
  private async loadScript(scriptPath: string): Promise<NewscastScript> {
    console.log('📄 뉴스캐스트 스크립트 로딩 중...');
    const loadStartTime = performance.now();
    
    try {
      const scriptContent = await fs.readFile(scriptPath, 'utf-8');
      const script = JSON.parse(scriptContent) as NewscastScript;
      
      const loadTime = performance.now() - loadStartTime;
      console.log(`   ⏱️ 스크립트 로드: ${loadTime.toFixed(1)}ms`);
      
      return script;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
        throw new AudioGenerationError(
          `스크립트 파일을 찾을 수 없습니다: ${scriptPath}`,
          'SCRIPT_NOT_FOUND',
          false,
          { scriptPath }
        );
      }
      throw ErrorHandler.handleTTSError(error, '스크립트 로딩');
    }
  }

  /**
   * Generate final result object
   */
  private async generateResult(
    script: NewscastScript,
    audioFiles: AudioFileInfo[],
    progressTracker: AudioProgressTracker,
    audioGenerationTime: number,
    outputDirectory: string
  ): Promise<AudioGenerationResult> {
    const stats = progressTracker.getStats();
    
    return {
      title: script.title,
      program_name: script.program_name,
      generation_timestamp: new Date().toISOString(),
      total_dialogue_lines: script.dialogue_lines.length,
      dialogue_lines: stats.totalDialogueLines,
      music_lines: stats.musicLines,
      generated_audio_files: stats.successCount,
      skipped_music_files: stats.skipCount,
      failed_audio_files: stats.failCount,
      audio_files: audioFiles,
      all_segments: script.dialogue_lines.map(line => ({
        ...line,
        has_audio: line.type === 'dialogue' && audioFiles.some(f => f.sequence === line.sequence),
      })),
      metadata: {
        audio_generation_time_ms: audioGenerationTime,
        success_rate: `${stats.totalDialogueLines > 0 ? ((stats.successCount / stats.totalDialogueLines) * 100).toFixed(1) : '0.0'}%`,
        estimated_total_duration: script.metadata.estimated_duration,
      },
    };
  }

  /**
   * Save result metadata to file
   */
  private async saveResultMetadata(result: AudioGenerationResult, audioFolderPath: string): Promise<void> {
    const audioListPath = path.join(audioFolderPath, 'audio-files.json');
    await fs.writeFile(audioListPath, JSON.stringify(result, null, 2), 'utf-8');
  }

  /**
   * Print completion summary
   */
  private printCompletionSummary(
    result: AudioGenerationResult,
    audioFolderPath: string,
    totalTime: number
  ): void {
    console.log(`\\n✅ 뉴스캐스트 오디오 생성 완료!`);
    console.log(`   🎬 프로그램: ${result.program_name}`);
    console.log(`   📊 대화 라인: ${result.dialogue_lines}개, 음악 구간: ${result.music_lines}개`);
    console.log(`   🎤 TTS 생성: ${result.generated_audio_files}개 성공, ${result.failed_audio_files}개 실패`);
    console.log(`   🎵 음악 구간: ${result.skipped_music_files}개 스킵`);
    console.log(`   📈 TTS 성공률: ${result.metadata.success_rate}`);
    console.log(`   ⏱️ 오디오 생성 시간: ${result.metadata.audio_generation_time_ms.toFixed(1)}ms`);
    console.log(`   🕐 전체 소요 시간: ${totalTime.toFixed(1)}ms`);
    console.log(`   📁 저장 위치: ${audioFolderPath}`);

    if (result.failed_audio_files > 0) {
      console.warn(`\\n⚠️ ${result.failed_audio_files}개 대사 라인 생성 실패. Google Cloud TTS API 설정을 확인해주세요.`);
    }
    
    if (result.skipped_music_files > 0) {
      console.log(`\\n💡 ${result.skipped_music_files}개 음악 구간은 별도로 음악 파일을 준비하여 추가해주세요:`);
      result.all_segments
        .filter(line => line.type !== 'dialogue')
        .forEach(line => {
          const fileName = `${line.sequence.toString().padStart(3, '0')}-${line.type}.mp3`;
          console.log(`   🎵 ${fileName}: ${line.text}`);
        });
    }
  }

  /**
   * Get service status
   */
  public getServiceStatus() {
    return this.ttsService.getServiceStatus();
  }

  /**
   * Reset service state
   */
  public reset(): void {
    this.ttsService.reset();
  }
}