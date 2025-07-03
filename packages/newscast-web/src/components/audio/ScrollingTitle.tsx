import { useRef, useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { Box, Text } from '@radix-ui/themes';

interface ScrollingTitleProps {
  title: string;
  isPlaying: boolean;
}

const containerStyles = css`
  padding: 0 8px;
  overflow: hidden;
  position: relative;
  min-height: 20px;
  max-height: 20px;
  display: flex;
  align-items: center;
  white-space: nowrap;
  
  @media (min-width: 768px) {
    min-height: 24px;
    max-height: 24px;
  }
`;

const scrollingTextStyles = css`
  display: inline-block;
  white-space: nowrap;
  line-height: 1.2;
`;

const marqueeAnimation = css`
  animation: marquee 12s linear infinite;
  
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
`;

const ellipsisStyles = css`
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const ScrollingTitle: React.FC<ScrollingTitleProps> = ({
  title,
  isPlaying
}) => {
  const [shouldScroll, setShouldScroll] = useState(false);
  const textRef = useRef<HTMLSpanElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if text should scroll when title changes
  useEffect(() => {
    if (textRef.current && containerRef.current && title) {
      const textWidth = textRef.current.scrollWidth;
      const containerWidth = containerRef.current.clientWidth;
      setShouldScroll(textWidth > containerWidth);
    }
  }, [title]);

  const getTextStyles = () => {
    // 항상 스크롤링 애니메이션 적용 (테스트용)
    return css`
      ${scrollingTextStyles}
      ${marqueeAnimation}
      animation-play-state: ${isPlaying ? 'running' : 'paused'};
      ${!isPlaying ? ellipsisStyles : ''}
    `;
  };

  return (
    <Box ref={containerRef} css={containerStyles}>
      <Text 
        ref={textRef}
        size="1" 
        weight="medium" 
        as="span"
        css={getTextStyles()}
      >
        {title}
      </Text>
    </Box>
  );
};