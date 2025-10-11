import { useState, useRef, useCallback, useEffect } from 'react';
import type { AudioState } from '../types/newscast';

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
  const [isLoading, setIsLoading] = useState(false);
  const [currentAudioURL, setCurrentAudioURL] = useState<string | null>(null);

  const cleanupAudio = useCallback((audio: HTMLAudioElement) => {
    audio.pause();
    audio.currentTime = 0;
    // src 변경 없이 그냥 pause와 시간 리셋만
  }, []);

  const createAudio = useCallback((url: string) => {
    const audio = new Audio(url);
    
    // 안정된 이벤트 핸들러들 - 의존성 없음
    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setState(prev => ({
        ...prev,
        currentTime: currentTime
      }));
    };

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: audio.duration || 0
      }));
      setIsLoading(false);
    };

    const handleEnded = () => {
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0
      }));
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    const handleCanPlay = () => {
      setIsLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);

    return audio;
  }, []);

  const playWithURL = useCallback(async (url: string) => {
    try {
      // URL이 바뀌었거나 오디오가 없으면 새로 생성
      if (!audioRef.current || currentAudioURL !== url) {
        if (audioRef.current) {
          cleanupAudio(audioRef.current);
        }
        audioRef.current = createAudio(url);
        setCurrentAudioURL(url);
      }

      if (audioRef.current) {
        await audioRef.current.play();
        setState(prev => ({ ...prev, isPlaying: true }));
      }
    } catch (error) {
      console.error('❌ Audio play error:', error);
      setIsLoading(false);
    }
  }, [createAudio, currentAudioURL, cleanupAudio]);

  const play = useCallback(() => {
    if (audioRef.current && !audioRef.current.paused) {
      return; // 이미 재생 중
    }
    if (audioRef.current) {
      audioRef.current.play();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, []);

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

  const stop = useCallback(() => {
    if (audioRef.current) {
      cleanupAudio(audioRef.current);
      audioRef.current = null; // 참조를 null로 설정
      setState(prev => ({
        ...prev,
        isPlaying: false,
        currentTime: 0,
        currentTopicIndex: -1
      }));
      setCurrentAudioURL(null);
      setIsLoading(false);
    }
  }, [cleanupAudio]);

  const actions = {
    play,
    pause,
    seekTo,
    setVolume,
    setCurrentTopicIndex,
    stop,
    playWithURL, // 새로운 함수 추가
  };

  return {
    state,
    actions,
    isLoading, // 로딩 상태도 노출
  };
};