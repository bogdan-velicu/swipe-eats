import React, { createContext, useContext } from 'react';
import { theme, type Theme } from './tokens';

export { theme };
export type { Theme };

const ThemeContext = createContext<Theme>(theme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
