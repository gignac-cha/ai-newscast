import { LatestNewscastResponse, NewscastData, NewscastTopic } from '../types/newscast';

const WORKER_API_URL = import.meta.env.VITE_WORKER_API_URL;
const LOCAL_OUTPUT_BASE = import.meta.env.VITE_NEWSCAST_STORAGE;

if (!WORKER_API_URL) {
  throw new Error('VITE_WORKER_API_URL environment variable is required');
}

if (!LOCAL_OUTPUT_BASE) {
  throw new Error('VITE_NEWSCAST_STORAGE environment variable is required');
}

console.log('🔧 API Configuration:', {
  workerApiUrl: WORKER_API_URL,
  outputBase: LOCAL_OUTPUT_BASE,
  env: import.meta.env.MODE
});

export const fetchLatestNewscastId = async (): Promise<string | undefined> => {
  console.log('🚀 Fetching latest newscast ID from:', `${WORKER_API_URL}/latest`);
  
  try {
    const response = await fetch(`${WORKER_API_URL}/latest`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      mode: 'cors'
    });
    
    console.log('📡 Response status:', response.status);
    console.log('📡 Response headers:', response.headers);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch latest newscast ID: ${response.status} ${response.statusText}`);
    }
    
    const data: LatestNewscastResponse = await response.json();
    console.log('📄 API Response data:', data);
    
    return data['latest-newscast-id'];
  } catch (error) {
    console.error('❌ Error fetching latest newscast ID:', error);
    return undefined;
  }
}

export const fetchNewscastData = async (newscastId: string): Promise<NewscastData | undefined> => {
  try {
    // First, fetch the topic list
    const topicListResponse = await fetch(`${LOCAL_OUTPUT_BASE}/${newscastId}/topic-list.json`);
    if (!topicListResponse.ok) {
      throw new Error(`Failed to fetch topic list: ${topicListResponse.status}`);
    }
    
    const topicList = await topicListResponse.json();
    const topics: NewscastTopic[] = [];
    
    // Fetch data for each topic
    for (let i = 1; i <= topicList.length; i++) {
      const topicPrefix = `topic-${i.toString().padStart(2, '0')}`;
      
      try {
        // Fetch news content
        const newsResponse = await fetch(`${LOCAL_OUTPUT_BASE}/${newscastId}/${topicPrefix}/news.json`);
        const newsContent = newsResponse.ok ? await newsResponse.json() : undefined;
        
        // Fetch newscast script
        const scriptResponse = await fetch(`${LOCAL_OUTPUT_BASE}/${newscastId}/${topicPrefix}/newscast-script.json`);
        const script = scriptResponse.ok ? await scriptResponse.json() : undefined;
        
        if (newsContent && script) {
          topics.push({
            id: topicPrefix,
            title: newsContent.title ?? `Topic ${i}`,
            audioFile: `${LOCAL_OUTPUT_BASE}/${newscastId}/${topicPrefix}/newscast.mp3`,
            newsContent: {
              title: newsContent.title,
              content: newsContent.content,
              summary: newsContent.summary,
              sources: newsContent.sources ?? []
            },
            script: {
              segments: script.segments ?? []
            }
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch data for ${topicPrefix}:`, error);
      }
    }
    
    return {
      id: newscastId,
      topics,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalTopics: topics.length
      }
    };
  } catch (error) {
    console.error('Error fetching newscast data:', error);
    return undefined;
  }
}

export const fetchAudioDuration = async (audioUrl: string): Promise<number> => {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      reject(new Error('Failed to load audio'));
    });
    audio.src = audioUrl;
  });
}