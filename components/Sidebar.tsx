import React from 'react';
import { ViewMode, User } from '@/types';
import { LayoutGrid, Calendar, BarChart3, Table, BookOpen, Settings, ChevronLeft, ChevronRight, LogOut, Key, Home } from 'lucide-react';
import { ThemeToggleDropdown } from '@/components/ThemeToggle';
import { useRouter } from 'next/router';

interface SidebarProps {
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  onProjectSettings?: () => void;
  user: User;
  onLogout: () => void;
  isOpen: boolean;
  onToggle: () => void;
  isMobile: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  viewMode,
  onViewModeChange,
  onProjectSettings,
  user,
  onLogout,
  isOpen,
  onToggle,
  isMobile
}) => {
  const router = useRouter();

  const navItems = [
    { id: 'kanban' as ViewMode, icon: LayoutGrid, label: '칸반', onClick: () => onViewModeChange?.('kanban') },
    { id: 'calendar' as ViewMode, icon: Calendar, label: '캘린더', onClick: () => onViewModeChange?.('calendar') },
    { id: 'gantt' as ViewMode, icon: BarChart3, label: '간트', onClick: () => onViewModeChange?.('gantt') },
    { id: 'table' as ViewMode, icon: Table, label: '테이블', onClick: () => onViewModeChange?.('table') },
    { id: 'manual' as ViewMode, icon: BookOpen, label: '매뉴얼', onClick: () => onViewModeChange?.('manual') },
  ];

  const isApiKeysPage = router.pathname === '/settings/api-keys';

  const actionItems = [
    // API Keys 페이지에서는 홈 버튼 표시
    ...(isApiKeysPage ? [{ id: 'home', icon: Home, label: '홈', onClick: () => router.push('/') }] : []),
    // 홈에서는 프로젝트 설정과 API Keys 표시
    ...(!isApiKeysPage && onProjectSettings ? [{ id: 'settings', icon: Settings, label: '프로젝트 설정', onClick: onProjectSettings }] : []),
    ...(!isApiKeysPage ? [{ id: 'api-keys', icon: Key, label: 'API Keys', onClick: () => router.push('/settings/api-keys') }] : []),
  ];

  return (
    <>
      {/* 모바일 오버레이 */}
      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* 사이드바 */}
      <aside
        className={`
          fixed lg:sticky top-0 left-0 h-screen bg-card border-r border-border
          flex flex-col shadow-lg z-50 transition-all duration-300 ease-in-out
          ${isMobile
            ? isOpen
              ? 'translate-x-0 w-64'
              : '-translate-x-full w-64'
            : isOpen
              ? 'w-64'
              : 'w-16'
          }
        `}
      >
        {/* 토글 버튼 */}
        <div className="flex items-center justify-end h-14 px-3 border-b border-border flex-shrink-0">
          <button
            onClick={onToggle}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title={isOpen ? '사이드바 접기' : '사이드바 펼치기'}
          >
            {isOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* 네비게이션 */}
        <nav className="flex-1 overflow-y-auto py-4">
          {/* View Mode 섹션 - viewMode가 있을 때만 표시 */}
          {onViewModeChange && (
            <>
              <div className="mb-6">
                {isOpen && (
                  <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    보기 모드
                  </div>
                )}
                <div className="space-y-1 px-2">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = viewMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={item.onClick}
                        className={`
                          w-full flex items-center px-3 py-2.5 rounded-lg transition-colors
                          ${isActive
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
                          }
                          ${!isOpen && 'justify-center'}
                        `}
                        title={!isOpen ? item.label : undefined}
                      >
                        <Icon className={`w-5 h-5 flex-shrink-0 ${isOpen && 'mr-3'}`} />
                        {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 구분선 */}
              <div className="mx-4 mb-4 border-t border-border" />
            </>
          )}

          {/* 액션 섹션 */}
          {actionItems.length > 0 && (
            <div>
              {isOpen && (
                <div className="px-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  도구
                </div>
              )}
              <div className="space-y-1 px-2">
                {actionItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={item.onClick}
                      className={`
                        w-full flex items-center px-3 py-2.5 rounded-lg transition-colors
                        text-muted-foreground hover:text-foreground hover:bg-accent
                        ${!isOpen && 'justify-center'}
                      `}
                      title={!isOpen ? item.label : undefined}
                    >
                      <Icon className={`w-5 h-5 flex-shrink-0 ${isOpen && 'mr-3'}`} />
                      {isOpen && <span className="text-sm font-medium">{item.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* 하단: 사용자 정보 */}
        <div className="border-t border-border p-3 flex-shrink-0">
          {isOpen ? (
            <div className="flex items-center space-x-3 px-2 py-2">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{user.name}</div>
                {user.role === 'admin' && (
                  <div className="text-xs text-primary font-medium">관리자</div>
                )}
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex-shrink-0"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <img
                src={user.avatar}
                alt={user.name}
                className="w-8 h-8 rounded-full"
                title={user.name}
              />
              <button
                onClick={onLogout}
                className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                title="로그아웃"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* 하단: 테마 선택 */}
        <div className="border-t border-border p-3 flex-shrink-0">
          {isOpen ? (
            <ThemeToggleDropdown showLabel={true} useDropdown={true} />
          ) : (
            <div className="flex justify-center">
              <ThemeToggleDropdown showLabel={false} useDropdown={false} />
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
