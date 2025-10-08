/**
 * Audio-related types for AI Newscast project
 */

export interface AudioFileInfo {
  filePath: string;
  sequence: number;
  type: string;
  hostID: string;
  durationSeconds: number;
}

export interface AudioInfo {
  finalDurationFormatted: string;
  finalDurationSeconds: number;
  fileSizeFormatted: string;
}

export interface AudioFilesMetrics {
  newscastID: string;
  topicIndex: number;
  timing: {
    startedAt: string;
    completedAt: string;
    duration: number;
  };
  processing: {
    totalLines: number;
    generatedFiles: number;
    skippedFiles: number;
    failedFiles: number;
    successRate: number;
  };
  fileSizes: {
    totalBytes: number;
    averageBytes: number;
    maximumBytes: number;
    minimumBytes: number;
  };
  performance: {
    filesPerSecond: number;
    estimatedDuration: string;
  };
}

export interface AudioOutput {
  outputFile: string;
  totalFiles: number;
  successCount: number;
  failedCount: number;
  audioFiles: AudioFileInfo[];
  generationTimestamp: string;
  metrics?: AudioFilesMetrics;
}

export interface AudioSegment {
  sequence: number;
  type: string;
  role: string;
  content: string;
  hasAudio: boolean;
}

export interface AudioFiles {
  audioFiles: AudioFileInfo[];
  allSegments: AudioSegment[];
  metrics?: AudioFilesMetrics;
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTopicIndex: number;
}
