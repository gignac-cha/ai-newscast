import React, { memo, useState } from 'react';
import { css } from '@emotion/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Box, Button, Card, Text, Flex, Badge } from '@radix-ui/themes';
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';
import type { NewscastTopic } from '../types/newscast';

interface TopicCardProps {
  topic: NewscastTopic;
  isActive: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const cardStyles = (isActive: boolean, isExpanded: boolean) => css`
  cursor: ${!isExpanded ? 'pointer' : 'default'};
  transition: all 0.3s ease;
  box-shadow: ${isActive || isExpanded
    ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: ${isExpanded 
    ? '2px solid var(--accent-9)' 
    : '1px solid var(--gray-6)'};
  min-height: ${isExpanded ? 'auto' : '80px'};
  
  @media (min-width: 768px) {
    min-height: ${isExpanded ? 'auto' : '120px'};
    
    &:hover {
      transform: ${!isExpanded ? 'scale(1.02)' : 'none'};
      box-shadow: ${!isExpanded ? '0 12px 35px rgba(0, 0, 0, 0.2)' : 'inherit'};
    }
  }
`;

const truncatedTextStyles = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 250px;
`;

const collapsibleContentStyles = css`
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

const TopicCardComponent: React.FC<TopicCardProps> = ({ 
  topic, 
  isActive, 
  isPlaying, 
  isExpanded, 
  onToggle 
}) => {
  const [isNewsExpanded, setIsNewsExpanded] = useState(false);
  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
      <Card
        size="2"
        css={cardStyles(isActive, isExpanded)}
        style={{
          '--card-padding': '12px',
        } as React.CSSProperties}
        onClick={!isExpanded ? onToggle : undefined}
      >
        <Flex direction="column" gap="2">
          {/* Header with expand button */}
          <Box>
            <Flex justify="between" align="start">
              <Box 
                onClick={isExpanded ? (e) => { e.stopPropagation(); onToggle(); } : undefined}
                css={css`
                  flex: 1;
                  min-width: 0;
                  margin-right: 12px;
                  ${isExpanded && css`
                    cursor: pointer;
                  `}
                `}
              >
                <Flex align="start" gap="2">
                  <Badge color={isExpanded ? 'blue' : 'gray'} variant="soft" style={{ flexShrink: 0, alignSelf: 'flex-start' }}>
                    {topic.id.replace('topic-', 'Topic ')}
                  </Badge>
                  <Text 
                    size="3" 
                    weight="bold" 
                    css={css`
                      line-height: 1.4;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: ${isExpanded ? 'normal' : 'nowrap'};
                      
                      ${isExpanded && css`
                        border-radius: 4px;
                        transition: background-color 0.2s ease;
                        padding: 2px 4px;
                        margin: -2px -4px;
                        
                        &:hover {
                          background-color: var(--gray-3);
                        }
                      `}
                      
                      @media (min-width: 768px) {
                        font-size: var(--font-size-4);
                      }
                    `}>
                    {topic.title}
                  </Text>
                </Flex>
              </Box>
              
              <Collapsible.Trigger asChild>
                <Button
                  size="1"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  style={{ flexShrink: 0 }}
                >
                  {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                </Button>
              </Collapsible.Trigger>
            </Flex>
          </Box>

          {/* Brief info when collapsed */}
          {!isExpanded && (
            <Box>
              <Text size="2" color="gray" css={css`
                line-height: 1.5;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                margin-bottom: 6px;
                max-width: 100%;
                display: block;
              `}>
                {topic.news?.summary || 'No summary available'}
              </Text>
              <Flex align="center" gap="2">
                <Badge color="gray" variant="soft" size="1">
                  <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
                  {topic.news?.sources?.length || 0} sources
                </Badge>
              </Flex>
            </Box>
          )}

          <Collapsible.Content css={collapsibleContentStyles}>
            {/* News Content */}
            {topic.news?.content && (
              <Box p="3" style={{ backgroundColor: 'var(--gray-3)', borderRadius: '6px', marginBottom: '12px' }}>
                <Box css={css`
                  font-size: var(--font-size-2);
                  line-height: 1.6;
                  color: var(--gray-12);
                  position: relative;
                  
                  /* 접힌 상태일 때 10줄 제한 */
                  ${!isNewsExpanded && css`
                    max-height: calc(1.6em * 10);
                    overflow: hidden;
                    
                    &::after {
                      content: '...';
                      position: absolute;
                      bottom: 0;
                      right: 0;
                      background: var(--gray-3);
                      padding-left: 8px;
                      color: var(--gray-11);
                    }
                  `}
                  
                  /* 마크다운 스타일링 */
                  h1, h2, h3, h4, h5, h6 {
                    margin: 16px 0 8px 0;
                    font-weight: 600;
                  }
                  
                  h1 { font-size: 1.5em; }
                  h2 { font-size: 1.3em; }
                  h3 { font-size: 1.1em; }
                  
                  p {
                    margin: 8px 0;
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
                  }
                  
                  em {
                    font-style: italic;
                  }
                  
                  blockquote {
                    margin: 12px 0;
                    padding: 8px 12px;
                    border-left: 3px solid var(--accent-9);
                    background-color: var(--gray-2);
                    border-radius: 4px;
                  }
                  
                  code {
                    background-color: var(--gray-4);
                    padding: 2px 4px;
                    border-radius: 3px;
                    font-family: monospace;
                    font-size: 0.9em;
                  }
                  
                  pre {
                    background-color: var(--gray-4);
                    padding: 12px;
                    border-radius: 6px;
                    overflow-x: auto;
                    margin: 12px 0;
                  }
                  
                  pre code {
                    background: none;
                    padding: 0;
                  }
                `}>
                  <ReactMarkdown>{topic.news.content}</ReactMarkdown>
                </Box>
                
                {/* 펼치기/접기 버튼 */}
                <Flex justify="center" style={{ marginTop: '12px' }}>
                  <Button
                    size="1"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsNewsExpanded(!isNewsExpanded);
                    }}
                    css={css`
                      color: var(--accent-11);
                      font-size: var(--font-size-1);
                      cursor: pointer;
                      
                      &:hover {
                        background-color: var(--accent-3);
                      }
                    `}
                  >
                    {isNewsExpanded ? (
                      <Flex align="center" gap="1">
                        <ChevronUpIcon width="14" height="14" />
                        <Text size="1">접기</Text>
                      </Flex>
                    ) : (
                      <Flex align="center" gap="1">
                        <ChevronDownIcon width="14" height="14" />
                        <Text size="1">펼치기</Text>
                      </Flex>
                    )}
                  </Button>
                </Flex>
              </Box>
            )}

            {/* Sources */}
            {topic.news?.sources && topic.news.sources.length > 0 && (
              <Box style={{ marginBottom: '12px' }}>
                <Badge color="gray" variant="soft" size="1" style={{ marginBottom: '8px' }}>
                  <ExternalLinkIcon width="10" height="10" style={{ marginRight: '4px' }} />
                  {topic.news?.sources?.length || 0} Sources
                </Badge>
                <Flex direction="row" gap="2" wrap="wrap">
                  {topic.news?.sources?.slice(0, 5).map((source, index) => (
                    <Flex key={index} align="center" gap="1">
                      <ExternalLinkIcon width="12" height="12" />
                      <Text size="1" color="gray" css={truncatedTextStyles}>
                        {source}
                      </Text>
                    </Flex>
                  ))}
                </Flex>
              </Box>
            )}
          </Collapsible.Content>

          {/* Metadata */}
          <Flex justify="between" align="center" style={{ marginTop: 'auto' }}>
            {isPlaying && (
              <Badge color="green" variant="soft">
                Playing
              </Badge>
            )}
          </Flex>
        </Flex>
      </Card>
    </Collapsible.Root>
  );
};

// 깊은 비교를 위한 메모화 - props가 동일하면 리렌더링 방지
export const TopicCard = memo(TopicCardComponent);