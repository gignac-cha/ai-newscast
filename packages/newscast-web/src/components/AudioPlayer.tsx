import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Text, Button, Slider, Badge } from '@radix-ui/themes';
import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import type { NewscastTopic } from '../types/newscast';

interface AudioPlayerProps {
  currentTopic?: NewscastTopic;
  onTopicChange: (index: number) => void;
  isCompact?: boolean;
}

export interface AudioPlayerRef {
  stop: () => void;
}

// Format time in MM:SS format
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ 
  currentTopic,
  onTopicChange,
  isCompact = false
}, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [shouldScroll, setShouldScroll] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    setShouldScroll(false);
  }, [currentTopic?.id]);

  // Check if text should scroll when title changes or component mounts
  useEffect(() => {
    if (textRef.current && containerRef.current && currentTopic?.title) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setShouldScroll(textWidth > containerWidth);
    }
  }, [currentTopic?.title, isCompact]);

  // Stop audio when external stop is called
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  // Expose stop function to parent via ref
  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  useImperativeHandle(ref, () => ({
    stop: stopAudio
  }), [stopAudio]);

  const handlePlayPause = async () => {
    if (!currentTopic?.audioUrl) return;

    try {
      if (!audioRef.current) {
        audioRef.current = new Audio(currentTopic.audioUrl);
        
        audioRef.current.addEventListener('ended', () => {
          setIsPlaying(false);
          setCurrentTime(0);
        });
        
        audioRef.current.addEventListener('loadstart', () => setIsLoading(true));
        audioRef.current.addEventListener('canplay', () => setIsLoading(false));
        
        audioRef.current.addEventListener('loadedmetadata', () => {
          setDuration(audioRef.current?.duration || 0);
        });
        
        audioRef.current.addEventListener('timeupdate', () => {
          setCurrentTime(audioRef.current?.currentTime || 0);
        });
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
  };

  const handleSeek = (value: number[]) => {
    if (audioRef.current && duration > 0) {
      const newTime = (value[0] / 100) * duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  if (!currentTopic) {
    return (
      <Box p="4">
        <Flex align="center" justify="center">
          <Text size="2" color="gray">
            No topic selected
          </Text>
        </Flex>
      </Box>
    );
  }

  if (isCompact) {
    const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
    
    return (
      <Box style={{ flex: 1 }}>
        <Flex gap="2" css={css`
          @media (min-width: 768px) {
            gap: 12px;
          }
        `}>
          <Button 
            size="3" 
            variant="soft" 
            onClick={handlePlayPause}
            disabled={!currentTopic.audioUrl || isLoading}
            css={css`
              min-width: 48px;
              min-height: 48px;
              align-self: center;
              @media (min-width: 768px) {
                min-width: 56px;
                min-height: 56px;
              }
            `}
          >
            {isLoading ? '⏳' : isPlaying ? <PauseIcon /> : <PlayIcon />}
          </Button>
          
          <Flex direction="column" gap="3" style={{ 
            flex: 1, 
            minWidth: 0,
            overflow: 'hidden'
          }}>
            {/* 1행: 제목 */}
            <Box 
              ref={containerRef}
              css={css`
                padding: 0 8px;
                overflow: hidden;
                position: relative;
                min-height: 20px;
                display: flex;
                align-items: center;
                
                @media (min-width: 768px) {
                  min-height: 24px;
                }
              `}
            >
              <Text 
                ref={textRef}
                size="1" 
                weight="medium" 
                as="span"
                css={css`
                  display: inline-block;
                  white-space: nowrap;
                  line-height: 1.2;
                  
                  ${shouldScroll ? css`
                    animation: marquee 12s linear infinite;
                    animation-play-state: ${isPlaying ? 'running' : 'paused'};
                    ${!isPlaying && css`
                      max-width: 100%;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    `}
                  ` : css`
                    max-width: 100%;
                    overflow: hidden;
                    text-overflow: ellipsis;
                  `}
                  
                  @keyframes marquee {
                    0% { 
                      transform: translateX(0%); 
                    }
                    25% {
                      transform: translateX(0%);
                    }
                    75% { 
                      transform: translateX(calc(-100% + 100px)); 
                    }
                    100% { 
                      transform: translateX(calc(-100% + 100px)); 
                    }
                  }
                  
                  @media (min-width: 768px) {
                    font-size: var(--font-size-2);
                    
                    @keyframes marquee {
                      0% { 
                        transform: translateX(0%); 
                      }
                      25% {
                        transform: translateX(0%);
                      }
                      75% { 
                        transform: translateX(calc(-100% + 120px)); 
                      }
                      100% { 
                        transform: translateX(calc(-100% + 120px)); 
                      }
                    }
                  }
                `}
              >
                {currentTopic.title}
              </Text>
            </Box>
            
            {/* 2행: 재생 바 */}
            <Box css={css`
              padding: 0 8px;
            `}>
              <Slider
                value={[progressPercent]}
                onValueChange={handleSeek}
                max={100}
                step={0.1}
                size="2"
                css={css`
                  width: 100%;
                  
                  /* 슬라이더 트랙 스타일링 */
                  & [data-radix-slider-track] {
                    background-color: var(--gray-6);
                    height: 4px;
                  }
                  
                  /* 슬라이더 범위 (진행된 부분) 스타일링 */
                  & [data-radix-slider-range] {
                    background-color: var(--accent-9);
                    height: 4px;
                  }
                  
                  /* 슬라이더 핸들 (동그란 버튼) 스타일링 */
                  & [data-radix-slider-thumb] {
                    width: 14px;
                    height: 14px;
                    background-color: var(--accent-9);
                    border: 2px solid var(--gray-1);
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
                    
                    &:hover {
                      transform: scale(1.1);
                    }
                    
                    &:focus {
                      outline: none;
                      box-shadow: 0 0 0 2px var(--accent-a8);
                    }
                  }
                `}
              />
            </Box>
            
            {/* 3행: 재생 시간 */}
            <Flex align="center" justify="between" css={css`
              padding: 0 4px;
            `}>
              <Badge color="blue" variant="soft" size="1" css={css`
                font-size: 9px;
                @media (min-width: 768px) {
                  font-size: 10px;
                }
              `}>
                {formatTime(currentTime)}
              </Badge>
              <Badge color="gray" variant="soft" size="1" css={css`
                font-size: 9px;
                @media (min-width: 768px) {
                  font-size: 10px;
                }
              `}>
                {formatTime(duration)}
              </Badge>
            </Flex>
          </Flex>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p="4">
      <Flex align="center" gap="3">
        <Button 
          size="2" 
          variant="soft" 
          onClick={handlePlayPause}
          disabled={!currentTopic.audioUrl || isLoading}
        >
          {isLoading ? '⏳' : isPlaying ? <PauseIcon /> : <PlayIcon />}
        </Button>
        
        <Box>
          <Text size="2" weight="bold">
            {currentTopic.title}
          </Text>
          <Text size="1" color="gray" style={{ display: 'block' }}>
            {currentTopic.id.replace('topic-', 'Topic ')}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
});