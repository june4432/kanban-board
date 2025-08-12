import React from 'react';
import { ViewMode } from '@/types';
import { LayoutGrid, Calendar, BarChart3, BookOpen, Filter, Search, Plus } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onFilterToggle: () => void;
  onAddCard: () => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  viewMode,
  onViewModeChange,
  onFilterToggle,
  onAddCard
}) => {
  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-14">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">프로젝트 관리 보드</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex items-center bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onViewModeChange('kanban')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'kanban'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 mr-1.5" />
                  칸반
                </button>
                <button
                  onClick={() => onViewModeChange('calendar')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'calendar'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  캘린더
                </button>
                <button
                  onClick={() => onViewModeChange('gantt')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'gantt'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 mr-1.5" />
                  간트
                </button>
                <button
                  onClick={() => onViewModeChange('manual')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'manual'
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <BookOpen className="w-4 h-4 mr-1.5" />
                  매뉴얼
                </button>
              </div>

              {/* Actions */}
              <button
                onClick={onFilterToggle}
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
              >
                <Filter className="w-4 h-4 mr-1.5" />
                필터
              </button>

              <button
                onClick={onAddCard}
                className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                카드 추가
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden">
        <div className="h-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;