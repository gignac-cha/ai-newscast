import React, { Suspense } from 'react';
import { css } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { Box, Container, Flex, Text, Spinner, Button } from '@radix-ui/themes';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { NewscastViewer } from './components/NewscastViewer';
import { useLatestNewscastID, useNewscastData } from './hooks/useNewscast';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AudioProvider } from './contexts/AudioContext';
// Radix UI CSS는 별도 엔트리 포인트로 분리됨
import './styles/globals.scss';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const fullHeightStyles = css`
  height: 100vh;
`;

const centeredFlexStyles = css`
  height: 100vh;
`;

const centerTextStyles = css`
  text-align: center;
`;

const themeToggleStyles = css`
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 1000;
`;

const NewscastApp: React.FC = React.memo(() => {
  const { data: latestID, isLoading: isLoadingID } = useLatestNewscastID();

  if (isLoadingID) {
    return <LoadingFallback />;
  }

  if (!latestID) {
    return (
      <Box css={fullHeightStyles}>
        <Container size="2">
          <Flex direction="column" align="center" justify="center" css={centeredFlexStyles} gap="4">
            <Text size="4" weight="bold" color="red">No newscast available</Text>
            <Text size="2" color="gray" css={centerTextStyles}>
              No newscast ID found.
            </Text>
          </Flex>
        </Container>
      </Box>
    );
  }

  return <NewscastDataLoader newscastID={latestID} />;
});

const NewscastDataLoader: React.FC<{ newscastID: string }> = React.memo(({ newscastID }) => {
  const { data: newscastData, isLoading, error } = useNewscastData(newscastID);
  
  if (isLoading) {
    return <LoadingFallback />;
  }

  if (error || !newscastData) {
    return (
      <Box css={fullHeightStyles}>
        <Container size="2">
          <Flex direction="column" align="center" justify="center" css={centeredFlexStyles} gap="4">
            <Text size="4" weight="bold" color="red">Failed to load newscast data</Text>
            <Text size="2" color="gray" css={centerTextStyles}>
              Could not load the newscast content. Please make sure the output files are available.
            </Text>
            <Text size="1" color="gray">Newscast ID: {newscastID}</Text>
          </Flex>
        </Container>
      </Box>
    );
  }

  return <NewscastViewer newscastData={newscastData} />;
});

const LoadingFallback: React.FC = React.memo(() => (
  <Box css={fullHeightStyles}>
    <Container size="2">
      <Flex direction="column" align="center" justify="center" css={centeredFlexStyles} gap="4">
        <Spinner size="3" />
        <Text size="3" color="gray">Loading newscast...</Text>
      </Flex>
    </Container>
  </Box>
));

const ThemedApp: React.FC = React.memo(() => {
  const { colorScheme, toggleTheme } = useTheme();

  return (
    <Theme
      appearance={colorScheme}
      accentColor="blue"
      grayColor="gray"
      radius="medium"
      scaling="100%"
    >
      <Box css={themeToggleStyles}>
        <Button
          variant="ghost"
          size="2"
          onClick={toggleTheme}
          css={css`
            border-radius: 50%;
            width: 40px;
            height: 40px;
            padding: 0;
          `}
        >
          {colorScheme === 'light' ? <MoonIcon /> : <SunIcon />}
        </Button>
      </Box>
      <Suspense fallback={<LoadingFallback />}>
        <AudioProvider>
          <NewscastApp />
        </AudioProvider>
      </Suspense>
    </Theme>
  );
});

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;