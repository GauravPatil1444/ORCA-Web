// src/hooks/useTheme.ts
import { useEffect } from 'react';
import { useStore } from '../store/useStore';

export const useTheme = () => {
  const theme = useStore((state) => state.theme);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = () => {
      if (theme === 'auto') {
        const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemDark) root.classList.add('dark');
        else root.classList.remove('dark');
      } else if (theme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    if (theme === 'auto') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);
};