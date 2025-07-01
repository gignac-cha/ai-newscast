import React from 'react';
import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';
import type { NewscastTopic } from '../types/newscast';

interface AudioPlayerProps {
  currentTopic?: NewscastTopic;
  onTopicChange: (index: number) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  currentTopic,
  onTopicChange 
}) => {
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

  return (
    <Box p="4">
      <Flex align="center" gap="3">
        <Button size="2" variant="soft">
          <PlayIcon />
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
};