/**
 * Re-export core types and add generator-specific types
 */

export type {
  GeneratedNews,
  SelectedHosts,
  ScriptLine,
  NewscastScript,
  NewscastOutput,
  NewscastAudioMetrics,
  AudioFileInfo,
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

// Generator-specific AudioOutput with extended metadata
export interface AudioOutput {
  timestamp: string;
  title: string;
  programName: string;
  totalScriptLines: number;
  dialogueLines: number;
  musicLines: number;
  generatedAudioFiles: number;
  skippedMusicFiles: number;
  failedAudioFiles: number;
  audioFiles: AudioFileInfo[];
  allSegments: AudioSegment[];
  metadata: {
    audioGenerationTimeMs: number;
    successRate: string;
    estimatedTotalDuration: string;
  };
  metrics: NewscastAudioMetrics;
}