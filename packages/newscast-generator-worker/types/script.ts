import type { NewscastOutput } from '@ai-newscast/core';

export interface ScriptGenerationStats {
  startedAt: string;
  completedAt: string;
  elapsedMs: number;
  scriptLines: number;
  hosts: {
    host1: string;
    host2: string;
  };
}

export interface ScriptGenerationResponse {
  success: true;
  newscastID: string;
  topicIndex: number;
  inputFile: string;
  outputFiles?: {
    json: string;
    markdown: string;
  };
  stats: ScriptGenerationStats;
  timestamp: string;
  message: string;
  script: NewscastOutput;
}
