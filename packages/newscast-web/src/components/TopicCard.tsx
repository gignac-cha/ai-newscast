import React from 'react';
import { css } from '@emotion/react';
import { Card } from '@radix-ui/themes';
import * as Collapsible from '@radix-ui/react-collapsible';
import type { NewscastTopic } from '../types/newscast';
import { TopicHeader } from './topic-card/TopicHeader';
import { NewsContent } from './topic-card/NewsContent';
import { NewsSources } from './topic-card/NewsSources';
import { TopicMetadata } from './topic-card/TopicMetadata';

interface TopicCardProps {
  topic: NewscastTopic;
  isActive: boolean;
  isPlaying: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

const cardStyles = (isActive: boolean, isExpanded: boolean) => css`
  position: relative;
  background: var(--gray-1);
  border: 1px solid ${isActive ? 'var(--blue-7)' : 'var(--gray-6)'};
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 8px;
  cursor: ${!isExpanded ? 'pointer' : 'default'};
  transition: all 0.3s ease;
  box-shadow: ${isActive || isExpanded
    ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
    : '0 2px 8px rgba(0, 0, 0, 0.1)'};
  border-color: ${isActive || isExpanded ? 'var(--blue-7)' : 'var(--gray-6)'};
  
  &:hover {
    transform: ${!isExpanded ? 'scale(1.02)' : 'scale(1.0)'};
    box-shadow: ${isExpanded 
      ? '0 8px 25px rgba(0, 0, 0, 0.15)' 
      : '0 4px 12px rgba(0, 0, 0, 0.12)'};
    border-color: ${isExpanded ? 'var(--blue-7)' : 'var(--gray-7)'};
  }
  
  display: flex;
  flex-direction: column;
  min-height: ${isExpanded ? 'auto' : '120px'};
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
        css={cardStyles(isActive, isExpanded)}
      >
        <TopicHeader 
          topic={topic}
          isExpanded={isExpanded}
          onToggle={onToggle}
        />

        <Collapsible.Content css={collapsibleContentStyles}>
          <NewsContent topic={topic} />
          <NewsSources topic={topic} />
        </Collapsible.Content>

        <TopicMetadata isPlaying={isPlaying} />
      </Card>
    </Collapsible.Root>
  );
};

export const TopicCard = React.memo(TopicCardComponent);