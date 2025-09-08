import React from 'react';
import { FilterState, Priority, User, Label } from '@/types';
import { Search, X, Calendar, Users, Tag, AlertCircle } from 'lucide-react';

interface FilterPanelProps {
  filter: FilterState;
  users: User[];
  labels: Label[];
  isOpen: boolean;
  onFilterChange: (filter: FilterState) => void;
  onClose: () => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({
  filter,
  users,
  labels,
  isOpen,
  onFilterChange,
  onClose
}) => {
  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: '낮음', color: 'green' },
    { value: 'medium', label: '보통', color: 'yellow' },
    { value: 'high', label: '높음', color: 'orange' },
    { value: 'urgent', label: '긴급', color: 'red' }
  ];

  const handleSearchChange = (value: string) => {
    onFilterChange({ ...filter, searchText: value });
  };

  const handleLabelToggle = (labelId: string) => {
    const newLabels = filter.selectedLabels.includes(labelId)
      ? filter.selectedLabels.filter(id => id !== labelId)
      : [...filter.selectedLabels, labelId];
    onFilterChange({ ...filter, selectedLabels: newLabels });
  };

  const handleAssigneeToggle = (userId: string) => {
    const newAssignees = filter.selectedAssignees.includes(userId)
      ? filter.selectedAssignees.filter(id => id !== userId)
      : [...filter.selectedAssignees, userId];
    onFilterChange({ ...filter, selectedAssignees: newAssignees });
  };

  const handlePriorityToggle = (priority: Priority) => {
    const newPriorities = filter.priorities.includes(priority)
      ? filter.priorities.filter(p => p !== priority)
      : [...filter.priorities, priority];
    onFilterChange({ ...filter, priorities: newPriorities });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    const date = value ? new Date(value) : undefined;
    onFilterChange({
      ...filter,
      dateRange: { ...filter.dateRange, [field]: date }
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      searchText: '',
      selectedLabels: [],
      selectedAssignees: [],
      dateRange: {},
      priorities: []
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-background shadow-xl">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <h2 className="text-lg font-semibold text-foreground">필터</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={clearAllFilters}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                모두 지우기
              </button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Search className="w-4 h-4 inline mr-1" />
                텍스트 검색
              </label>
              <input
                type="text"
                value={filter.searchText}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="제목 또는 설명 검색..."
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
              />
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                기한 범위
              </label>
              <div className="space-y-2">
                <input
                  type="date"
                  value={filter.dateRange.start ? filter.dateRange.start.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
                  placeholder="시작일"
                />
                <input
                  type="date"
                  value={filter.dateRange.end ? filter.dateRange.end.toISOString().split('T')[0] : ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-input text-foreground"
                  placeholder="종료일"
                />
              </div>
            </div>

            {/* Assignees */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                담당자
              </label>
              <div className="space-y-2">
                {users.map(user => (
                  <label key={user.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.selectedAssignees.includes(user.id)}
                      onChange={() => handleAssigneeToggle(user.id)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <div className="ml-3 flex items-center">
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="ml-2 text-sm text-foreground">{user.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <AlertCircle className="w-4 h-4 inline mr-1" />
                우선순위
              </label>
              <div className="space-y-2">
                {priorities.map(priority => (
                  <label key={priority.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.priorities.includes(priority.value)}
                      onChange={() => handlePriorityToggle(priority.value)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <span className={`ml-3 px-2 py-1 rounded-full text-xs font-medium priority-${priority.color}`}>
                      {priority.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Labels */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Tag className="w-4 h-4 inline mr-1" />
                라벨
              </label>
              <div className="space-y-2">
                {labels.map(label => (
                  <label key={label.id} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filter.selectedLabels.includes(label.id)}
                      onChange={() => handleLabelToggle(label.id)}
                      className="h-4 w-4 text-primary focus:ring-primary border-border rounded"
                    />
                    <span
                      className="ml-3 px-2 py-1 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: label.color }}
                    >
                      {label.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;