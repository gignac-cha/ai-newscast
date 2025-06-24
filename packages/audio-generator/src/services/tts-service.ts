import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import { promises as fs } from 'fs';
import path from 'path';

import { 
  DialogueLine, 
  TTSConfig, 
  AudioGeneratorConfig,
  ChirpHDModel 
} from '../types/index.js';
import { VoiceMappingService } from './voice-mapping.js';
import { RateLimiter } from '../utils/rate-limiter.js';
import { 
  ErrorHandler, 
  RetryManager, 
  TTSServiceError,
  VoiceConfigError 
} from '../utils/error-handler.js';

/**
 * Google Cloud Text-to-Speech service integration
 * Handles audio generation with Chirp HD models
 */
export class TTSService {
  private readonly client: TextToSpeechClient;
  private readonly rateLimiter: RateLimiter;
  private readonly retryManager: RetryManager;
  private readonly config: AudioGeneratorConfig;

  constructor(config: AudioGeneratorConfig) {
    this.config = config;
    this.client = new TextToSpeechClient();
    this.rateLimiter = new RateLimiter(
      config.rateLimit.requestsPerSecond,
      config.rateLimit.burstLimit,
      config.rateLimit.delayBetweenRequests
    );
    this.retryManager = new RetryManager(
      config.retryConfig.maxRetries,
      config.retryConfig.backoffMultiplier,
      config.retryConfig.initialDelay
    );
  }

  /**
   * Generate audio for a single dialogue line
   */
  public async generateAudio(
    dialogue: DialogueLine,
    outputPath: string
  ): Promise<void> {
    // Skip non-dialogue content (music segments)
    if (dialogue.type !== 'dialogue') {
      console.log(`   🎵 음악 구간 스킵: ${dialogue.sequence.toString().padStart(3, '0')}. [${dialogue.type}] ${dialogue.text}`);
      return;
    }

    // Validate voice model
    if (!VoiceMappingService.isValidVoiceModel(dialogue.voice_model)) {
      throw new VoiceConfigError(
        `Invalid voice model: ${dialogue.voice_model}`,
        { availableModels: VoiceMappingService.getAllVoiceModels() }
      );
    }

    const request = {
      input: { text: dialogue.text },
      voice: {
        languageCode: this.config.tts.languageCode,
        name: dialogue.voice_model,
      },
      audioConfig: {
        audioEncoding: this.config.tts.audioEncoding as any,
        speakingRate: this.config.tts.speakingRate,
        pitch: this.config.tts.pitch,
        volumeGainDb: this.config.tts.volumeGainDb,
      },
    };

    await this.rateLimiter.waitForClearance();

    const result = await this.retryManager.executeWithRetry(
      async () => {
        try {
          console.log(`   🎤 음성 생성 중: ${dialogue.sequence.toString().padStart(3, '0')}. [${dialogue.speaker}]`);
          
          const [response] = await this.client.synthesizeSpeech(request);
          
          if (!response.audioContent) {
            throw new TTSServiceError('TTS 응답에서 오디오 콘텐츠를 찾을 수 없습니다.');
          }

          // Ensure output directory exists
          await fs.mkdir(path.dirname(outputPath), { recursive: true });
          
          // Write audio file
          await fs.writeFile(outputPath, response.audioContent);
          
          console.log(`   ✅ 저장 완료: ${path.basename(outputPath)}`);
          
          return response.audioContent;
        } catch (error) {
          throw ErrorHandler.handleTTSError(error, `Dialogue ${dialogue.sequence}`);
        }
      },
      `TTS Audio Generation [${dialogue.sequence}]`
    );
  }

  /**
   * Generate filename for dialogue audio
   */
  public generateAudioFilename(dialogue: DialogueLine): string {
    const pattern = this.config.outputConfig.fileNamePattern;
    
    let filename: string;
    
    if (dialogue.type === 'dialogue') {
      const hostName = VoiceMappingService.getDisplayName(dialogue.speaker);
      filename = pattern
        .replace('{sequence}', dialogue.sequence.toString().padStart(3, '0'))
        .replace('{type}', dialogue.type)
        .replace('{speaker}', hostName);
    } else {
      // Music segments
      filename = pattern
        .replace('{sequence}', dialogue.sequence.toString().padStart(3, '0'))
        .replace('{type}', dialogue.type)
        .replace('{speaker}', '');
    }

    return filename.replace(/\-+/g, '-').replace(/\-\./g, '.');
  }

  /**
   * Validate Google Cloud credentials
   */
  public async validateCredentials(): Promise<boolean> {
    try {
      // Test with a minimal request
      const testRequest = {
        input: { text: '테스트' },
        voice: {
          languageCode: 'ko-KR',
          name: 'ko-KR-Chirp3-HD-Charon',
        },
        audioConfig: {
          audioEncoding: 'MP3' as any,
        },
      };

      await this.client.synthesizeSpeech(testRequest);
      return true;
    } catch (error) {
      console.warn('⚠️ Google Cloud TTS 인증 테스트 실패:', ErrorHandler.handleTTSError(error).message);
      return false;
    }
  }

  /**
   * Get service status and rate limit information
   */
  public getServiceStatus(): {
    rateLimitStatus: ReturnType<RateLimiter['getStatus']>;
    availableVoices: number;
    serviceReady: boolean;
  } {
    return {
      rateLimitStatus: this.rateLimiter.getStatus(),
      availableVoices: VoiceMappingService.getAllVoiceModels().length,
      serviceReady: true, // Could add more checks here
    };
  }

  /**
   * Reset service state (useful for testing)
   */
  public reset(): void {
    this.rateLimiter.reset();
  }
}