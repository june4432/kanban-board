import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, Project } from '@/types';
import { LayoutGrid, Calendar, BarChart3, BookOpen, Filter, Plus, LogOut, FolderOpen, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';
import { ThemeToggleDropdown } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterToggle: () => void;
  onAddCard: () => void;
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
  onAddCard,
  currentProject,
  onProjectChange,
  onProjectSettings,
  allProjects = [],
  onProjectSelect
}) => {
  const { user, logout, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border flex-shrink-0">
        <div className="w-full px-2 sm:px-4 lg:px-6">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-card-foreground">프로젝트 관리 보드</h1>
              {currentProject && (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    className="flex items-center space-x-2 px-3 py-1 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer"
                    title="프로젝트 선택"
                  >
                    <div 
                      className="w-6 h-6 rounded flex items-center justify-center"
                      style={{ backgroundColor: `${currentProject.color}20` }}
                    >
                      <FolderOpen 
                        className="w-4 h-4"
                        style={{ color: currentProject.color }}
                      />
                    </div>
                    <span className="text-sm font-medium text-card-foreground">{currentProject.name}</span>
                    {showProjectDropdown ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
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
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-muted rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('kanban')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" />
                  칸반
                </button>
                <button
                  onClick={() => onViewModeChange('calendar')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  캘린더
                </button>
                <button
                  onClick={() => onViewModeChange('gantt')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'gantt'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  간트
                </button>
                <button
                  onClick={() => onViewModeChange('manual')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'manual'
                      ? 'bg-background text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  매뉴얼
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={onFilterToggle}
                className="flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
              >
                <Filter className="w-4 h-4 mr-1.5" />
                필터
              </button>

              <button
                onClick={onAddCard}
                className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                카드 추가
              </button>

              {/* 프로젝트 설정 버튼 */}
              {currentProject && onProjectSettings && (
                <button
                  onClick={onProjectSettings}
                  className="flex items-center px-3 py-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors"
                  title="프로젝트 설정"
                >
                  <Settings className="w-4 h-4 mr-1.5" />
                  설정
                </button>
              )}

              {/* 테마 토글 */}
              <ThemeToggleDropdown />

              {/* User Menu */}
              <div className="flex items-center space-x-3 border-l pl-4">
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-8 h-8 rounded-full"
                />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-card-foreground">{user.name}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs text-primary font-medium">관리자</span>
                  )}
                </div>
                <button
                  onClick={logout}
                  className="flex items-center px-2 py-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
                  title="로그아웃"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
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
  );
};

export default Layout;