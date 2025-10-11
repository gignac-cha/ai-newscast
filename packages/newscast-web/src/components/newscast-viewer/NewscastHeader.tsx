import React from 'react';
import { css } from '@emotion/react';
import { Box, Container, Flex, Text, Badge } from '@radix-ui/themes';
import { ClockIcon } from '@radix-ui/react-icons';
import dayjs from 'dayjs';
import type { NewscastData } from '../../types/newscast';

interface NewscastHeaderProps {
  newscastData: NewscastData;
  isScrolled: boolean;
}

const headerStyles = (isScrolled: boolean) => css`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  background-color: var(--gray-1);
  border-bottom: 1px solid var(--gray-6);
  transition: all 0.3s ease;
  padding: ${isScrolled ? '12px 16px' : '16px 16px'};
  
  @media (min-width: 768px) {
    padding: ${isScrolled ? '12px 0' : '16px 0'};
  }
`;

const titleStyles = css`
  transition: font-size 0.3s ease;
`;

const timestampContainerStyles = css`
  margin-top: 2px;
`;

// Format timestamp to readable date
const formatTimestamp = (timestamp: string): string => {
  try {
    // Convert ISO timestamp format: 2025-10-11T09-05-19-485Z -> 2025-10-11T09:05:19.485Z
    // Remove trailing Z first if exists, then add it back after conversion
    const cleanTimestamp = timestamp.replace(/Z$/, '');
    const isoTimestamp = cleanTimestamp.replace(/T(\d{2})-(\d{2})-(\d{2})-(\d+)/, 'T$1:$2:$3.$4') + 'Z';

    const parsed = dayjs(isoTimestamp);
    if (!parsed.isValid()) {
      return timestamp;
    }

    return parsed.format('YYYY년 M월 D일 HH시 mm분');
  } catch {
    return timestamp;
  }
};

export const NewscastHeader: React.FC<NewscastHeaderProps> = React.memo(({ 
  newscastData, 
  isScrolled 
}) => {
  return (
    <Box css={headerStyles(isScrolled)}>
      <Container size="4">
        <Flex justify="between" align="center">
          <Box>
            <Flex align="center" gap="2">
              <Text 
                size={isScrolled ? "5" : "6"} 
                weight="bold" 
                css={titleStyles}
              >
                AI Newscast
              </Text>
              {isScrolled && (
                <Badge color="blue" variant="soft" size="1">
                  {newscastData.topics.length} Topics
                </Badge>
              )}
            </Flex>
            {!isScrolled && (
              <Flex align="center" gap="1" css={timestampContainerStyles}>
                <ClockIcon width="12" height="12" />
                <Text size="1" color="gray">
                  {formatTimestamp(newscastData.id)}
                </Text>
                <Badge color="blue" variant="soft" size="1">
                  {newscastData.topics.length} Topics
                </Badge>
              </Flex>
            )}
          </Box>
        </Flex>
      </Container>
    </Box>
  );
});