import React from 'react';
import { css } from '@emotion/react';
import { Flex, Badge } from '@radix-ui/themes';

interface TopicMetadataProps {
  isPlaying: boolean;
}

const metadataStyles = css`
  margin-top: auto;
`;

export const TopicMetadata: React.FC<TopicMetadataProps> = React.memo(({ isPlaying }) => {
  return (
    <Flex justify="between" align="center" css={metadataStyles}>
      {isPlaying && (
        <Badge color="green" variant="soft">
          Playing
        </Badge>
      )}
    </Flex>
  );
});