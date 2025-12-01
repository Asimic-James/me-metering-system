// src/contexts/ThemeContext.jsx - Simplified for light theme only
import { createContext, useContext } from 'react';

const ThemeContext = createContext(null);

export const THEMES = {
  LIGHT: 'light',
};

export const ThemeProvider = ({ children }) => {
  // The provider now just renders its children, effectively disabling theme switching.
  return <>{children}</>;
};

export const useTheme = () => {
  // Return a static object to avoid breaking components that use this hook.
  return {
    theme: THEMES.LIGHT,
    resolvedTheme: THEMES.LIGHT,
    changeTheme: () => console.warn('Theme switching is disabled.'),
    toggleTheme: () => console.warn('Theme switching is disabled.'),
    isDark: false,
  };
};