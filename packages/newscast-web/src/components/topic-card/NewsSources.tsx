import React, { useState, useCallback, useMemo } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Badge, Text, Link, Popover } from '@radix-ui/themes';
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

const popoverContentStyles = css`
  max-width: 300px;
  max-height: 300px;
  overflow-y: auto;
`;

const articleListStyles = css`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const articleLinkStyles = css`
  display: block;
  padding: 8px;
  border-radius: 6px;
  font-size: var(--font-size-1);
  line-height: 1.4;
  text-decoration: none;
  color: var(--blue-11);
  background: var(--gray-2);
  border: 1px solid var(--gray-4);
  transition: all 0.2s ease;
  
  &:hover {
    color: var(--blue-12);
    background: var(--blue-2);
    border-color: var(--blue-6);
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const linkIconStyles = css`
  display: inline;
  margin-left: 6px;
  vertical-align: baseline;
`;

const providerBadgeStyles = css`
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

export const NewsSources: React.FC<NewsSourcesProps> = React.memo(({ topic }) => {
  const [isSourcesExpanded, setIsSourcesExpanded] = useState(false);

  if (!topic.news?.sources || Object.keys(topic.news.sources).length === 0) {
    return null;
  }

  const toggleSourcesExpansion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSourcesExpanded(prev => !prev);
  }, []);

  const sourceEntries = useMemo(() => 
    Object.entries(topic.news?.sources ?? {})
      .sort(([, articlesA], [, articlesB]) => articlesB.length - articlesA.length),
    [topic.news?.sources]
  );

  const displayedSources = useMemo(() => 
    isSourcesExpanded 
      ? sourceEntries
      : sourceEntries.slice(0, 5),
    [isSourcesExpanded, sourceEntries]
  );

  return (
    <Box css={sourcesContainerStyles}>
      <Badge color="gray" variant="soft" size="1" css={sourceBadgeStyles}>
        <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
        {sourceEntries.length} Sources
      </Badge>
      <Flex direction="row" gap="2" wrap="wrap">
        {displayedSources.map(([provider, articles]) => (
          <Popover.Root key={provider}>
            <Popover.Trigger>
              <Badge color="gray" variant="outline" size="1" css={providerBadgeStyles}>
                <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
                {provider} ({articles.length})
              </Badge>
            </Popover.Trigger>
            <Popover.Content css={popoverContentStyles}>
              <Text size="2" weight="bold" style={{ marginBottom: '8px', display: 'block' }}>
                {provider} ({articles.length} articles)
              </Text>
              <Box css={articleListStyles}>
                {articles.map((article, index) => (
                  <Link
                    key={index}
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    css={articleLinkStyles}
                  >
                    {article.title}
                    <ExternalLinkIcon width="12" height="12" css={linkIconStyles} />
                  </Link>
                ))}
              </Box>
            </Popover.Content>
          </Popover.Root>
        ))}
        {sourceEntries.length > 5 && (
          <Text 
            css={moreToggleStyles}
            onClick={toggleSourcesExpansion}
          >
            {isSourcesExpanded 
              ? 'Show less' 
              : `+${sourceEntries.length - 5} more`
            }
            {isSourcesExpanded ? <ChevronUpIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
          </Text>
        )}
      </Flex>
    </Box>
  );
});