import { useState, useRef, useEffect, useCallback } from 'react';
import { AudioPlayerState } from '../types/newscast';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    currentTopicIndex: 0,
  });

  const createAudio = useCallback((src: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
      audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioRef.current.removeEventListener('ended', handleEnded);
    }

    const audio = new Audio(src);
    audio.preload = 'metadata';
    audioRef.current = audio;

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return audio;
  }, []);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime
      }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState(prev => ({
        ...prev,
        duration: audioRef.current!.duration
      }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setState(prev => ({
      ...prev,
      isPlaying: false,
      currentTime: 0
    }));
  }, []);

  const play = useCallback((src?: string) => {
    if (src && (!audioRef.current || audioRef.current.src !== src)) {
      createAudio(src);
    }

    if (audioRef.current) {
      audioRef.current.play().then(() => {
        setState(prev => ({ ...prev, isPlaying: true }));
      }).catch(error => {
        console.error('Error playing audio:', error);
      });
    }
  }, [createAudio]);

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setState(prev => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState(prev => ({ ...prev, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      setState(prev => ({ ...prev, volume }));
    }
  }, []);

  const setCurrentTopicIndex = useCallback((index: number) => {
    setState(prev => ({ ...prev, currentTopicIndex: index }));
  }, []);

  // Cleanup on unmount - 의존성 배열 제거하여 무한 루프 방지
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.removeEventListener('timeupdate', handleTimeUpdate);
        audioRef.current.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioRef.current.removeEventListener('ended', handleEnded);
      }
    };
  }, []); // 빈 배열로 변경

  return {
    state,
    actions: {
      play,
      pause,
      seekTo,
      setVolume,
      setCurrentTopicIndex,
    }
  };
}