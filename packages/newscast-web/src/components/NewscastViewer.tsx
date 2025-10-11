import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex } from '@radix-ui/themes';
import { TopicCard } from './TopicCard';
import type { AudioPlayerRef } from './AudioPlayer';
import { useAudioContext } from '../contexts/AudioContext';
import { useSimpleScrollSpy } from '../hooks/useSimpleScrollSpy';
import type { NewscastData } from '../types/newscast';
import { NewscastHeader } from './newscast-viewer/NewscastHeader';
import { BottomAudioPlayer } from './newscast-viewer/BottomAudioPlayer';
import { CurrentScriptDisplay } from './audio/CurrentScriptDisplay';
import { useCurrentScript } from '../hooks/useCurrentScript';

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

export const NewscastViewer: React.FC<NewscastViewerProps> = React.memo(({ newscastData }) => {
  const [expandedTopicIndex, setExpandedTopicIndex] = useState(-1);
  const [isScrolled, setIsScrolled] = useState(false);
  const { state: audioState, actions: audioActions } = useAudioContext();
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
  const topicIDs = useMemo(
    () => newscastData.topics.map((topic) => `topic-${topic.id}`),
    [newscastData.topics]
  );

  // 활성 토픽 감지
  const activeTopicID = useSimpleScrollSpy(topicIDs);
  const activeTopicIndex = useMemo(
    () => activeTopicID ? topicIDs.findIndex(id => id === activeTopicID) : -1,
    [activeTopicID, topicIDs]
  );

  // 토픽 토글 핸들러 (메모화)
  const handleTopicToggle = useCallback((index: number) => {
    setExpandedTopicIndex(prev => prev === index ? -1 : index);
    
    // 현재 재생 중인 오디오 완전 중지 (시간도 0으로 리셋)
    audioActions.stop();
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

  // 현재 재생 중인 토픽과 스크립트 추적
  const currentPlayingTopic = audioState.currentTopicIndex >= 0 
    ? newscastData.topics[audioState.currentTopicIndex] 
    : null;
    
  const currentScript = useCurrentScript(
    currentPlayingTopic, 
    audioState.currentTime
  );


  const handleClosePlayer = useCallback(() => {
    // Stop the AudioPlayer component using ref
    audioPlayerRef.current?.stop();
    audioActions.pause();
    audioActions.setCurrentTopicIndex(-1);
    setExpandedTopicIndex(-1);
  }, [audioActions]);

  return (
    <>
      <NewscastHeader 
        newscastData={newscastData}
        isScrolled={isScrolled}
      />

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

      <BottomAudioPlayer
        expandedTopic={expandedTopic}
        audioPlayerRef={audioPlayerRef}
        onClose={handleClosePlayer}
      />

      <CurrentScriptDisplay
        currentScript={currentScript.currentScript}
        currentSpeaker={currentScript.currentSpeaker}
        progress={currentScript.progress}
        isVisible={!!currentScript.currentScript && audioState.currentTopicIndex >= 0}
      />
    </>
  );
});