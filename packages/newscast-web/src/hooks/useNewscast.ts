import { useQuery } from '@tanstack/react-query';
import type { NewscastData } from '../types/newscast';

const LATEST_NEWSCAST_ID_URL = import.meta.env.VITE_LATEST_NEWSCAST_ID_URL ?? 'INVALID_LATEST_NEWSCAST_ID_URL';
const NEWSCAST_STORAGE = import.meta.env.VITE_NEWSCAST_STORAGE ?? 'INVALID_NEWSCAST_STORAGE';

export const useLatestNewscastId = () => {
  return useQuery({
    queryKey: ['latestNewscastId'],
    queryFn: async (): Promise<string> => {
      const response = await fetch(`${LATEST_NEWSCAST_ID_URL}/latest`);
      if (!response.ok) {
        throw new Error('Failed to fetch latest newscast ID');
      }
      const data = await response.json();
      return data['latest-newscast-id']; // API 응답 구조에 맞게 수정
    },
    staleTime: 1000 * 60 * 5, // 5분
    refetchInterval: 1000 * 60 * 10, // 10분마다 자동 갱신
  });
};

export const useNewscastData = (newscastId: string | undefined) => {
  return useQuery({
    queryKey: ['newscastData', newscastId],
    queryFn: async (): Promise<NewscastData> => {
      if (!newscastId) {
        throw new Error('Newscast ID is required');
      }

      // Fetch topic list first
      const topicListResponse = await fetch(`${NEWSCAST_STORAGE}/${newscastId}/topic-list.json`);
      if (!topicListResponse.ok) {
        throw new Error('Failed to fetch topic list');
      }
      const topicList = await topicListResponse.json();

      // Fetch data for each topic
      const topics = await Promise.all(
        topicList.map(async (topic: any, index: number) => {
          const topicNum = String(index + 1).padStart(2, '0');

          // Fetch news data
          const newsResponse = await fetch(`${NEWSCAST_STORAGE}/${newscastId}/topic-${topicNum}/news.json`);
          const newsData = newsResponse.ok ? await newsResponse.json() : null;

          // Fetch newscast script
          const scriptResponse = await fetch(
            `${NEWSCAST_STORAGE}/${newscastId}/topic-${topicNum}/newscast-script.json`
          );
          const scriptData = scriptResponse.ok ? await scriptResponse.json() : null;

          // Fetch audio info for duration
          const audioInfoResponse = await fetch(
            `${NEWSCAST_STORAGE}/${newscastId}/topic-${topicNum}/newscast-audio-info.json`
          );
          const audioInfoData = audioInfoResponse.ok ? await audioInfoResponse.json() : null;

          // Fetch audio files for script timing
          const audioFilesResponse = await fetch(
            `${NEWSCAST_STORAGE}/${newscastId}/topic-${topicNum}/audio/audio-files.json`
          );
          const audioFilesData = audioFilesResponse.ok ? await audioFilesResponse.json() : null;

          return {
            id: topicNum,
            title: topic.title,
            rank: topic.rank,
            newsCount: topic.news_count,
            keywords: topic.keywords,
            news: newsData,
            script: scriptData,
            audioUrl: scriptData ? `${NEWSCAST_STORAGE}/${newscastId}/topic-${topicNum}/newscast.mp3` : null,
            audioInfo: audioInfoData ? {
              final_duration_formatted: audioInfoData.final_duration_formatted,
              final_duration_seconds: audioInfoData.final_duration_seconds,
              file_size_formatted: audioInfoData.file_size_formatted,
            } : null,
            audioFiles: audioFilesData ? {
              audio_files: audioFilesData.audio_files,
              all_segments: audioFilesData.all_segments,
            } : null,
          };
        })
      );

      return {
        id: newscastId,
        title: 'AI 뉴스캐스트',
        generation_timestamp: newscastId,
        topics: topics.filter((topic) => topic.news && topic.script), // Only include topics with both news and script
        metadata: {
          total_topics: topics.length,
          total_articles: topics.reduce((sum, topic) => sum + (topic.news?.input_articles_count ?? 0), 0),
          sources_count: topics.reduce((sum, topic) => sum + (topic.news?.sources_count ?? 0), 0),
        }
      };
    },
    enabled: !!newscastId,
    staleTime: 1000 * 60 * 30, // 30분
  });
};
