import React from 'react';
import { Card, User } from '@/types';
import { Calendar, User as UserIcon, Flag, Target, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

interface KanbanCardProps {
  card: Card;
  users: User[];
  onEdit: (cardId: string) => void;
  onDelete: (cardId: string) => void;
}

const KanbanCard: React.FC<KanbanCardProps> = ({ card, users, onEdit, onDelete }) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'low': return '낮음';
      case 'medium': return '보통';
      case 'high': return '높음';
      case 'urgent': return '긴급';
      default: return '보통';
    }
  };

  const isOverdue = card.dueDate && new Date(card.dueDate) < new Date();
  const isDueSoon = card.dueDate && 
    new Date(card.dueDate) > new Date() && 
    new Date(card.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
      {/* Card Header */}
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1 mr-2">
          {card.title}
        </h4>
        <div className="flex items-center space-x-1 flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(card.id);
            }}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <Edit className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(card.id);
            }}
            className="text-gray-400 hover:text-red-600 p-1"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Description */}
      {card.description && (
        <p className="text-sm text-gray-600 mb-3 line-clamp-3">
          {card.description}
        </p>
      )}

      {/* Labels */}
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {card.labels.map(label => (
            <span
              key={label.id}
              className="px-2 py-1 text-xs font-medium text-white rounded-full"
              style={{ backgroundColor: label.color }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="space-y-2">
        {/* Priority */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Flag className="w-4 h-4 text-gray-400" />
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getPriorityColor(card.priority)}`}>
              {getPriorityLabel(card.priority)}
            </span>
          </div>
          {card.assignees && card.assignees.length > 0 && (
            <div className="flex items-center space-x-1">
              <UserIcon className="w-3 h-3 text-gray-400" />
              <div className="flex -space-x-1">
                {card.assignees.slice(0, 3).map((userId, index) => {
                  const user = users.find(u => u.id === userId);
                  if (!user) return null;
                  return (
                    <img
                      key={userId}
                      src={user.avatar}
                      alt={user.name}
                      className="w-6 h-6 rounded-full border-2 border-white"
                      title={user.name}
                      style={{ zIndex: 10 - index }}
                    />
                  );
                })}
                {card.assignees.length > 3 && (
                  <div className="w-6 h-6 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                    +{card.assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Due Date */}
        {card.dueDate && (
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className={`text-xs ${
              isOverdue 
                ? 'text-red-600 font-medium' 
                : isDueSoon 
                ? 'text-yellow-600 font-medium' 
                : 'text-gray-600'
            }`}>
              {format(new Date(card.dueDate), 'MM/dd')}
              {isOverdue && ' (지연)'}
              {isDueSoon && ' (곧 마감)'}
            </span>
          </div>
        )}

        {/* Milestone */}
        {card.milestone && (
          <div className="flex items-center space-x-2">
            <Target className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-600">{card.milestone.name}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default KanbanCard;