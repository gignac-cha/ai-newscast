import React from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex, IconButton } from '@radix-ui/themes';
import { Cross2Icon } from '@radix-ui/react-icons';
import { AudioPlayer, type AudioPlayerRef } from '../AudioPlayer';
import type { NewscastTopic } from '../../types/newscast';

interface BottomAudioPlayerProps {
  expandedTopic?: NewscastTopic;
  audioPlayerRef: React.RefObject<AudioPlayerRef | null>;
  onClose: () => void;
}

const bottomPlayerStyles = (isVisible: boolean) => css`
  position: fixed;
  bottom: ${isVisible ? '0' : '-100px'};
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--gray-1);
  border-top: 1px solid var(--gray-6);
  transition: all 0.3s ease;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.1);
`;

const playerContainerStyles = css`
  @media (min-width: 768px) {
    padding: 16px 0;
  }
`;

const audioPlayerWrapperStyles = css`
  flex: 1;
  min-width: 0;
  overflow: hidden;
`;

const closeButtonStyles = css`
  flex-shrink: 0;
  margin-left: 4px;
  margin-right: 4px;
  
  @media (min-width: 768px) {
    margin-left: 6px;
    margin-right: 6px;
  }
`;

export const BottomAudioPlayer: React.FC<BottomAudioPlayerProps> = React.memo(({ 
  expandedTopic, 
  audioPlayerRef, 
  onClose 
}) => {
  if (!expandedTopic) {
    return null;
  }

  return (
    <Box css={bottomPlayerStyles(!!expandedTopic)}>
      <Box px="3" py="3" css={playerContainerStyles}>
        <Container size="4">
          <Flex align="center" gap="3">
            <Box css={audioPlayerWrapperStyles}>
              <AudioPlayer 
                ref={audioPlayerRef}
                currentTopic={expandedTopic}
                isCompact={true}
              />
            </Box>
            <IconButton 
              size="2" 
              variant="ghost" 
              onClick={onClose}
              css={closeButtonStyles}
            >
              <Cross2Icon />
            </IconButton>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
});