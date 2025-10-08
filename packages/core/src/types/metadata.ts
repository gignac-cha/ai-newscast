/**
 * Metadata-related types for AI Newscast project
 */

export interface GenerationMetadata {
  generationTimestamp: string;
  totalArticles: number;
  sourcesCount: number;
  mainSources: string[];
}

export interface NewscastMetadata extends GenerationMetadata {
  totalScriptLines: number;
}

export interface ProcessingStats {
  successCount: number;
  failedCount: number;
  totalFiles: number;
  processingTime?: string;
}

export interface TimestampInfo {
  createdAt: string;
  updatedAt: string;
  generatedAt: string;
}
