import type { AudioOutput } from '@ai-newscast/core';

export interface AudioGenerationResponse {
  success: boolean;
  newscastID: string;
  topicIndex: number;
  inputFile: string;
  outputFiles?: {
    audioMetadata: string;
    audioFiles: string[];
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
}