import React from 'react';
import { css } from '@emotion/react';
import { Box, Text, Progress, Badge } from '@radix-ui/themes';

interface CurrentScriptDisplayProps {
  currentScript: string | null;
  currentSpeaker: string | null;
  progress: number;
  isVisible: boolean;
}

const containerStyles = css`
  position: fixed;
  bottom: 80px; /* 하단 플레이어 위에 위치 */
  left: 50%;
  transform: translateX(-50%);
  width: 90%;
  max-width: 600px;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  padding: 16px;
  color: white;
  z-index: 100;
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  
  @media (max-width: 768px) {
    width: 95%;
    bottom: 90px;
    padding: 12px;
  }
`;

const hiddenStyles = css`
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
  pointer-events: none;
`;

const visibleStyles = css`
  opacity: 1;
  transform: translateX(-50%) translateY(0);
`;

const scriptStyles = css`
  font-size: var(--font-size-2);
  line-height: 1.5;
  margin-bottom: 12px;
`;

const progressStyles = css`
  height: 2px;
`;

export const CurrentScriptDisplay: React.FC<CurrentScriptDisplayProps> = React.memo(({
  currentScript,
  currentSpeaker,
  progress,
  isVisible,
}) => {

  if (!currentScript || !isVisible) {
    return (
      <Box css={[containerStyles, hiddenStyles]} />
    );
  }

  return (
    <Box css={[containerStyles, visibleStyles]}>
      <Text css={scriptStyles}>
        {currentSpeaker && (
          <Badge color="cyan" variant="surface" size="1" style={{ marginRight: '8px' }}>
            {currentSpeaker}
          </Badge>
        )}
        {currentScript}
      </Text>
      
      <Progress 
        value={progress * 100} 
        css={progressStyles}
        color="blue"
      />
    </Box>
  );
});