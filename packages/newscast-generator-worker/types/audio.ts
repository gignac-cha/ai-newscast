import type { AudioOutput } from '@ai-newscast/core';

export interface AudioGenerationResponse {
  success: boolean;
  newscast_id: string;
  topic_index: number;
  input_file: string;
  output_files: {
    audio_metadata: string;
    audio_files: string[];
  };
  stats: {
    startedAt: string;
    completedAt: string;
    elapsedMs: number;
    dialogueCount: number;
    musicCount: number;
    successCount: number;
    failCount: number;
    skipCount: number;
    successRate: string;
  };
  timestamp: string;
  message: string;
  audio_output: AudioOutput;
}