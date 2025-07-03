export interface NewscastTopic {
  id: string;
  title: string;
  rank: number;
  newsCount: number;
  keywords: string[];
  news?: {
    title: string;
    summary: string;
    content: string;
    sources_count: number;
    sources: string[];
    generation_timestamp: string;
    input_articles_count: number;
  };
  script?: {
    title: string;
    program_name: string;
    hosts: {
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
    };
    estimated_duration: string;
    script: Array<{
      type: string;
      role: string;
      name: string;
      content: string;
      voice_model?: string;
    }>;
    metadata: {
      total_articles: number;
      sources_count: number;
      main_sources: string[];
      generation_timestamp: string;
      total_script_lines: number;
    };
  };
  audioUrl?: string;
}

export interface NewscastData {
  id: string;
  title: string;
  timestamp: string;
  topics: NewscastTopic[];
}

export interface AudioState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTopicIndex: number;
}

export interface AudioActions {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
  setCurrentTopicIndex: (index: number) => void;
}