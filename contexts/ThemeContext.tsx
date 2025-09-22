import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  actualTheme: 'light' | 'dark';
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('system');
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');

  // 시스템 테마 감지
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  };

  // 실제 테마 계산
  const calculateActualTheme = (currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      return getSystemTheme();
    }
    return currentTheme;
  };

  // 테마 초기화 및 로컬스토리지에서 불러오기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
        setActualTheme(calculateActualTheme(savedTheme));
      } else {
        // 기본값은 시스템 설정 따르기
        setTheme('system');
        setActualTheme(getSystemTheme());
      }
    }
  }, []);

  // 시스템 테마 변경 감지
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        if (theme === 'system') {
          setActualTheme(e.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleSystemThemeChange);
      return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
    }
  }, [theme]);

  // 테마 변경 시 DOM에 클래스 적용
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const root = document.documentElement;
      
      // 이전 테마 클래스 제거
      root.classList.remove('light', 'dark');
      
      // 새 테마 클래스 추가
      root.classList.add(actualTheme);
      
      // 로컬스토리지에 저장
      localStorage.setItem('theme', theme);
    }
  }, [theme, actualTheme]);

  // 테마 토글 (light → dark → system → light)
  const toggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
    setTheme(nextTheme);
    setActualTheme(calculateActualTheme(nextTheme));
  };

  // 특정 테마로 설정
  const handleSetTheme = (newTheme: Theme) => {
    setTheme(newTheme);
    setActualTheme(calculateActualTheme(newTheme));
  };

  const value: ThemeContextType = {
    theme,
    actualTheme,
    toggleTheme,
    setTheme: handleSetTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};