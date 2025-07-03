/**
 * Audio-related types for AI Newscast project
 */

export interface AudioFileInfo {
  file_path: string;
  sequence: number;
  type: string;
  host_id: string;
  duration_seconds: number;
}

export interface AudioInfo {
  final_duration_formatted: string;
  final_duration_seconds: number;
  file_size_formatted: string;
}

export interface AudioOutput {
  output_file: string;
  total_files: number;
  success_count: number;
  failed_count: number;
  audio_files: AudioFileInfo[];
  generation_timestamp: string;
}

export interface AudioSegment {
  sequence: number;
  type: string;
  role: string;
  content: string;
  has_audio: boolean;
}

export interface AudioFiles {
  audio_files: AudioFileInfo[];
  all_segments: AudioSegment[];
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTopicIndex: number;
}