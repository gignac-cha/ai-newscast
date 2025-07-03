import React, { useState, useCallback } from 'react';
import { css } from '@emotion/react';
import { Box, Flex, Button } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import * as Collapsible from '@radix-ui/react-collapsible';
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

const collapsibleNewsContentStyles = css`
  overflow: hidden;
  
  &[data-state='open'] {
    animation: slideDown 300ms cubic-bezier(0.87, 0, 0.13, 1);
  }
  
  &[data-state='closed'] {
    animation: slideUp 300ms cubic-bezier(0.87, 0, 0.13, 1);
  }
  
  @keyframes slideDown {
    from { height: 0; }
    to { height: var(--radix-collapsible-content-height); }
  }
  
  @keyframes slideUp {
    from { height: var(--radix-collapsible-content-height); }
    to { height: 0; }
  }
`;

const contentStyles = css`
  font-size: var(--font-size-2);
  line-height: 1.6;
  color: var(--gray-12);
  
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

  const shouldTruncate = topic.news.content.length > 200;
  const truncatedContent = topic.news.content.substring(0, 200);
  const remainingContent = topic.news.content.substring(200);

  return (
    <Box p="3" css={newsContentStyles}>
      <Collapsible.Root open={isNewsExpanded} onOpenChange={setIsNewsExpanded}>
        <Box css={contentStyles}>
          <ReactMarkdown>{shouldTruncate ? truncatedContent : topic.news.content}</ReactMarkdown>
          
          {shouldTruncate && (
            <Collapsible.Content css={collapsibleNewsContentStyles}>
              <ReactMarkdown>{remainingContent}</ReactMarkdown>
            </Collapsible.Content>
          )}
        </Box>
        
        {shouldTruncate && (
          <Flex justify="center" css={showMoreButtonStyles}>
            <Collapsible.Trigger asChild>
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
            </Collapsible.Trigger>
          </Flex>
        )}
      </Collapsible.Root>
    </Box>
  );
});