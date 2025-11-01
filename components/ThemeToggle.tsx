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
export const ThemeToggleDropdown: React.FC = () => {
  const { theme, actualTheme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = React.useState(false);

  const themeOptions = [
    {
      value: 'light' as const,
      label: '라이트 모드',
      icon: <Sun className="w-4 h-4" />,
    },
    {
      value: 'dark' as const,
      label: '다크 모드',
      icon: <Moon className="w-4 h-4" />,
    },
    {
      value: 'system' as const,
      label: '시스템 설정',
      icon: <Monitor className="w-4 h-4" />,
    },
  ];

  const currentOption = themeOptions.find(option => option.value === theme);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.theme-toggle-dropdown')) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left theme-toggle-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors"
        title={`테마: ${currentOption?.label}${theme === 'system' ? ` (${actualTheme === 'dark' ? '다크' : '라이트'})` : ''}`}
      >
        {currentOption?.icon}
        <span className="hidden sm:inline">
          {currentOption?.label}
          {theme === 'system' && (
            <span className="text-muted-foreground ml-1">
              ({actualTheme === 'dark' ? '다크' : '라이트'})
            </span>
          )}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-popover border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  setTheme(option.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors ${
                  theme === option.value 
                    ? 'bg-accent text-accent-foreground' 
                    : 'text-popover-foreground'
                }`}
              >
                {option.icon}
                <span>{option.label}</span>
                {theme === option.value && (
                  <div className="ml-auto">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};