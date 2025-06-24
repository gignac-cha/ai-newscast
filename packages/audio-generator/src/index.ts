// Audio Generator Package - Google Cloud TTS Integration
export { AudioGenerator } from './audio-generator.js';
export { TTSService } from './services/tts-service.js';
export { VoiceMappingService } from './services/voice-mapping.js';
export { AudioProgressTracker } from './monitoring/progress-tracker.js';
export { RateLimiter } from './utils/rate-limiter.js';
export { 
  ErrorHandler, 
  RetryManager, 
  AudioGenerationError, 
  TTSServiceError, 
  VoiceConfigError, 
  RateLimitError, 
  FileSystemError 
} from './utils/error-handler.js';

// Export types
export type {
  VoiceConfig,
  TTSConfig,
  DialogueLine,
  NewscastScript,
  AudioFileInfo,
  AudioGenerationResult,
  AudioGeneratorConfig,
  ChirpHDModel,
} from './types/index.js';

export type {
  ProgressUpdate,
  AudioGenerationStats,
  ProgressCallback,
} from './monitoring/progress-tracker.js';

// Export constants
export { CHIRP_HD_MODELS } from './types/index.js';