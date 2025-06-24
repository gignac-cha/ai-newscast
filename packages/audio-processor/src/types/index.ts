import { z } from 'zod';

// Audio file information from audio-generator
export const AudioFileInfoSchema = z.object({
  file_path: z.string(),
  sequence: z.number(),
  type: z.string(),
  speaker: z.string(),
});

// Audio generation result from audio-generator
export const AudioGenerationResultSchema = z.object({
  title: z.string(),
  program_name: z.string(),
  generation_timestamp: z.string(),
  total_dialogue_lines: z.number(),
  dialogue_lines: z.number(),
  music_lines: z.number(),
  generated_audio_files: z.number(),
  skipped_music_files: z.number(),
  failed_audio_files: z.number(),
  audio_files: z.array(AudioFileInfoSchema),
  all_segments: z.array(z.object({
    speaker: z.string(),
    voice_model: z.string(),
    text: z.string(),
    sequence: z.number(),
    type: z.enum(['dialogue', 'opening_music', 'closing_music', 'background_music']),
    has_audio: z.boolean(),
  })),
  metadata: z.object({
    audio_generation_time_ms: z.number(),
    success_rate: z.string(),
    estimated_total_duration: z.string(),
  }),
});

// Audio processing configuration
export const AudioProcessorConfigSchema = z.object({
  output: z.object({
    format: z.enum(['mp3', 'wav', 'ogg']).default('mp3'),
    bitrate: z.string().default('32k'),
    sampleRate: z.number().default(24000),
    channels: z.enum(['mono', 'stereo']).default('mono'),
    fileNamePattern: z.string().default('newscast-{timestamp}.mp3'),
  }).default({}),
  processing: z.object({
    silenceDuration: z.number().default(0.5), // seconds
    addIntroSilence: z.boolean().default(true),
    addOutroSilence: z.boolean().default(true),
    normalizeLevels: z.boolean().default(true),
    fadeIn: z.number().default(0.1), // seconds
    fadeOut: z.number().default(0.2), // seconds
  }).default({}),
  ffmpeg: z.object({
    path: z.string().optional(),
    timeout: z.number().default(300000), // 5 minutes
    overwrite: z.boolean().default(true),
  }).default({}),
}).default({});

// Final audio processing result
export const AudioProcessingResultSchema = z.object({
  title: z.string(),
  program_name: z.string(),
  merge_timestamp: z.string(),
  input_files: z.number(),
  output_file: z.string(),
  final_duration_seconds: z.number(),
  final_duration_formatted: z.string(),
  file_size_bytes: z.number(),
  file_size_formatted: z.string(),
  processing_time_ms: z.number(),
  quality_metrics: z.object({
    peak_level_db: z.number().optional(),
    average_level_db: z.number().optional(),
    dynamic_range: z.number().optional(),
  }).optional(),
  original_metadata: z.object({
    audio_generation_time_ms: z.number(),
    success_rate: z.string(),
    estimated_total_duration: z.string(),
  }),
});

// Export TypeScript types
export type AudioFileInfo = z.infer<typeof AudioFileInfoSchema>;
export type AudioGenerationResult = z.infer<typeof AudioGenerationResultSchema>;
export type AudioProcessorConfig = z.infer<typeof AudioProcessorConfigSchema>;
export type AudioProcessingResult = z.infer<typeof AudioProcessingResultSchema>;

// FFmpeg processing options
export interface FFmpegProcessingOptions {
  inputFiles: string[];
  outputPath: string;
  silenceDuration: number;
  format: string;
  bitrate: string;
  sampleRate: number;
  channels: string;
  fadeIn?: number;
  fadeOut?: number;
  normalizeLevels?: boolean;
}

// Progress callback for long operations
export interface ProcessingProgress {
  stage: 'validation' | 'silence_generation' | 'merging' | 'optimization' | 'metadata';
  percentage: number;
  message: string;
  currentFile?: string;
  totalFiles?: number;
}

export type ProgressCallback = (progress: ProcessingProgress) => void;