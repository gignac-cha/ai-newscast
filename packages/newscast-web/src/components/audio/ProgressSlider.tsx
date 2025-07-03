import { css } from '@emotion/react';
import { Box, Slider } from '@radix-ui/themes';

interface ProgressSliderProps {
  currentTime: number;
  duration: number;
  onSeek: (value: number[]) => void;
}

const sliderStyles = css`
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
`;

const containerStyles = css`
  padding: 0 8px;
`;

export const ProgressSlider: React.FC<ProgressSliderProps> = ({
  currentTime,
  duration,
  onSeek
}) => {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <Box css={containerStyles}>
      <Slider
        value={[progressPercent]}
        onValueChange={onSeek}
        max={100}
        step={0.1}
        size="2"
        css={sliderStyles}
      />
    </Box>
  );
};