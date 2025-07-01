import React from 'react';
import { css } from '@emotion/react';
import * as Collapsible from '@radix-ui/react-collapsible';
import { Box, Button, Card, Text, Flex, Badge, Link } from '@radix-ui/themes';
import { ExternalLinkIcon, ChevronDownIcon, ChevronUpIcon } from '@radix-ui/react-icons';
import { NewscastTopic } from '../types/newscast';

interface TopicCardProps {
  topic: NewscastTopic;
  isActive: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  distanceScale?: number;
  onSelect: () => void;
}

const cardStyles = (isActive: boolean, isExpanded: boolean, distanceScale: number = 1) => css`
  cursor: pointer;
  transition: all 0.3s ease;
  transform: scale(${distanceScale});
  box-shadow: ${isActive || isExpanded
    ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border: 1px solid var(--gray-6);
  min-height: ${isExpanded ? 'auto' : '120px'};
  
  &:hover {
    transform: scale(${Math.min(distanceScale * 1.02, 1.07)});
    box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
  }
`;

const linkStyles = css`
  text-decoration: none;
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
    from {
      height: 0;
    }
    to {
      height: var(--radix-collapsible-content-height);
    }
  }
  
  @keyframes slideUp {
    from {
      height: var(--radix-collapsible-content-height);
    }
    to {
      height: 0;
    }
  }
`;

export const TopicCard = React.memo(({ topic, isActive, isPlaying, isExpanded, distanceScale = 1, onSelect }: TopicCardProps) => {

  return (
    <Collapsible.Root open={isExpanded} onOpenChange={onSelect}>
      <Card
        size="3"
        css={cardStyles(isActive, isExpanded, distanceScale)}
        onClick={onSelect}
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
                {topic.newsContent.sources.length} sources
              </Text>
            </Flex>
          )}

          <Collapsible.Content css={collapsibleContentStyles}>
            {/* Summary */}
            <Text size="2" color="gray" style={{ lineHeight: '1.5', marginBottom: '12px' }}>
              {topic.newsContent.summary.slice(0, 150)}
              {topic.newsContent.summary.length > 150 && '...'}
            </Text>

            {/* Script Preview */}
            {topic.script.segments.length > 0 && (
              <Box p="3" style={{ backgroundColor: 'var(--gray-3)', borderRadius: '6px', marginBottom: '12px' }}>
                <Text size="2" weight="medium" color="gray" style={{ marginBottom: '8px' }}>
                  Script Preview:
                </Text>
                <Text size="2" style={{ fontStyle: 'italic', lineHeight: '1.4' }}>
                  "{topic.script.segments[0]?.text.slice(0, 100)}
                  {topic.script.segments[0]?.text.length > 100 && '...'}"
                </Text>
              </Box>
            )}

            {/* Sources */}
            {topic.newsContent.sources.length > 0 && (
              <Box style={{ marginBottom: '12px' }}>
                <Text size="2" weight="medium" color="gray" style={{ marginBottom: '8px' }}>
                  Sources ({topic.newsContent.sources.length}):
                </Text>
                <Flex direction="column" gap="1">
                  {topic.newsContent.sources.slice(0, 5).map((source, index) => (
                    <Link
                      key={index}
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="1"
                      css={linkStyles}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Flex align="center" gap="1">
                        <ExternalLinkIcon width="12" height="12" />
                        <Text size="1" color="blue" css={truncatedTextStyles}>
                          {source.title}
                        </Text>
                      </Flex>
                    </Link>
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
});