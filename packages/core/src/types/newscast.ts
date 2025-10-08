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
  generationTimestamp: string;
  topics: NewscastTopic[];
  metadata: {
    totalTopics: number;
    totalArticles: number;
    sourcesCount: number;
  };
}

export interface CurrentScriptInfo {
  currentScript: string | null;
  currentSpeaker: string | null;
  progress: number;
}
