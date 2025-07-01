import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex, Text, Badge } from '@radix-ui/themes';
import { TopicCard } from './TopicCard';
import { AudioPlayer } from './AudioPlayer';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useSimpleScrollSpy } from '../hooks/useSimpleScrollSpy';
import type { NewscastData } from '../types/newscast';

interface NewscastViewerProps {
  newscastData: NewscastData;
}

const scrollMarginStyles = css`
  scroll-margin: 50vh 0;
`;


const mainContainerStyles = css`
  height: 100vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const scrollContainerStyles = css`
  flex: 1;
  overflow-y: auto;
  padding: 100px 0 120px 0;
  min-height: 0;
`;

export const NewscastViewer: React.FC<NewscastViewerProps> = ({ newscastData }) => {
  const [expandedTopicIndex, setExpandedTopicIndex] = useState(-1);
  const { state: audioState, actions: audioActions } = useAudioPlayer();

  // 토픽 ID 목록 생성 (안정된 참조)
  const topicIds = useMemo(
    () => newscastData.topics.map((topic) => `topic-${topic.id}`),
    [newscastData.topics]
  );

  // 활성 토픽 감지
  const activeTopicId = useSimpleScrollSpy(topicIds);
  const activeTopicIndex = useMemo(
    () => activeTopicId ? topicIds.findIndex(id => id === activeTopicId) : -1,
    [activeTopicId, topicIds]
  );

  // 토픽 토글 핸들러 (메모화)
  const handleTopicToggle = useCallback((index: number) => {
    setExpandedTopicIndex(prev => prev === index ? -1 : index);
    audioActions.setCurrentTopicIndex(index);
  }, [audioActions]);

  // 토픽별 토글 핸들러들 (안정된 참조)
  const toggleHandlers = useMemo(
    () => newscastData.topics.map((_, index) => () => handleTopicToggle(index)),
    [newscastData.topics.length, handleTopicToggle]
  );

  const currentTopic = audioState.currentTopicIndex >= 0 
    ? newscastData.topics[audioState.currentTopicIndex] 
    : undefined;

  return (
    <>
      {/* Fixed Header */}
      <Box p="4" style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        zIndex: 100,
        backgroundColor: 'var(--gray-1)',
        borderBottom: '1px solid var(--gray-6)'
      }}>
        <Container size="4">
          <Flex justify="between" align="center">
            <Box>
              <Text size="6" weight="bold">AI Newscast</Text>
              <Text size="2" color="gray" style={{ display: 'block', marginTop: '4px' }}>
                {newscastData.id} • {newscastData.topics.length} topics
              </Text>
            </Box>
            <Badge color="blue" variant="soft" size="2">
              Live
            </Badge>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Box css={mainContainerStyles}>
        <Box css={scrollContainerStyles}>
          <Container size="3">
            <Flex direction="column" gap="4">
              {newscastData.topics.map((topic, index) => (
                <div
                  key={topic.id}
                  id={`topic-${topic.id}`}
                  css={scrollMarginStyles}
                >
                  <TopicCard
                    topic={topic}
                    isActive={index === activeTopicIndex}
                    isPlaying={audioState.isPlaying && index === audioState.currentTopicIndex}
                    isExpanded={expandedTopicIndex === index}
                    onToggle={toggleHandlers[index]}
                  />
                </div>
              ))}
            </Flex>
          </Container>
        </Box>
      </Box>

      {/* Fixed Audio Player */}
      <Box style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderTop: '1px solid var(--gray-6)',
        backgroundColor: 'var(--gray-1)'
      }}>
        <Container size="4">
          <AudioPlayer
            currentTopic={currentTopic}
            onTopicChange={(index) => audioActions.setCurrentTopicIndex(index)}
          />
        </Container>
      </Box>
    </>
  );
};