import { css } from '@emotion/react';
import { Button, Spinner } from '@radix-ui/themes';
import { PlayIcon, PauseIcon } from '@radix-ui/react-icons';

interface PlayButtonProps {
  isPlaying: boolean;
  isLoading: boolean;
  hasAudioUrl: boolean;
  onPlayPause: () => void;
  size?: "1" | "2" | "3" | "4";
  compact?: boolean;
}

const compactButtonStyles = css`
  min-width: 48px;
  min-height: 48px;
  align-self: center;
  display: flex;
  align-items: center;
  justify-content: center;
  @media (min-width: 768px) {
    min-width: 56px;
    min-height: 56px;
  }
`;

const regularButtonStyles = css`
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  min-height: 40px;
`;

export const PlayButton: React.FC<PlayButtonProps> = ({
  isPlaying,
  isLoading,
  hasAudioUrl,
  onPlayPause,
  size = "2",
  compact = false
}) => {
  const getIconSize = () => {
    switch (size) {
      case "1": return 12;
      case "2": return 14;
      case "3": return 16;
      case "4": return 18;
      default: return 14;
    }
  };

  const iconSize = getIconSize();

  return (
    <Button 
      size={size} 
      variant="soft" 
      onClick={onPlayPause}
      disabled={!hasAudioUrl || isLoading}
      css={compact ? compactButtonStyles : regularButtonStyles}
    >
      {isLoading ? (
        <Spinner size="1" />
      ) : isPlaying ? (
        <PauseIcon width={iconSize} height={iconSize} />
      ) : (
        <PlayIcon width={iconSize} height={iconSize} />
      )}
    </Button>
  );
};