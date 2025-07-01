import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex, Text, Badge } from '@radix-ui/themes';
import { TopicCard } from './TopicCard';
import { AudioPlayer } from './AudioPlayer';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { useScrollSpy } from '../hooks/useScrollSpy';
import { useDistanceScale } from '../hooks/useDistanceScale';
import { NewscastData } from '../types/newscast';

interface NewscastViewerProps {
  newscastData: NewscastData;
}

const scrollMarginStyles = css`
  scroll-margin: 50vh 0;
`;

const fixedHeaderStyles = (isVisible: boolean) => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--gray-1);
  border-bottom: 1px solid var(--gray-6);
  transform: translateY(${isVisible ? '0' : '-100%'});
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

const fixedAudioPlayerStyles = (isVisible: boolean) => css`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 100;
  border-top: 1px solid var(--gray-6);
  background-color: var(--gray-1);
  transform: translateY(${isVisible ? '0' : '100%'});
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
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
  padding: 100px 0 120px 0; /* 상단 헤더, 하단 오디오 플레이어 공간 확보 */
  min-height: 0;
`;

const headerTextStyles = css`
  display: block;
  margin-top: 4px;
`;

export const NewscastViewer = ({ newscastData }: NewscastViewerProps) => {
  const [currentTopicIndex, setCurrentTopicIndex] = useState(-1);
  const [expandedTopicIndex, setExpandedTopicIndex] = useState(-1);
  const [isScrolling, setIsScrolling] = useState(false);
  const { state: audioState, actions: audioActions } = useAudioPlayer();
  const containerRef = useRef<HTMLDivElement>(null);
  const topicRefs = useRef<(HTMLDivElement | null)[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const currentTopic = currentTopicIndex >= 0 ? newscastData.topics[currentTopicIndex] : undefined;
  
  // Generate topic element IDs for scroll spy
  const topicIds = newscastData.topics.map((topic) => `topic-${topic.id}`);
  
  // Use scroll spy to detect active topic
  const activeTopicId = useScrollSpy(topicIds, {
    rootMargin: '-50% 0px -50% 0px',
    threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0]
  });
  
  // Use distance scale for lens effect
  const distanceScales = useDistanceScale(topicIds, {
    minScale: 0.92,
    maxScale: 1.05,
    centerOffset: 0
  });
  
  // Convert active topic ID to index
  const activeTopicIndex = activeTopicId 
    ? topicIds.findIndex(id => id === activeTopicId)
    : -1;


  // Handle scroll for hiding/showing header and audio player
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!containerRef.current) return;
          
          // Show bars immediately when scrolling starts
          setIsScrolling(true);
          
          // Clear existing timeout
          if (scrollTimeoutRef.current) {
            clearTimeout(scrollTimeoutRef.current);
          }
          
          // Hide bars after scrolling stops for 200ms
          scrollTimeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
          }, 200);
          
          ticking = false;
        });
        ticking = true;
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
      return () => {
        container.removeEventListener('scroll', handleScroll);
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }
  }, []);

  // Auto-scroll to center the current topic
  const scrollToTopic = (index: number) => {
    const topicRef = topicRefs.current[index];
    if (topicRef && containerRef.current) {
      const container = containerRef.current;
      const containerHeight = container.clientHeight;
      const topicRect = topicRef.getBoundingClientRect();
      
      const topicTop = topicRef.offsetTop;
      const topicHeight = topicRect.height;
      const scrollTo = topicTop - (containerHeight / 2) + (topicHeight / 2);

      container.scrollTo({
        top: scrollTo,
        behavior: 'smooth'
      });
    }
  };

  const handleTopicSelect = (index: number) => {
    setCurrentTopicIndex(index);
    audioActions.setCurrentTopicIndex(index);
    scrollToTopic(index);
  };

  const handleToggleExpand = useCallback((index: number) => {
    // 클릭 시 UI가 사라지지 않도록 스크롤링 상태로 설정
    setIsScrolling(true);
    
    setExpandedTopicIndex(prev => prev === index ? -1 : index);
    // 토픽을 펼칠 때 해당 토픽을 선택
    setCurrentTopicIndex(index);
    
    // 잠시 후 다시 숨김
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 2000); // 2초 후 숨김
  }, []); // audioActions 의존성 제거

  // audioActions.setCurrentTopicIndex를 별도로 처리
  useEffect(() => {
    if (currentTopicIndex >= 0) {
      audioActions.setCurrentTopicIndex(currentTopicIndex);
    }
  }, [currentTopicIndex, audioActions]);

  // Stable ref callback to prevent infinite re-renders
  const setTopicRef = useCallback((index: number) => (el: HTMLDivElement | null) => {
    topicRefs.current[index] = el;
  }, []);

  // Memoized onSelect handlers to prevent re-renders
  const onSelectHandlers = useMemo(() => {
    return newscastData.topics.map((_, index) => () => handleToggleExpand(index));
  }, [newscastData.topics.length]); // handleToggleExpand 의존성 제거 (빈 의존성 배열이므로 안정적)

  return (
    <>
      {/* Fixed Header */}
      <Box p="4" css={fixedHeaderStyles(!isScrolling)}>
        <Container size="4">
          <Flex justify="between" align="center">
            <Box>
              <Text size="6" weight="bold">AI Newscast</Text>
              <Text size="2" color="gray" css={headerTextStyles}>
                {newscastData.id} • {newscastData.topics.length} topics
              </Text>
            </Box>
            
            <Badge color="blue" variant="soft" size="2">
              Live
            </Badge>
          </Flex>
        </Container>
      </Box>

      {/* Main Content - Full Screen */}
      <Box css={mainContainerStyles}>
        <Box ref={containerRef} css={scrollContainerStyles}>
          <Container size="3">
            <Flex direction="column" gap="4">
              {newscastData.topics.map((topic, index) => (
                <div
                  key={topic.id}
                  id={`topic-${topic.id}`}
                  ref={setTopicRef(index)}
                  css={scrollMarginStyles}
                >
                  <TopicCard
                    topic={topic}
                    isActive={index === activeTopicIndex || index === currentTopicIndex}
                    isPlaying={audioState.isPlaying && index === currentTopicIndex}
                    isExpanded={expandedTopicIndex === index}
                    distanceScale={distanceScales[`topic-${topic.id}`] || 1}
                    onSelect={onSelectHandlers[index]}
                  />
                </div>
              ))}
            </Flex>
          </Container>
        </Box>
      </Box>

      {/* Fixed Audio Player */}
      <Box css={fixedAudioPlayerStyles(!isScrolling)}>
        <Container size="4">
          <AudioPlayer
            currentTopic={currentTopic}
            onTopicChange={handleTopicSelect}
          />
        </Container>
      </Box>
    </>
  );
}