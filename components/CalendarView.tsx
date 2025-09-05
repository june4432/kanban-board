import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, Event, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/ko';
import { Card } from '@/types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

moment.locale('ko');
const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  cards: Card[];
  onCardClick: (cardId: string) => void;
}

interface CalendarEvent extends Event {
  cardId: string;
  priority: string;
  assignee?: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({ cards, onCardClick }) => {
  const events: CalendarEvent[] = useMemo(() => {
    return cards
      .filter(card => card.dueDate)
      .map(card => ({
        id: card.id,
        cardId: card.id,
        title: card.title,
        start: new Date(card.dueDate!),
        end: new Date(card.dueDate!),
        priority: card.priority,
        assignee: card.assignees?.[0],
        allDay: true
      }));
  }, [cards]);

  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3b82f6';
    
    switch (event.priority) {
      case 'low':
        backgroundColor = '#10b981';
        break;
      case 'medium':
        backgroundColor = '#f59e0b';
        break;
      case 'high':
        backgroundColor = '#f97316';
        break;
      case 'urgent':
        backgroundColor = '#ef4444';
        break;
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: '0px',
        display: 'block'
      }
    };
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    onCardClick(event.cardId);
  };

  const components = {
    event: ({ event }: { event: CalendarEvent }) => (
      <div className="p-1">
        <div className="font-medium text-xs">{event.title}</div>
        {event.assignee && (
          <div className="text-xs opacity-75">{event.assignee}</div>
        )}
      </div>
    )
  };

  const messages = {
    allDay: '종일',
    previous: '이전',
    next: '다음',
    today: '오늘',
    month: '월',
    week: '주',
    day: '일',
    agenda: '일정',
    date: '날짜',
    time: '시간',
    event: '일정',
    showMore: (total: number) => `+${total} 더보기`
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 h-full w-full flex flex-col">
      <div className="flex-1 w-full" style={{ minHeight: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          onSelectEvent={handleSelectEvent}
          eventPropGetter={eventStyleGetter}
          components={components}
          messages={messages}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          className="rbc-calendar w-full"
          style={{ height: '100%', width: '100%' }}
        />
      </div>
      
      {/* Legend */}
      <div className="mt-4 flex items-center space-x-4 text-sm">
        <span className="text-gray-600">우선순위:</span>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span>낮음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span>보통</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-orange-500 rounded"></div>
          <span>높음</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span>긴급</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;