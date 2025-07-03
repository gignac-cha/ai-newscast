/**
 * Re-export core types and add generator-specific types
 */

export type {
  GeneratedNews,
  SelectedHosts,
  ScriptLine,
  NewscastScript,
  NewscastOutput,
  AudioFileInfo,
  AudioOutput,
  AudioSegment,
  ProcessingStats
} from '@ai-newscast/core';

// Generator-specific types
export interface TTSVoices {
  voices: Record<string, {
    name: string;
    gender: string;
    description: string;
    voice_type: string;
  }>;
}

// Extended AudioOutput with generator-specific metadata
export interface GeneratorAudioOutput {
  title: string;
  program_name: string;
  generation_timestamp: string;
  total_script_lines: number;
  dialogue_lines: number;
  music_lines: number;
  generated_audio_files: number;
  skipped_music_files: number;
  failed_audio_files: number;
  audio_files: AudioFileInfo[];
  all_segments: Array<{
    sequence: number;
    type: string;
    role: string;
    content: string;
    has_audio: boolean;
  }>;
  metadata: {
    audio_generation_time_ms: number;
    success_rate: string;
    estimated_total_duration: string;
  };
}