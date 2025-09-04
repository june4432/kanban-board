import React, { useMemo } from 'react';
import { Card } from '@/types';
import { format, differenceInDays, addDays, startOfWeek, endOfWeek } from 'date-fns';

interface GanttViewProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

const GanttView: React.FC<GanttViewProps> = ({ cards, onCardClick }) => {
  // 안전한 날짜 변환 함수
  const safeDate = (date: any): Date | null => {
    try {
      if (!date) return null;
      if (date instanceof Date) return isNaN(date.getTime()) ? null : date;
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? null : parsed;
    } catch {
      return null;
    }
  };
  const getProgressByColumn = (columnId: string): number => {
    switch (columnId) {
      case 'backlog': return 0;
      case 'todo': return 10;
      case 'inprogress': return 50;
      case 'review': return 80;
      case 'done': return 100;
      default: return 0;
    }
  };

  const { chartData, timelineHeader } = useMemo(() => {
    const cardsWithDates = cards.filter(card => card.dueDate);
    
    if (cardsWithDates.length === 0) {
      return { chartData: [], timelineHeader: [] };
    }
    
    try {
      // 날짜 안전성 검증 및 변환
      const validCards = cardsWithDates.filter(card => {
        const created = safeDate(card.createdAt);
        const due = safeDate(card.dueDate);
        return created !== null && due !== null;
      });

      if (validCards.length === 0) {
        return { chartData: [], timelineHeader: [] };
      }
      
      // 날짜 범위 계산
      const allDates = validCards.flatMap(card => {
        const created = safeDate(card.createdAt)!;
        const due = safeDate(card.dueDate)!;
        return [created, due];
      });
      
      const minDate = startOfWeek(new Date(Math.min(...allDates.map(d => d.getTime()))));
      const maxDate = endOfWeek(new Date(Math.max(...allDates.map(d => d.getTime()))));
      
      // 주 단위 헤더 생성
      const weeks = [];
      let currentDate = new Date(minDate);
      while (currentDate <= maxDate) {
        weeks.push(new Date(currentDate));
        currentDate = addDays(currentDate, 7);
      }
      
      // 차트 데이터 생성
      const totalDays = differenceInDays(maxDate, minDate);
      const chartTasks = validCards.map(card => {
        const start = safeDate(card.createdAt)!;
        const end = safeDate(card.dueDate)!;
        const adjustedStart = start > end ? new Date(end.getTime() - 24 * 60 * 60 * 1000) : start;
        
        const startOffset = Math.max(0, differenceInDays(adjustedStart, minDate));
        const duration = Math.max(1, differenceInDays(end, adjustedStart) + 1);
        const progress = getProgressByColumn(card.columnId);
        
        return {
          ...card,
          startOffset: Math.max(0, startOffset),
          duration: Math.max(1, duration),
          progress,
          adjustedStart
        };
      }).sort((a, b) => a.adjustedStart.getTime() - b.adjustedStart.getTime());
      
      return { chartData: chartTasks, timelineHeader: weeks };
    } catch (error) {
      console.error('Error in Gantt chart calculation:', error);
      return { chartData: [], timelineHeader: [] };
    }
  }, [cards]);

  const getProgressColor = (priority: string): string => {
    switch (priority) {
      case 'low': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'high': return '#f97316';
      case 'urgent': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getBackgroundColor = (priority: string): string => {
    switch (priority) {
      case 'low': return '#d1fae5';
      case 'medium': return '#fef3c7';
      case 'high': return '#fed7aa';
      case 'urgent': return '#fee2e2';
      default: return '#dbeafe';
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-500">마감일이 설정된 카드가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">
              카드에 마감일을 추가하면 간트 차트에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900">간트 차트</h3>
        <p className="text-sm text-gray-600">프로젝트 일정과 진행 상황을 확인하세요</p>
      </div>
      
      <div className="flex-1 overflow-auto w-full">
        {/* Timeline Header */}
        <div className="flex border-b border-gray-200 min-w-full">
          <div className="w-64 p-2 bg-gray-50 font-medium text-sm text-gray-700 border-r border-gray-200">
            작업
          </div>
          <div className="flex-1 flex">
            {timelineHeader.map((week, index) => (
              <div 
                key={index} 
                className="min-w-20 p-2 bg-gray-50 text-center text-xs text-gray-600 border-r border-gray-200"
              >
                {(() => {
                  try {
                    const weekDate = week instanceof Date ? week : new Date(week);
                    return format(weekDate, 'MM/dd');
                  } catch {
                    return '--/--';
                  }
                })()}
              </div>
            ))}
          </div>
        </div>

        {/* Gantt Chart Body */}
        <div className="relative">
          {chartData.map((task, taskIndex) => (
            <div key={task.id} className="flex border-b border-gray-100 hover:bg-gray-50">
              {/* Task Info */}
              <div className="w-64 p-3 border-r border-gray-200">
                <div 
                  className="cursor-pointer"
                  onClick={() => onCardClick(task.id)}
                >
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {task.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {task.assignee?.name || '담당자 없음'}
                  </div>
                  <div className="flex items-center mt-1 space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.priority === 'low' ? 'bg-green-100 text-green-800' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {task.priority === 'low' ? '낮음' :
                       task.priority === 'medium' ? '보통' :
                       task.priority === 'high' ? '높음' : '긴급'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Bars */}
              <div className="flex-1 relative h-16">
                <div className="absolute inset-0 flex">
                  {timelineHeader.map((week, weekIndex) => (
                    <div 
                      key={weekIndex} 
                      className="min-w-20 border-r border-gray-100"
                    />
                  ))}
                </div>
                
                {/* Task Bar */}
                <div 
                  className="absolute top-4 h-8 rounded cursor-pointer transition-all hover:shadow-md"
                  style={{
                    left: `${Math.max(0, (task.startOffset || 0) / 7) * 80}px`,
                    width: `${Math.max(20, ((task.duration || 1) / 7) * 80)}px`,
                    backgroundColor: getBackgroundColor(task.priority || 'medium'),
                    border: `2px solid ${getProgressColor(task.priority || 'medium')}`
                  }}
                  onClick={() => onCardClick(task.id)}
                >
                  {/* Progress Bar */}
                  <div 
                    className="h-full rounded-sm"
                    style={{
                      width: `${Math.max(0, Math.min(100, task.progress || 0))}%`,
                      backgroundColor: getProgressColor(task.priority || 'medium'),
                      opacity: 0.8
                    }}
                  />
                  
                  {/* Task Label */}
                  <div className="absolute inset-0 flex items-center px-2">
                    <span className="text-xs font-medium text-gray-800 truncate">
                      {task.title}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex-shrink-0 flex items-center space-x-4 text-sm">
        <span className="text-gray-600">진행률:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-gray-300 rounded"></div>
          <span>Backlog (0%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-blue-300 rounded"></div>
          <span>To Do (10%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-400 rounded"></div>
          <span>In Progress (50%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-400 rounded"></div>
          <span>Review (80%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>Done (100%)</span>
        </div>
      </div>

      <div className="mt-2 flex items-center space-x-4 text-sm">
        <span className="text-gray-600">우선순위:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-200 border border-green-400 rounded"></div>
          <span>낮음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-200 border border-yellow-400 rounded"></div>
          <span>보통</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-200 border border-orange-400 rounded"></div>
          <span>높음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-200 border border-red-400 rounded"></div>
          <span>긴급</span>
        </div>
      </div>
    </div>
  );
};

export default GanttView;