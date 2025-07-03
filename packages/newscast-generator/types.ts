// 공통 타입 정의들

export interface GeneratedNews {
  title: string;
  summary: string;
  content: string;
  sources_count: number;
  sources: string[];
  generation_timestamp: string;
  input_articles_count: number;
}

export interface TTSVoices {
  voices: Record<string, {
    name: string;
    gender: string;
    description: string;
    voice_type: string;
  }>;
}

export interface SelectedHosts {
  host1: {
    voice_model: string;
    name: string;
    gender: string;
  };
  host2: {
    voice_model: string;
    name: string;
    gender: string;
  };
}

export interface ScriptLine {
  type: 'dialogue' | 'music';
  role: string;
  name: string;
  content: string;
  voice_model?: string;
}

export interface NewscastScript {
  title: string;
  program_name: string;
  estimated_duration: string;
  script: ScriptLine[];
}

export interface NewscastOutput {
  title: string;
  program_name: string;
  hosts: SelectedHosts;
  estimated_duration: string;
  script: ScriptLine[];
  metadata: {
    total_articles: number;
    sources_count: number;
    main_sources: string[];
    generation_timestamp: string;
    total_script_lines: number;
  };
}

export interface AudioFileInfo {
  file_path: string;
  sequence: number;
  type: string;
  host_id: string;
  duration_seconds: number;
}

export interface AudioOutput {
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