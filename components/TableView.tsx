import React, { useState, useMemo } from 'react';
import { Card, User } from '@/types';
import { Calendar, User as UserIcon, Flag, Tag, Target, ArrowUpDown } from 'lucide-react';

interface TableViewProps {
  cards: Card[];
  users: User[];
  onCardClick: (cardId: string) => void;
}

type SortField = 'title' | 'status' | 'priority' | 'dueDate' | 'assignee';
type SortDirection = 'asc' | 'desc';

const TableView: React.FC<TableViewProps> = ({ cards, users, onCardClick }) => {
  const [sortField, setSortField] = useState<SortField>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedCards = useMemo(() => {
    return [...cards].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'status':
          comparison = (a.status || '').localeCompare(b.status || '');
          break;
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          comparison = (priorityOrder[a.priority] || 0) - (priorityOrder[b.priority] || 0);
          break;
        case 'dueDate':
          const dateA = a.dueDate ? new Date(a.dueDate).getTime() : 0;
          const dateB = b.dueDate ? new Date(b.dueDate).getTime() : 0;
          comparison = dateA - dateB;
          break;
        case 'assignee':
          const assigneeA = a.assignees && a.assignees.length > 0 ? (users.find(u => u.id === a.assignees[0])?.name || '') : '';
          const assigneeB = b.assignees && b.assignees.length > 0 ? (users.find(u => u.id === b.assignees[0])?.name || '') : '';
          comparison = assigneeA.localeCompare(assigneeB);
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [cards, sortField, sortDirection, users]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return '높음';
      case 'medium': return '보통';
      case 'low': return '낮음';
      default: return '-';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const SortHeader: React.FC<{ field: SortField; children: React.ReactNode }> = ({ field, children }) => (
    <th
      onClick={() => handleSort(field)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
    >
      <div className="flex items-center space-x-1">
        <span>{children}</span>
        <ArrowUpDown className="w-3 h-3" />
        {sortField === field && (
          <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </th>
  );

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="min-w-full">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted sticky top-0 z-10">
            <tr>
              <SortHeader field="title">제목</SortHeader>
              <SortHeader field="status">상태</SortHeader>
              <SortHeader field="priority">우선순위</SortHeader>
              <SortHeader field="assignee">담당자</SortHeader>
              <SortHeader field="dueDate">마감일</SortHeader>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                레이블
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                마일스톤
              </th>
            </tr>
          </thead>
          <tbody className="bg-background divide-y divide-border">
            {sortedCards.map((card) => {
              const assignee = card.assignees && card.assignees.length > 0 ? users.find(u => u.id === card.assignees[0]) : undefined;
              const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();

              return (
                <tr
                  key={card.id}
                  onClick={() => onCardClick(card.id)}
                  className="hover:bg-accent cursor-pointer transition-colors"
                >
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-foreground">{card.title}</div>
                      {card.description && (
                        <div className="text-xs text-muted-foreground mt-1 truncate max-w-md">
                          {card.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {card.status || '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityColor(card.priority)}`}>
                      {getPriorityLabel(card.priority)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {assignee ? (
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                          {assignee.name.charAt(0)}
                        </div>
                        <span className="text-sm text-foreground">{assignee.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {card.dueDate ? (
                      <div className={`flex items-center space-x-1 ${isOverdue ? 'text-red-600' : 'text-foreground'}`}>
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatDate(card.dueDate)}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {card.labels && card.labels.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {card.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.id}
                            className="px-2 py-0.5 text-xs rounded-full"
                            style={{ backgroundColor: label.color + '20', color: label.color }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {card.labels.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{card.labels.length - 3}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    {card.milestone ? (
                      <div className="flex items-center space-x-1 text-sm text-foreground">
                        <Target className="w-4 h-4" />
                        <span>{card.milestone.name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">-</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sortedCards.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            카드가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

export default TableView;
