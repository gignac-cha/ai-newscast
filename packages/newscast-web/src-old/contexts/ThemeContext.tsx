import { createContext, PropsWithChildren, Reducer, useContext, useEffect, useReducer } from 'react';

const mediaQueryList = window.matchMedia('(prefers-color-scheme: dark)');

type ColorScheme = 'light' | 'dark';

interface ThemeState {
  colorScheme: ColorScheme;
}

interface ThemeContextValue extends ThemeState {
  toggleTheme: () => void;
}

const initialState: ThemeState = { 
  colorScheme: mediaQueryList.matches ? 'dark' : 'light' 
};

type ThemeAction = 
  | { type: 'SYSTEM_CHANGE'; colorScheme: ColorScheme }
  | { type: 'USER_TOGGLE' };

const reducer: Reducer<ThemeState, ThemeAction> = (prevState, action) => {
  switch (action.type) {
    case 'SYSTEM_CHANGE':
      return { ...prevState, colorScheme: action.colorScheme };
    case 'USER_TOGGLE':
      return { ...prevState, colorScheme: prevState.colorScheme === 'light' ? 'dark' : 'light' };
    default:
      return prevState;
  }
};

const defaultValue: ThemeContextValue = { 
  ...initialState,
  toggleTheme: () => {}
};

export const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const toggleTheme = () => {
    // Add transition class before theme change
    const documentElement = document.documentElement;
    documentElement.classList.add('theme-transition');
    
    requestAnimationFrame(() => {
      dispatch({ type: 'USER_TOGGLE' });
      
      // Remove transition class after animation completes
      setTimeout(() => {
        documentElement.classList.remove('theme-transition');
      }, 300);
    });
  };

  useEffect(() => {
    const listener = (event: MediaQueryListEvent) => {
      const documentElement = document.documentElement;
      documentElement.classList.add('theme-transition');
      
      requestAnimationFrame(() => {
        dispatch({ type: 'SYSTEM_CHANGE', colorScheme: event.matches ? 'dark' : 'light' });
        
        setTimeout(() => {
          documentElement.classList.remove('theme-transition');
        }, 300);
      });
    };
    
    mediaQueryList.addEventListener('change', listener);
    return () => mediaQueryList.removeEventListener('change', listener);
  }, []);

  return (
    <ThemeContext.Provider value={{ ...state, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};