import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Button } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import type { NewscastTopic } from '../../types/newscast';

interface NewsContentProps {
  topic: NewscastTopic;
}

const newsContentStyles = css`
  background-color: var(--gray-3);
  border-radius: 6px;
  margin-bottom: 12px;
`;

const contentStyles = (isExpanded: boolean) => css`
  font-size: var(--font-size-2);
  line-height: 1.6;
  color: var(--gray-12);

  ${!isExpanded && css`
    max-height: 150px;
    overflow: hidden;
    position: relative;

    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 40px;
      background: linear-gradient(to bottom, transparent, var(--gray-3));
      pointer-events: none;
    }
  `}

  /* Markdown content styling */
  h1, h2, h3, h4, h5, h6 {
    margin: 16px 0 8px 0;
    font-weight: 600;
  }

  h1 { font-size: 1.5em; }
  h2 { font-size: 1.3em; }
  h3 { font-size: 1.1em; }

  p {
    margin: 8px 0;
    line-height: 1.6;
  }

  ul, ol {
    margin: 8px 0;
    padding-left: 20px;
  }

  li {
    margin: 4px 0;
  }

  strong {
    font-weight: 600;
    color: var(--gray-12);
  }

  em {
    font-style: italic;
    color: var(--gray-11);
  }

  code {
    background-color: var(--gray-4);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 0.9em;
  }
`;

const showMoreButtonStyles = css`
  margin-top: 12px;
`;

export const NewsContent: React.FC<NewsContentProps> = React.memo(({ topic }) => {
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);

  if (!topic.news?.content) {
    return null;
  }

  const toggleNewsExpansion = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsNewsExpanded(prev => !prev);
  }, []);

  // Calculate content height to determine if truncation is needed
  const contentLength = topic.news.content.length;
  const shouldShowToggle = contentLength > 300; // Show toggle if content is long enough

  return (
    <Box p="3" css={newsContentStyles}>
      <Box css={contentStyles(isNewsExpanded)}>
        <ReactMarkdown>{topic.news.content}</ReactMarkdown>
      </Box>

      {shouldShowToggle && (
        <Flex justify="center" css={showMoreButtonStyles}>
          <Button
            variant="ghost"
            size="1"
            onClick={toggleNewsExpansion}
          >
            <Flex align="center" gap="1">
              {isNewsExpanded ? 'Show Less' : 'Show More'}
              {isNewsExpanded ? <ChevronUpIcon width="12" height="12" /> : <ChevronDownIcon width="12" height="12" />}
            </Flex>
          </Button>
        </Flex>
      )}
    </Box>
  );
});