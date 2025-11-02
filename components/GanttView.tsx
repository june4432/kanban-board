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
    // CSS 변수를 사용하여 다크모드 호환성 확보
    switch (priority) {
      case 'low': return 'rgb(34 197 94)';    // green-500
      case 'medium': return 'rgb(245 158 11)'; // amber-500  
      case 'high': return 'rgb(249 115 22)';   // orange-500
      case 'urgent': return 'rgb(239 68 68)';  // red-500
      default: return 'rgb(59 130 246)';       // blue-500
    }
  };

  const getBackgroundColor = (priority: string): string => {
    // 다크모드 호환 반투명 배경색
    switch (priority) {
      case 'low': return 'rgba(34, 197, 94, 0.1)';    // green with opacity
      case 'medium': return 'rgba(245, 158, 11, 0.1)'; // amber with opacity
      case 'high': return 'rgba(249, 115, 22, 0.1)';   // orange with opacity
      case 'urgent': return 'rgba(239, 68, 68, 0.1)';  // red with opacity
      default: return 'rgba(59, 130, 246, 0.1)';       // blue with opacity
    }
  };

  if (chartData.length === 0) {
    return (
      <div className="bg-background rounded-lg shadow p-6 h-full flex flex-col border border-border">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">마감일이 설정된 카드가 없습니다.</p>
            <p className="text-sm text-muted-foreground/70 mt-2">
              카드에 마감일을 추가하면 간트 차트에서 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background rounded-lg shadow p-6 h-full w-full flex flex-col border border-border">
      <div className="mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-foreground">간트 차트</h3>
        <p className="text-sm text-muted-foreground">프로젝트 일정과 진행 상황을 확인하세요</p>
      </div>
      
      <div className="flex-1 overflow-auto w-full">
        {/* Timeline Header */}
        <div className="flex border-b border-border" style={{ minWidth: `${256 + timelineHeader.length * 80}px` }}>
          <div className="flex-shrink-0 p-3 bg-muted font-medium text-sm text-foreground border-r border-border min-h-20 flex items-center" style={{ width: '256px' }}>
            작업
          </div>
          <div className="flex" style={{ width: `${timelineHeader.length * 80}px` }}>
            {timelineHeader.map((week, index) => (
              <div 
                key={index} 
                className="w-20 flex-shrink-0 p-2 bg-muted text-center text-xs text-muted-foreground border-r border-border min-h-20 flex items-center justify-center"
                style={{ width: '80px' }}
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
          {chartData.map((task) => (
            <div key={task.id} className="flex border-b border-border/50 hover:bg-accent/50 min-h-20" style={{ minWidth: `${256 + timelineHeader.length * 80}px` }}>
              {/* Task Info */}
              <div className="flex-shrink-0 p-3 border-r border-border flex flex-col justify-center min-h-20" style={{ width: '256px' }}>
                <div
                  className="cursor-pointer"
                  onClick={() => onCardClick(task.id)}
                >
                  <div className="font-medium text-sm text-foreground truncate">
                    {task.title}
                  </div>
                  <div className="flex items-center mt-2 space-x-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.priority === 'low' ? 'priority-green' :
                      task.priority === 'medium' ? 'priority-yellow' :
                      task.priority === 'high' ? 'priority-orange' :
                      'priority-red'
                    }`}>
                      {task.priority === 'low' ? '낮음' :
                       task.priority === 'medium' ? '보통' :
                       task.priority === 'high' ? '높음' : '긴급'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Timeline Bars */}
              <div className="relative min-h-20" style={{ width: `${timelineHeader.length * 80}px` }}>
                {/* 세로선들 - 전체 타임라인 너비에 맞춰 확장 */}
                <div className="absolute top-0 left-0 bottom-0 flex" style={{ width: `${timelineHeader.length * 80}px` }}>
                  {timelineHeader.map((_week, weekIndex) => (
                    <div
                      key={weekIndex}
                      className="w-20 flex-shrink-0 border-r border-border/30 h-full"
                      style={{ width: '80px' }}
                    />
                  ))}
                </div>
                
                {/* Task Bar */}
                <div 
                  className="absolute top-1/2 transform -translate-y-1/2 h-8 rounded cursor-pointer transition-all hover:shadow-md"
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
                    <span className="text-xs font-medium text-foreground truncate">
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
        <span className="text-muted-foreground">진행률:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-muted-foreground/30 rounded"></div>
          <span className="text-foreground">Backlog (0%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-primary/60 rounded"></div>
          <span className="text-foreground">To Do (10%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-warning rounded"></div>
          <span className="text-foreground">In Progress (50%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-warning/70 rounded"></div>
          <span className="text-foreground">Review (80%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-success rounded"></div>
          <span className="text-foreground">Done (100%)</span>
        </div>
      </div>

      <div className="mt-2 flex items-center space-x-4 text-sm">
        <span className="text-muted-foreground">우선순위:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-success/20 border border-success rounded"></div>
          <span className="text-foreground">낮음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-warning/20 border border-warning rounded"></div>
          <span className="text-foreground">보통</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-warning/30 border border-warning rounded"></div>
          <span className="text-foreground">높음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-destructive/20 border border-destructive rounded"></div>
          <span className="text-foreground">긴급</span>
        </div>
      </div>
    </div>
  );
};

export default GanttView;