import { useSuspenseQuery } from '@tanstack/react-query';
import { fetchLatestNewscastId, fetchNewscastData } from '../utils/api';

export const useLatestNewscastId = () => {
  return useSuspenseQuery({
    queryKey: ['latest-newscast-id'],
    queryFn: async () => {
      console.log('🔄 React Query: Starting to fetch latest newscast ID');
      const result = await fetchLatestNewscastId();
      console.log('✅ React Query: Fetch result:', result);
      return result;
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
    retryDelay: 1000,
  });
}

export const useNewscastData = (newscastId: string) => {
  return useSuspenseQuery({
    queryKey: ['newscast-data', newscastId],
    queryFn: () => fetchNewscastData(newscastId),
    staleTime: 300000, // Consider data stale after 5 minutes
  });
}