/**
 * Metadata-related types for AI Newscast project
 */

export interface GenerationMetadata {
  generation_timestamp: string;
  total_articles: number;
  sources_count: number;
  main_sources: string[];
}

export interface NewscastMetadata extends GenerationMetadata {
  total_script_lines: number;
}

export interface ProcessingStats {
  success_count: number;
  failed_count: number;
  total_files: number;
  processing_time?: string;
}

export interface TimestampInfo {
  created_at: string;
  updated_at: string;
  generated_at: string;
}