import { z } from 'zod';

// Voice and audio configuration types
export const VoiceConfigSchema = z.object({
  name: z.string(),
  gender: z.enum(['male', 'female']),
  description: z.string(),
  role: z.string(),
  voice_type: z.string(),
});

export const TTSConfigSchema = z.object({
  languageCode: z.string().default('ko-KR'),
  speakingRate: z.number().min(0.25).max(4.0).default(1.0),
  pitch: z.number().min(-20.0).max(20.0).default(0.0),
  volumeGainDb: z.number().min(-96.0).max(16.0).default(0.0),
  audioEncoding: z.enum(['MP3', 'LINEAR16', 'OGG_OPUS', 'MULAW', 'ALAW']).default('MP3'),
});

export const DialogueLineSchema = z.object({
  speaker: z.string(),
  voice_model: z.string(),
  text: z.string(),
  sequence: z.number(),
  type: z.enum(['dialogue', 'opening_music', 'closing_music', 'background_music']),
});

export const NewscastScriptSchema = z.object({
  title: z.string(),
  program_name: z.string(),
  hosts: z.object({
    host1: z.object({
      name: z.string(),
      voice_model: z.string(),
      gender: z.string(),
    }),
    host2: z.object({
      name: z.string(),
      voice_model: z.string(),
      gender: z.string(),
    }),
  }),
  opening: z.string(),
  main_content: z.string(),
  closing: z.string(),
  dialogue_lines: z.array(DialogueLineSchema),
  metadata: z.object({
    total_articles: z.number(),
    sources_count: z.number(),
    main_sources: z.array(z.string()),
    generation_timestamp: z.string(),
    estimated_duration: z.string(),
    total_dialogue_lines: z.number(),
  }),
});

export const AudioFileInfoSchema = z.object({
  file_path: z.string(),
  sequence: z.number(),
  type: z.string(),
  speaker: z.string(),
});

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
  all_segments: z.array(
    DialogueLineSchema.extend({
      has_audio: z.boolean(),
    })
  ),
  metadata: z.object({
    audio_generation_time_ms: z.number(),
    success_rate: z.string(),
    estimated_total_duration: z.string(),
  }),
});

export const AudioGeneratorConfigSchema = z.object({
  apiKeyPath: z.string().optional(),
  rateLimit: z.object({
    requestsPerSecond: z.number().default(10),
    burstLimit: z.number().default(20),
    delayBetweenRequests: z.number().default(100),
  }).default({}),
  retryConfig: z.object({
    maxRetries: z.number().default(3),
    backoffMultiplier: z.number().default(2),
    initialDelay: z.number().default(1000),
  }).default({}),
  outputConfig: z.object({
    audioFolder: z.string().default('audio'),
    fileNamePattern: z.string().default('{sequence}-{type}-{speaker}.mp3'),
    preserveOriginalFilenames: z.boolean().default(false),
  }).default({}),
  tts: TTSConfigSchema.default({}),
}).default({});

// Export TypeScript types
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type TTSConfig = z.infer<typeof TTSConfigSchema>;
export type DialogueLine = z.infer<typeof DialogueLineSchema>;
export type NewscastScript = z.infer<typeof NewscastScriptSchema>;
export type AudioFileInfo = z.infer<typeof AudioFileInfoSchema>;
export type AudioGenerationResult = z.infer<typeof AudioGenerationResultSchema>;
export type AudioGeneratorConfig = z.infer<typeof AudioGeneratorConfigSchema>;

// Voice model constants - 8 Chirp HD models
export const CHIRP_HD_MODELS = [
  'ko-KR-Chirp3-HD-Aoede',
  'ko-KR-Chirp3-HD-Charon',
  'ko-KR-Chirp3-HD-Fenrir',
  'ko-KR-Chirp3-HD-Kore',
  'ko-KR-Chirp3-HD-Leda',
  'ko-KR-Chirp3-HD-Orus',
  'ko-KR-Chirp3-HD-Puck',
  'ko-KR-Chirp3-HD-Zephyr',
] as const;

export type ChirpHDModel = typeof CHIRP_HD_MODELS[number];