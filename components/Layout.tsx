import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, Project } from '@/types';
import { FolderOpen, Settings, ChevronDown, ChevronUp, Menu, Filter } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { ThemeToggleDropdown } from '@/components/ThemeToggle';
import Sidebar from '@/components/Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onFilterToggle?: () => void;
  currentProject?: Project;
  onProjectChange?: () => void;
  onProjectSettings?: () => void;
  allProjects?: Project[];
  onProjectSelect?: (project: Project) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  viewMode,
  onViewModeChange,
  onFilterToggle,
  currentProject,
  onProjectChange,
  onProjectSettings,
  allProjects = [],
  onProjectSelect
}) => {
  const { user, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true); // 사이드바 기본 열림
  const [isMobile, setIsMobile] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 화면 크기 감지
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024; // lg breakpoint
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false); // 모바일에서는 기본 닫힘
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 드롭다운 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowProjectDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="absolute top-4 right-4">
            <ThemeToggleDropdown />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-4">프로젝트 관리 보드</h1>
          <p className="text-muted-foreground mb-6">로그인이 필요합니다.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
          >
            로그인 / 회원가입
          </button>
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <Sidebar
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        onProjectSettings={onProjectSettings}
        user={user}
        onLogout={logout}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isMobile={isMobile}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Simplified Header */}
        <header className="bg-card border-b border-border flex-shrink-0 h-14">
          <div className="w-full h-full px-3 sm:px-4 lg:px-6">
            <div className="flex justify-between items-center h-full">
              <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
                {/* 햄버거 메뉴 (사이드바 토글) */}
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors flex-shrink-0"
                  title="메뉴"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-base sm:text-lg md:text-xl font-bold text-card-foreground flex-shrink-0">
                  프로젝트 관리 보드
                </h1>
              {currentProject && (
                <div className="relative flex-shrink min-w-0" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="flex items-center space-x-2 px-2 sm:px-3 py-1 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer min-w-0"
                    title="프로젝트 선택"
                  >
                    <div
                      className="w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${currentProject.color}20` }}
                    >
                      <FolderOpen
                        className="w-3 h-3 sm:w-4 sm:h-4"
                        style={{ color: currentProject.color }}
                      />
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-card-foreground truncate max-w-[100px] sm:max-w-[150px]">
                      {currentProject.name}
                    </span>
                    {showProjectDropdown ? (
                      <ChevronUp className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                    )}
                  </button>

                  {/* 프로젝트 드롭다운 메뉴 */}
                  {showProjectDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-popover border border-border rounded-lg shadow-lg py-2 z-50">
                      <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        내 프로젝트
                      </div>
                      <div className="max-h-64 overflow-y-auto">
                        {allProjects.map((project) => (
                          <button
                            key={project.projectId}
                            onClick={() => {
                              if (onProjectSelect) {
                                onProjectSelect(project);
                              }
                              setShowProjectDropdown(false);
                            }}
                            className={`w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors ${
                              project.projectId === currentProject.projectId ? 'bg-accent text-accent-foreground' : 'text-popover-foreground'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${project.color}20` }}
                            >
                              <FolderOpen
                                className="w-4 h-4"
                                style={{ color: project.color }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">{project.name}</div>
                              {project.description && (
                                <div className="text-xs text-muted-foreground truncate">{project.description}</div>
                              )}
                            </div>
                            {project.projectId === currentProject.projectId && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                            )}
                          </button>
                        ))}
                      </div>
                      <div className="border-t mt-2 pt-2">
                        <button
                          onClick={() => {
                            if (onProjectChange) {
                              onProjectChange();
                            }
                            setShowProjectDropdown(false);
                          }}
                          className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Settings className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-popover-foreground">프로젝트 관리</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

              {/* 오른쪽: 필터 버튼 */}
              {onFilterToggle && (
                <div className="flex items-center flex-shrink-0">
                  <button
                    onClick={onFilterToggle}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
                    title="필터"
                  >
                    <Filter className="w-4 h-4" />
                    <span className="hidden sm:inline">필터</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 w-full px-2 sm:px-4 lg:px-6 py-2 overflow-hidden">
          <div className="h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;