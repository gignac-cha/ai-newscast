/**
 * Main newscast types combining all other types
 */

import { GeneratedNews, TopicInfo } from './news';
import { NewscastOutput } from './voice';
import { AudioInfo, AudioFiles } from './audio';

export interface NewscastTopic extends TopicInfo {
  news?: GeneratedNews;
  script?: NewscastOutput;
  audioUrl?: string;
  audioInfo?: AudioInfo;
  audioFiles?: AudioFiles;
}

export interface NewscastData {
  id: string;
  title: string;
  generation_timestamp: string;
  topics: NewscastTopic[];
  metadata: {
    total_topics: number;
    total_articles: number;
    sources_count: number;
  };
}

export interface CurrentScriptInfo {
  currentScript: string | null;
  currentSpeaker: string | null;
  progress: number;
}