import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex, Text, IconButton, Badge } from '@radix-ui/themes';
import { Cross2Icon, ClockIcon } from '@radix-ui/react-icons';
import dayjs from 'dayjs';
import { TopicCard } from './TopicCard';
import { AudioPlayer, type AudioPlayerRef } from './AudioPlayer';
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

const scrollContainerStyles = (hasBottomPlayer: boolean) => css`
  flex: 1;
  overflow-y: auto;
  padding: 120px 12px ${hasBottomPlayer ? '120px' : '60px'} 12px;
  min-height: 0;
  
  @media (min-width: 768px) {
    padding: 120px 0 ${hasBottomPlayer ? '120px' : '60px'} 0;
  }
`;

const headerStyles = (isScrolled: boolean) => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--gray-1);
  border-bottom: 1px solid var(--gray-6);
  transition: all 0.3s ease;
  padding: ${isScrolled ? '12px 16px' : '16px 16px'};
  
  @media (min-width: 768px) {
    padding: ${isScrolled ? '12px 0' : '16px 0'};
  }
`;

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

// Format timestamp to readable date
const formatTimestamp = (timestamp: string): string => {
  try {
    // Convert ISO timestamp format: 2025-06-29T01-43-09-804026 -> 2025-06-29T01:43:09.804026Z
    const isoTimestamp = timestamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d+)/, 'T$1:$2:$3.$4Z');
    return dayjs(isoTimestamp).format('YYYY년 M월 D일 HH시 mm분');
  } catch {
    return timestamp;
  }
};

export const NewscastViewer: React.FC<NewscastViewerProps> = ({ newscastData }) => {
  const [expandedTopicIndex, setExpandedTopicIndex] = useState(-1);
  const [isScrolled, setIsScrolled] = useState(false);
  const { state: audioState, actions: audioActions } = useAudioPlayer();
  const audioPlayerRef = useRef<AudioPlayerRef>(null);

  // 스크롤 상태 감지
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      setIsScrolled(target.scrollTop > 50);
    };

    const scrollContainer = document.querySelector('[data-scroll-container]');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }
  }, []);

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


  const expandedTopic = expandedTopicIndex >= 0 
    ? newscastData.topics[expandedTopicIndex] 
    : undefined;

  const handleClosePlayer = useCallback(() => {
    // Stop the AudioPlayer component using ref
    audioPlayerRef.current?.stop();
    audioActions.pause();
    audioActions.setCurrentTopicIndex(-1);
    setExpandedTopicIndex(-1);
  }, [audioActions]);

  return (
    <>
      {/* Fixed Header */}
      <Box css={headerStyles(isScrolled)}>
        <Container size="4">
          <Flex justify="between" align="center">
            <Box>
              <Flex align="center" gap="2">
                <Text size={isScrolled ? "5" : "6"} weight="bold" css={css`
                  transition: font-size 0.3s ease;
                `}>AI Newscast</Text>
                {isScrolled && (
                  <Badge color="blue" variant="soft" size="1">
                    {newscastData.topics.length} Topics
                  </Badge>
                )}
              </Flex>
              {!isScrolled && (
                <Flex align="center" gap="1" style={{ marginTop: '2px' }}>
                  <ClockIcon width="12" height="12" />
                  <Text size="1" color="gray">
                    {formatTimestamp(newscastData.id)}
                  </Text>
                  <Badge color="blue" variant="soft" size="1">
                    {newscastData.topics.length} Topics
                  </Badge>
                </Flex>
              )}
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Main Content */}
      <Box css={mainContainerStyles}>
        <Box css={scrollContainerStyles(!!expandedTopic)} data-scroll-container>
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

      {/* Fixed Bottom Audio Player */}
      {expandedTopic && (
        <Box css={bottomPlayerStyles(!!expandedTopic)}>
          <Box px="3" py="3" css={css`
            @media (min-width: 768px) {
              padding: 16px 0;
            }
          `}>
            <Container size="4">
              <Flex align="center" gap="3">
                <Box css={css`
                  flex: 1;
                  min-width: 0;
                  overflow: hidden;
                `}>
                  <AudioPlayer 
                    ref={audioPlayerRef}
                    currentTopic={expandedTopic}
                    onTopicChange={() => {}}
                    isCompact={true}
                  />
                </Box>
                <IconButton 
                  size="2" 
                  variant="ghost" 
                  onClick={handleClosePlayer}
                  css={css`
                    flex-shrink: 0;
                    margin-left: 4px;
                    margin-right: 4px;
                    @media (min-width: 768px) {
                      margin-left: 6px;
                      margin-right: 6px;
                    }
                  `}
                >
                  <Cross2Icon />
                </IconButton>
              </Flex>
            </Container>
          </Box>
        </Box>
      )}
    </>
  );
};