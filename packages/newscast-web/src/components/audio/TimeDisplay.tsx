import { css } from '@emotion/react';
import { Flex, Badge } from '@radix-ui/themes';

interface TimeDisplayProps {
  currentTime: number;
  duration: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const containerStyles = css`
  padding: 0 4px;
`;

const badgeStyles = css`
  font-size: 9px;
  @media (min-width: 768px) {
    font-size: 10px;
  }
`;

export const TimeDisplay: React.FC<TimeDisplayProps> = ({
  currentTime,
  duration
}) => {
  return (
    <Flex align="center" justify="between" css={containerStyles}>
      <Badge color="blue" variant="soft" size="1" css={badgeStyles}>
        {formatTime(currentTime)}
      </Badge>
      <Badge color="gray" variant="soft" size="1" css={badgeStyles}>
        {formatTime(duration)}
      </Badge>
    </Flex>
  );
};