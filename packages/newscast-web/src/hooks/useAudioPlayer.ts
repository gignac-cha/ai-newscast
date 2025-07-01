import { useState, useRef, useCallback } from 'react';
import type { AudioState, AudioActions } from '../types/newscast';

const initialState: AudioState = {
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 1,
  currentTopicIndex: -1,
};

export const useAudioPlayer = () => {
  const [state, setState] = useState<AudioState>(initialState);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const createAudio = useCallback(() => {
    const audio = new Audio();
    
    // 안정된 이벤트 핸들러들 - 의존성 없음
    const handleTimeUpdate = () => {
      setState(prev => ({
        ...prev,
        currentTime: audio.currentTime
      }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration
      }));
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);

    return audio;
  }, []);

  const play = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = createAudio();
    }
    
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
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

  const actions: AudioActions = {
    play,
    pause,
    seekTo,
    setVolume,
    setCurrentTopicIndex,
  };

  return {
    state,
    actions,
  };
};