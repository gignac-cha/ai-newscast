import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

type ColorScheme = 'light' | 'dark';

interface ThemeContextType {
  colorScheme: ColorScheme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');

  const toggleTheme = useCallback(() => {
    setColorScheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  // 컨텍스트 값을 메모화하여 불필요한 리렌더링 방지
  const contextValue = useMemo(() => ({
    colorScheme,
    toggleTheme
  }), [colorScheme, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};