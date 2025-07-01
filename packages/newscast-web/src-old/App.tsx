import { Suspense, useEffect } from 'react';
import { css } from '@emotion/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Theme } from '@radix-ui/themes';
import { Box, Container, Flex, Text, Spinner, Button } from '@radix-ui/themes';
import { MoonIcon, SunIcon } from '@radix-ui/react-icons';
import { NewscastViewer } from './components/NewscastViewer';
import { useLatestNewscastId, useNewscastData } from './hooks/useNewscast';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
// 선택적 CSS import 대신 런타임 로딩
// import '@radix-ui/themes/styles.css';
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

const NewscastApp = () => {
  const { data: latestId } = useLatestNewscastId();
  
  if (!latestId) {
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

  return <NewscastDataLoader newscastId={latestId} />;
}

const NewscastDataLoader = ({ newscastId }: { newscastId: string }) => {
  const { data: newscastData } = useNewscastData(newscastId);
  
  if (!newscastData) {
    return (
      <Box css={fullHeightStyles}>
        <Container size="2">
          <Flex direction="column" align="center" justify="center" css={centeredFlexStyles} gap="4">
            <Text size="4" weight="bold" color="red">Failed to load newscast data</Text>
            <Text size="2" color="gray" css={centerTextStyles}>
              Could not load the newscast content. Please make sure the output files are available.
            </Text>
            <Text size="1" color="gray">Newscast ID: {newscastId}</Text>
          </Flex>
        </Container>
      </Box>
    );
  }

  return <NewscastViewer newscastData={newscastData} />;
}

const LoadingFallback = () => (
  <Box css={fullHeightStyles}>
    <Container size="2">
      <Flex direction="column" align="center" justify="center" css={centeredFlexStyles} gap="4">
        <Spinner size="3" />
        <Text size="3" color="gray">Loading newscast...</Text>
      </Flex>
    </Container>
  </Box>
);

const ThemedApp = () => {
  const { colorScheme, toggleTheme } = useTheme();

  // 런타임에 CSS 동적 로딩
  useEffect(() => {
    const loadRadixCSS = async () => {
      await import('@radix-ui/themes/styles.css');
    };
    loadRadixCSS();
  }, []);

  return (
    <Theme
      appearance={colorScheme}
      accentColor="blue"
      grayColor="gray"
      radius="medium"
      scaling="100%"
    >
      <Box style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 1000 }}>
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
        <NewscastApp />
      </Suspense>
    </Theme>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ThemedApp />
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;