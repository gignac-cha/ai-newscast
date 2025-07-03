import { useState, useRef, useEffect, useCallback } from 'react';

interface UseAudioControllerProps {
  audioUrl?: string;
  topicId?: string;
}

export const useAudioController = ({ audioUrl, topicId }: UseAudioControllerProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Reset state when topic changes
  useEffect(() => {
    // Stop and cleanup previous audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current = null;
    }
    
    setIsPlaying(false);
    setIsLoading(false);
    setCurrentTime(0);
    setDuration(0);
  }, [topicId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!audioUrl) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(audioUrl);
        
        // 안정된 이벤트 핸들러들 - 의존성 없음
        const handleEnded = () => {
          setIsPlaying(false);
          setCurrentTime(0);
        };
        
        const handleLoadStart = () => setIsLoading(true);
        const handleCanPlay = () => setIsLoading(false);
        
        const handleLoadedMetadata = () => {
          setDuration(audioRef.current?.duration ?? 0);
        };
        
        const handleTimeUpdate = () => {
          setCurrentTime(audioRef.current?.currentTime ?? 0);
        };
        
        audioRef.current.addEventListener('ended', handleEnded);
        audioRef.current.addEventListener('loadstart', handleLoadStart);
        audioRef.current.addEventListener('canplay', handleCanPlay);
        audioRef.current.addEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.addEventListener('timeupdate', handleTimeUpdate);
      }

      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setIsLoading(true);
        await audioRef.current.play();
        setIsPlaying(true);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Audio playback error:', error);
      setIsLoading(false);
    }
  }, [audioUrl, isPlaying]);

  const handleSeek = useCallback((value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  }, [duration]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  return {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    handlePlayPause,
    handleSeek,
    stop
  };
};