import { useQuery } from '@tanstack/react-query';
import type { NewscastData } from '../types/newscast';

const LATEST_NEWSCAST_ID_URL = import.meta.env.VITE_LATEST_NEWSCAST_ID_URL ?? 'INVALID_LATEST_NEWSCAST_ID_URL';
const NEWSCAST_STORAGE = import.meta.env.VITE_NEWSCAST_STORAGE ?? 'INVALID_NEWSCAST_STORAGE';

export const useLatestNewscastID = () => {
  return useQuery({
    queryKey: ['latestNewscastID'],
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

export const useNewscastData = (newscastID: string | undefined) => {
  return useQuery({
    queryKey: ['newscastData', newscastID],
    queryFn: async (): Promise<NewscastData> => {
      if (!newscastID) {
        throw new Error('Newscast ID is required');
      }

      // Fetch topics.json from {newscastID}/topics.json
      const topicsResponse = await fetch(`${NEWSCAST_STORAGE}/${newscastID}/topics.json`);
      if (!topicsResponse.ok) {
        throw new Error('Failed to fetch topics');
      }
      const topicsData = await topicsResponse.json();
      const topicList = topicsData.topics ?? [];

      // Fetch data for each topic
      const topics = await Promise.all(
        topicList.map(async (topic: any, index: number) => {
          const topicNum = String(index + 1).padStart(2, '0');

          // Fetch news data
          const newsResponse = await fetch(`${NEWSCAST_STORAGE}/${newscastID}/topic-${topicNum}/news.json`);
          const newsData = newsResponse.ok ? await newsResponse.json() : null;

          // Fetch newscast script
          const scriptResponse = await fetch(
            `${NEWSCAST_STORAGE}/${newscastID}/topic-${topicNum}/newscast-script.json`
          );
          const scriptData = scriptResponse.ok ? await scriptResponse.json() : null;

          // Fetch audio info for duration (no longer exists, will be removed)
          // const audioInfoResponse = await fetch(
          //   `${NEWSCAST_STORAGE}/${newscastID}/topic-${topicNum}/newscast-audio-info.json`
          // );
          // const audioInfoData = audioInfoResponse.ok ? await audioInfoResponse.json() : null;

          // Fetch audio files for script timing
          const audioFilesResponse = await fetch(
            `${NEWSCAST_STORAGE}/${newscastID}/topic-${topicNum}/audio/audio-files.json`
          );
          const audioFilesData = audioFilesResponse.ok ? await audioFilesResponse.json() : null;

          return {
            id: topicNum,
            title: topic.title,
            rank: topic.rank,
            newsCount: topic.news_count ?? topic.newsCount ?? 0,
            keywords: topic.keywords ?? [],
            news: newsData,
            script: scriptData,
            audioURL: scriptData ? `${NEWSCAST_STORAGE}/${newscastID}/topic-${topicNum}/newscast.mp3` : null,
            audioInfo: null, // No longer exists in backend
            audioFiles: audioFilesData ? {
              audioFiles: audioFilesData.audioFiles ?? audioFilesData.audio_files ?? [],
              allSegments: audioFilesData.allSegments ?? audioFilesData.all_segments ?? [],
            } : null,
          };
        })
      );

      return {
        id: newscastID,
        title: 'AI 뉴스캐스트',
        generationTimestamp: newscastID,
        topics: topics.filter((topic) => topic.news && topic.script), // Only include topics with both news and script
        metadata: {
          totalTopics: topics.length,
          totalArticles: topics.reduce((sum, topic) => sum + (topic.news?.inputArticlesCount ?? 0), 0),
          sourcesCount: topics.reduce((sum, topic) => sum + (topic.news?.sourcesCount ?? 0), 0),
        }
      };
    },
    enabled: !!newscastID,
    staleTime: 1000 * 60 * 30, // 30분
  });
};
