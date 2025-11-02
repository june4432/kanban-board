import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, actualTheme, toggleTheme } = useTheme();

  const getIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4" />;
    }
    return actualTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
  };

  const getLabel = () => {
    switch (theme) {
      case 'light':
        return '라이트 모드';
      case 'dark':
        return '다크 모드';
      case 'system':
        return `시스템 (${actualTheme === 'dark' ? '다크' : '라이트'})`;
      default:
        return '테마';
    }
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={toggleTheme}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        title={getLabel()}
      >
        {getIcon()}
        <span className="hidden sm:inline">{getLabel()}</span>
      </button>
    </div>
  );
};

export default ThemeToggle;

// 드롭다운 형태의 테마 토글 컴포넌트
interface ThemeToggleDropdownProps {
  showLabel?: boolean;
  useDropdown?: boolean; // true면 드롭다운, false면 클릭 시 순환
}

export const ThemeToggleDropdown: React.FC<ThemeToggleDropdownProps> = ({
  showLabel = true,
  useDropdown = true
}) => {
  const { theme, setTheme } = useTheme();

  const themeOptions = [
    {
      value: 'light' as const,
      label: '라이트',
      icon: <Sun className="w-4 h-4" />,
    },
    {
      value: 'dark' as const,
      label: '다크',
      icon: <Moon className="w-4 h-4" />,
    },
    {
      value: 'system' as const,
      label: '시스템',
      icon: <Monitor className="w-4 h-4" />,
    },
  ];

  const currentOption = themeOptions.find(option => option.value === theme);

  // 순환 모드: light → dark → system → light...
  const cycleTheme = () => {
    const currentIndex = themeOptions.findIndex(opt => opt.value === theme);
    const nextIndex = (currentIndex + 1) % themeOptions.length;
    const nextTheme = themeOptions[nextIndex];
    if (nextTheme) {
      setTheme(nextTheme.value);
    }
  };

  // 드롭다운 모드 (사이드바 열림): 버튼 형태
  if (useDropdown && showLabel) {
    return (
      <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
        {themeOptions.map((option) => {
          const Icon = option.icon;
          const isActive = theme === option.value;
          return (
            <button
              key={option.value}
              onClick={() => setTheme(option.value)}
              className={`flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title={option.label}
            >
              {Icon}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // 아이콘만 모드 (사이드바 닫힘): 클릭 시 순환
  return (
    <button
      onClick={cycleTheme}
      className="flex items-center justify-center p-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
      title={`테마: ${currentOption?.label}`}
    >
      {currentOption?.icon}
    </button>
  );
};