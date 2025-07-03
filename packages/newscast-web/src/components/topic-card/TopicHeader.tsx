import React from 'react';
import { css } from '@emotion/react';
import { Flex, Text, Badge, Button, Box } from '@radix-ui/themes';
import { ChevronDownIcon, ChevronUpIcon, ClockIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import * as Collapsible from '@radix-ui/react-collapsible';
import type { NewscastTopic } from '../../types/newscast';

interface TopicHeaderProps {
  topic: NewscastTopic;
  isExpanded: boolean;
  isPlaying: boolean;
  onToggle: () => void;
}

const truncatedTextStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const titleTruncatedStyles = css`
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const headerStyles = css`
  cursor: pointer;
  width: 100%;
`;

const rankBadgeStyles = css`
  flex-shrink: 0;
  align-self: start;
`;

const titleStyles = css`
  flex: 1;
  margin: 0 12px;
  min-width: 0;
`;

const summaryStyles = css`
  color: var(--gray-11);
  margin-bottom: 6px;
  max-width: 100%;
  display: block;
`;

const sourcesBadgeStyles = css`
  flex-shrink: 0;
`;

export const TopicHeader: React.FC<TopicHeaderProps> = React.memo(({
  topic,
  isExpanded,
  isPlaying,
  onToggle
}) => {
  const sourcesCount = topic.news?.sources ? Object.keys(topic.news.sources).length : 0;
  
  return (
    <Collapsible.Trigger asChild>
      <Box css={headerStyles}>
        {/* 첫 번째 행: 토픽 번호 + 제목 + 버튼 */}
        <Flex align="start" gap="3" css={css`margin-bottom: 8px;`}>
          <Badge color={isExpanded ? 'blue' : 'gray'} variant="soft" css={rankBadgeStyles}>
            #{topic.rank}
          </Badge>
          
          <Box css={titleStyles}>
            <Text size="3" weight="bold" css={css`
              display: block;
              line-height: 1.3;
              ${!isExpanded ? titleTruncatedStyles : ''}
            `}>
              {topic.title}
            </Text>
          </Box>
          
          <Button variant="ghost" size="2" css={sourcesBadgeStyles}>
            {isExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
          </Button>
        </Flex>
        
        {/* 두 번째 행: 요약 (접힌 상태에서만) */}
        {!isExpanded && topic.news?.summary && (
          <Box css={css`margin-bottom: 6px;`}>
            <Text size="2" css={css`
              ${summaryStyles}
              ${truncatedTextStyles}
            `}>
              {topic.news?.summary ?? 'No summary available'}
            </Text>
          </Box>
        )}
        
        {/* 세 번째 행: 메타데이터 (접힌 상태에서만) */}
        {!isExpanded && (
          <Flex justify="between" align="center">
            <Flex gap="2" align="center">
              {sourcesCount > 0 && (
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
        )}
      </Box>
    </Collapsible.Trigger>
  );
});