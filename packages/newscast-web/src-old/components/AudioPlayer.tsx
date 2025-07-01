import { Box, Button, Slider, Text, Flex } from '@radix-ui/themes';
import { PlayIcon, PauseIcon, SpeakerLoudIcon } from '@radix-ui/react-icons';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { NewscastTopic } from '../types/newscast';

interface AudioPlayerProps {
  currentTopic?: NewscastTopic;
  onTopicChange?: (topicIndex: number) => void;
}

export const AudioPlayer = ({ currentTopic, onTopicChange }: AudioPlayerProps) => {
  const { state, actions } = useAudioPlayer();

  const handlePlayPause = () => {
    if (!currentTopic) return;

    if (state.isPlaying) {
      actions.pause();
    } else {
      actions.play(currentTopic.audioFile);
    }
  };

  const handleTimeChange = (values: number[]) => {
    actions.seekTo(values[0]);
  };

  const handleVolumeChange = (values: number[]) => {
    actions.setVolume(values[0] / 100);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!currentTopic) {
    return (
      <Box p="4" style={{ backgroundColor: 'var(--gray-2)' }}>
        <Text color="gray">No topic selected</Text>
      </Box>
    );
  }

  return (
    <Box p="4" style={{ backgroundColor: 'var(--gray-2)', borderRadius: '8px' }}>
      <Flex direction="column" gap="3">
        {/* Topic Title */}
        <Text size="3" weight="bold" color="gray">
          {currentTopic.title}
        </Text>

        {/* Main Controls */}
        <Flex align="center" gap="3">
          <Button
            size="3"
            variant="solid"
            onClick={handlePlayPause}
            disabled={!currentTopic.audioFile}
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </Button>

          {/* Time Progress */}
          <Flex align="center" gap="2" style={{ flex: 1 }}>
            <Text size="1" color="gray">
              {formatTime(state.currentTime)}
            </Text>
            
            <Slider
              value={[state.currentTime]}
              max={state.duration ?? 100}
              step={1}
              onValueChange={handleTimeChange}
              style={{ flex: 1 }}
            />
            
            <Text size="1" color="gray">
              {formatTime(state.duration)}
            </Text>
          </Flex>

          {/* Volume Control */}
          <Flex align="center" gap="2" style={{ minWidth: '100px' }}>
            <SpeakerLoudIcon />
            <Slider
              value={[state.volume * 100]}
              max={100}
              step={1}
              onValueChange={handleVolumeChange}
              style={{ width: '60px' }}
            />
          </Flex>
        </Flex>
      </Flex>
    </Box>
  );
}