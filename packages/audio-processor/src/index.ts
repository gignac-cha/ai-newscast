// Audio Processor Package - FFmpeg-based Audio Merging
export { AudioProcessor } from './audio-processor.js';
export { FFmpegService } from './services/ffmpeg-service.js';
export { 
  ErrorHandler, 
  RetryManager, 
  AudioProcessingError, 
  FFmpegError, 
  FileSystemError, 
  ValidationError 
} from './utils/error-handler.js';

// Export types
export type {
  AudioFileInfo,
  AudioGenerationResult,
  AudioProcessorConfig,
  AudioProcessingResult,
  FFmpegProcessingOptions,
  ProcessingProgress,
  ProgressCallback,
} from './types/index.js';