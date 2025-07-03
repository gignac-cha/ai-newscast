/**
 * Re-export core types and add web-specific types
 */

import type {
  NewscastTopic as CoreNewscastTopic,
  NewscastData as CoreNewscastData,
  AudioState,
  CurrentScriptInfo,
  GeneratedNews,
  NewscastOutput,
  AudioInfo,
  AudioFiles,
  AudioFileInfo,
  ScriptLine,
  SelectedHosts
} from '@ai-newscast/core';

// Re-export core types
export type {
  AudioState,
  CurrentScriptInfo,
  GeneratedNews,
  NewscastOutput,
  AudioInfo,
  AudioFiles,
  AudioFileInfo,
  ScriptLine,
  SelectedHosts
} from '@ai-newscast/core';

// Use core types with web-specific naming
export type NewscastTopic = CoreNewscastTopic;
export type NewscastData = CoreNewscastData;

// Web-specific types that are not in core
export interface AudioActions {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setVolume: (volume: number) => void;
  stop: () => void;
  setCurrentTopicIndex: (index: number) => void;
  playWithUrl: (url: string) => Promise<void>;
}

// Backwards compatibility - transform NewscastData for web usage
export interface NewscastDataForWeb {
  id: string;
  title: string;
  timestamp: string; // Note: this differs from core's generation_timestamp
  topics: NewscastTopic[];
}