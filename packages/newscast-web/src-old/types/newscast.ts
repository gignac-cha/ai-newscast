export interface NewscastTopic {
  id: string;
  title: string;
  audioFile: string;
  newsContent: {
    title: string;
    content: string;
    summary: string;
    sources: Array<{
      title: string;
      url: string;
      publishedAt: string;
    }>;
  };
  script: {
    segments: Array<{
      speaker: 'host1' | 'host2';
      text: string;
      sequence: number;
    }>;
  };
}

export interface NewscastData {
  id: string;
  topics: NewscastTopic[];
  metadata: {
    generatedAt: string;
    totalTopics: number;
    totalDuration?: number;
  };
}

export interface LatestNewscastResponse {
  'latest-newscast-id'?: string;
  timestamp: string;
  found: boolean;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  currentTopicIndex: number;
}