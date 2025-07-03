import React from 'react';
import { css } from '@emotion/react';
import { Flex, Badge } from '@radix-ui/themes';
import { ClockIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import type { NewscastTopic } from '../../types/newscast';

interface TopicMetadataProps {
  topic: NewscastTopic;
  isPlaying: boolean;
  isExpanded?: boolean;
}

const metadataStyles = css`
  margin-top: auto;
`;

export const TopicMetadata: React.FC<TopicMetadataProps> = React.memo(({ topic, isPlaying, isExpanded = false }) => {
  const sourcesCount = topic.news?.sources ? Object.keys(topic.news.sources).length : 0;
  
  return (
    <Flex justify="between" align="center" css={metadataStyles}>
      <Flex gap="2" align="center">
        {!isExpanded && sourcesCount > 0 && (
          <Badge color="gray" variant="soft" size="1">
            <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
            {sourcesCount} Sources
          </Badge>
        )}
        {topic.audioInfo?.final_duration_formatted && (
          <Badge color="gray" variant="soft" size="1">
            <ClockIcon width="10" height="10" style={{ marginRight: '4px' }} />
            {topic.audioInfo.final_duration_formatted}
          </Badge>
        )}
      </Flex>
      {isPlaying && (
        <Badge color="green" variant="soft">
          Playing
        </Badge>
      )}
    </Flex>
  );
});