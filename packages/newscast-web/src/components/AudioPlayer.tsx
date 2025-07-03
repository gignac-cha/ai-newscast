import { useImperativeHandle, forwardRef, useCallback } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Text } from '@radix-ui/themes';
import type { NewscastTopic } from '../types/newscast';
import { useAudioContext } from '../contexts/AudioContext';
import { PlayButton } from './audio/PlayButton';
import { ProgressSlider } from './audio/ProgressSlider';
import { ScrollingTitle } from './audio/ScrollingTitle';
import { TimeDisplay } from './audio/TimeDisplay';

export interface AudioPlayerRef {
  stop: () => void;
}

interface AudioPlayerProps {
  currentTopic?: NewscastTopic;
  isCompact?: boolean;
}

const playerContainerStyles = css`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const compactPlayerStyles = css`
  @media (min-width: 768px) {
    gap: 12px;
  }
`;

export const AudioPlayer = forwardRef<AudioPlayerRef, AudioPlayerProps>(({ 
  currentTopic,
  isCompact = false
}, ref) => {
  const { state: audioState, actions: audioActions, isLoading } = useAudioContext();
  
  const handlePlayPause = useCallback(async () => {
    if (!currentTopic?.audioUrl) return;
    
    if (audioState.isPlaying) {
      audioActions.pause();
    } else {
      await audioActions.playWithUrl(currentTopic.audioUrl);
    }
  }, [currentTopic?.audioUrl, audioState.isPlaying, audioActions]);

  const handleSeek = useCallback((time: number) => {
    audioActions.seekTo(time);
  }, [audioActions]);

  // Expose stop function to parent via ref
  useImperativeHandle(ref, () => ({
    stop: audioActions.stop
  }), [audioActions.stop]);

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
    return (
      <Box style={{ flex: 1 }}>
        <Flex gap="2" css={compactPlayerStyles}>
          <PlayButton
            isPlaying={audioState.isPlaying}
            isLoading={isLoading}
            hasAudioUrl={!!currentTopic.audioUrl}
            onPlayPause={handlePlayPause}
            size="3"
            compact
          />
          
          <Flex direction="column" gap="3" css={playerContainerStyles}>
            <ScrollingTitle 
              title={currentTopic.title}
              isPlaying={audioState.isPlaying}
            />
            
            <ProgressSlider
              currentTime={audioState.currentTime}
              duration={audioState.duration}
              onSeek={handleSeek}
            />
            
            <TimeDisplay
              currentTime={audioState.currentTime}
              duration={audioState.duration}
            />
          </Flex>
        </Flex>
      </Box>
    );
  }

  return (
    <Box p="4">
      <Flex align="center" gap="3">
        <PlayButton
          isPlaying={audioState.isPlaying}
          isLoading={isLoading}
          hasAudioUrl={!!currentTopic.audioUrl}
          onPlayPause={handlePlayPause}
          size="2"
        />
        
        <Box css={playerContainerStyles}>
          <ScrollingTitle 
            title={currentTopic.title}
            isPlaying={audioState.isPlaying}
          />
          <Text size="1" color="gray" style={{ display: 'block' }}>
            {currentTopic.id.replace('topic-', 'Topic ')}
          </Text>
        </Box>
      </Flex>
    </Box>
  );
});

AudioPlayer.displayName = 'AudioPlayer';