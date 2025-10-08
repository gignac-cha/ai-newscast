/**
 * Voice and host-related types for AI Newscast project
 */

import type { NewscastMetadata } from './metadata';

export interface VoiceHost {
  voiceModel: string;
  name: string;
  gender: string;
}

export interface SelectedHosts {
  host1: VoiceHost;
  host2: VoiceHost;
}

export interface ScriptLine {
  type: string;
  role: string;
  name: string;
  content: string;
  voiceModel?: string;
}

export interface NewscastScriptMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    aiGenerationTime: number;
  };
  input: {
    newsTitle: string;
    newsSummaryLength: number;
    newsContentLength: number;
  };
  output: {
    totalScriptLines: number;
    dialogueLines: number;
    musicLines: number;
    scriptSize: number;
  };
  performance: {
    linesPerSecond: number;
  };
}

export interface AudioFileMetrics {
  sequence: number;
  fileName: string;
  status: 'success' | 'failed' | 'skipped';
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
  };
  fileSize: number;
  durationSeconds: number;
}

export interface NewscastAudioMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    ttsGenerationTime: number;
  };
  input: {
    totalScriptLines: number;
    dialogueLines: number;
    musicLines: number;
  };
  output: {
    generatedAudioFiles: number;
    skippedMusicFiles: number;
    failedAudioFiles: number;
    totalAudioSize: number;
  };
  performance: {
    filesPerSecond: number;
    successRate: string;
  };
  items: AudioFileMetrics[];
}

export interface NewscastMergeMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
    downloadTime: number;
    mergeTime: number;
  };
  input: {
    totalAudioFiles: number;
    downloadedFiles: number;
    failedDownloads: number;
    totalInputSize: number;
  };
  output: {
    mergedFileName: string;
    mergedFileSize: number;
    estimatedDuration: number;
  };
  performance: {
    filesPerSecond: number;
    downloadSpeed: number;
    successRate: string;
  };
}

export interface NewscastScript {
  title: string;
  programName: string;
  estimatedDuration: string;
  script: ScriptLine[];
  metrics?: NewscastScriptMetrics;
}

export interface NewscastOutput extends NewscastScript {
  timestamp: string;
  hosts: SelectedHosts;
  metadata: NewscastMetadata;
  metrics: NewscastScriptMetrics;
}
