import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Badge, Text } from '@radix-ui/themes';
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import type { NewscastTopic } from '../../types/newscast';

interface NewsSourcesProps {
  topic: NewscastTopic;
}

const sourcesContainerStyles = css`
  margin-bottom: 12px;
`;

const sourceBadgeStyles = css`
  margin-bottom: 8px;
`;

const moreToggleStyles = css`
  color: var(--gray-11);
  cursor: pointer;
  font-size: var(--font-size-1);
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 2px;
  
  &:hover {
    color: var(--gray-12);
  }
`;

export const NewsSources: React.FC<NewsSourcesProps> = React.memo(({ topic }) => {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  if (!topic.news?.sources || topic.news.sources.length === 0) {
    return null;
  }

  const toggleSourcesExpansion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSourcesExpanded(prev => !prev);
  }, []);

  const displayedSources = useMemo(() => 
    isSourcesExpanded 
      ? topic.news?.sources ?? []
      : topic.news?.sources?.slice(0, 5) ?? [],
    [isSourcesExpanded, topic.news?.sources]
  );

  return (
    <Box css={sourcesContainerStyles}>
      <Badge color="gray" variant="soft" size="1" css={sourceBadgeStyles}>
        <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
        {topic.news?.sources?.length ?? 0} Sources
      </Badge>
      <Flex direction="row" gap="2" wrap="wrap">
        {displayedSources.map((source, index) => (
          <Badge key={index} color="gray" variant="soft" size="1">
            <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
            {source}
          </Badge>
        ))}
        {topic.news.sources.length > 5 && (
          <Text 
            css={moreToggleStyles}
            onClick={toggleSourcesExpansion}
          >
            {isSourcesExpanded 
              ? 'Show less' 
              : `+${topic.news.sources.length - 5} more`
            }
            {isSourcesExpanded ? <ChevronUpIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
          </Text>
        )}
      </Flex>
    </Box>
  );
});