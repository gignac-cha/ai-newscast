import React, { memo } from 'react';
import { css } from '@emotion/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Box, Button, Card, Text, Flex, Badge, Link } from '@radix-ui/themes';
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import type { NewscastTopic } from '../types/newscast';

interface TopicCardProps {
  topic: NewscastTopic;
  isActive: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const cardStyles = (isActive: boolean, isExpanded: boolean) => css`
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${isActive || isExpanded
    ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: 1px solid var(--gray-6);
  min-height: ${isExpanded ? 'auto' : '120px'};
  
  &:hover {
    transform: scale(1.02);
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
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
  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
      <Card
        size="3"
        css={cardStyles(isActive, isExpanded)}
        onClick={onToggle}
      >
        <Flex direction="column" gap="3">
          {/* Header */}
          <Flex justify="between" align="center">
            <Badge color={isActive || isExpanded ? 'blue' : 'gray'} variant="soft">
              {topic.id.replace('topic-', 'Topic ')}
            </Badge>
            
            <Collapsible.Trigger asChild>
              <Button
                size="1"
                variant="ghost"
                onClick={(e) => e.stopPropagation()}
              >
                {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
              </Button>
            </Collapsible.Trigger>
          </Flex>

          {/* Title */}
          <Collapsible.Trigger asChild>
            <Text size="4" weight="bold" css={css`
              line-height: 1.4;
              cursor: pointer;
              &:hover {
                color: var(--accent-11);
              }
            `}>
              {topic.title}
            </Text>
          </Collapsible.Trigger>

          {/* Brief info when collapsed */}
          {!isExpanded && (
            <Flex align="center" gap="1">
              <ExternalLinkIcon width="12" height="12" />
              <Text size="1" color="gray">
                {topic.news?.sources?.length || 0} sources
              </Text>
            </Flex>
          )}

          <Collapsible.Content css={collapsibleContentStyles}>
            {/* Summary */}
            <Text size="2" color="gray" style={{ lineHeight: '1.5', marginBottom: '12px' }}>
              {topic.news?.summary?.slice(0, 150) || 'No summary available'}
              {(topic.news?.summary?.length || 0) > 150 && '...'}
            </Text>

            {/* Script Preview */}
            {topic.script?.script && topic.script.script.length > 0 && (
              <Box p="3" style={{ backgroundColor: 'var(--gray-3)', borderRadius: '6px', marginBottom: '12px' }}>
                <Text size="2" weight="medium" color="gray" style={{ marginBottom: '8px' }}>
                  Script Preview:
                </Text>
                <Text size="2" style={{ fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{topic.script?.script?.[1]?.content?.slice(0, 100) || 'No script available'}
                  {(topic.script?.script?.[1]?.content?.length || 0) > 100 && '...'}"
                </Text>
              </Box>
            )}

            {/* Sources */}
            {topic.news?.sources && topic.news.sources.length > 0 && (
              <Box style={{ marginBottom: '12px' }}>
                <Text size="2" weight="medium" color="gray" style={{ marginBottom: '8px' }}>
                  Sources ({topic.news?.sources?.length || 0}):
                </Text>
                <Flex direction="column" gap="1">
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