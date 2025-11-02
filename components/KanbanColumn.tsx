import React, { useState } from 'react';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import { Column, User } from '@/types';
import { Plus, Settings, AlertTriangle } from 'lucide-react';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  column: Column;
  users: User[];
  onCardEdit: (cardId: string) => void;
  onCardDelete: (cardId: string) => void;
  onWipLimitChange: (columnId: string, newLimit: number) => void;
  onCardAdd: (columnId: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  users,
  onCardEdit,
  onCardDelete,
  onWipLimitChange,
  onCardAdd
}) => {
  const [isEditingWip, setIsEditingWip] = useState(false);
  const [wipLimit, setWipLimit] = useState(column.wipLimit.toString());

  const isWipExceeded = column.wipLimit > 0 && column.cards.length >= column.wipLimit;
  const isNearWipLimit = column.wipLimit > 0 && column.cards.length >= column.wipLimit * 0.8;

  const handleWipSubmit = () => {
    const newLimit = parseInt(wipLimit);
    if (!isNaN(newLimit) && newLimit > 0) {
      onWipLimitChange(column.id, newLimit);
    }
    setIsEditingWip(false);
  };

  const handleWipCancel = () => {
    setWipLimit(column.wipLimit.toString());
    setIsEditingWip(false);
  };

  return (
    <div className="w-full h-full bg-muted rounded-lg flex flex-col min-w-0">
      {/* Column Header */}
      <div className="p-3 md:p-4 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground text-base md:text-lg">{column.title}</h3>
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium ${
              isWipExceeded ? 'text-destructive' : isNearWipLimit ? 'text-warning' : 'text-muted-foreground'
            }`}>
              {column.wipLimit === 0 ? `${column.cards.length}/∞` : `${column.cards.length}/${column.wipLimit}`}
            </span>
            <button
              onClick={() => setIsEditingWip(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* WIP Limit Editor */}
        {isEditingWip && (
          <div className="flex items-center space-x-2 mb-2">
            <input
              type="number"
              value={wipLimit}
              onChange={(e) => setWipLimit(e.target.value)}
              className="w-16 px-2 py-1 text-sm bg-input border border-border rounded text-foreground"
              min="1"
            />
            <button
              onClick={handleWipSubmit}
              className="px-2 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
            >
              저장
            </button>
            <button
              onClick={handleWipCancel}
              className="px-2 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80"
            >
              취소
            </button>
          </div>
        )}

        {/* WIP Warning */}
        {isWipExceeded && (
          <div className="flex items-center space-x-2 p-2 bg-destructive/10 text-destructive-foreground rounded-md text-sm border border-destructive/20">
            <AlertTriangle className="w-4 h-4" />
            <span>WIP 제한 초과!</span>
          </div>
        )}

        {isNearWipLimit && !isWipExceeded && (
          <div className="flex items-center space-x-2 p-2 bg-warning/10 text-warning-foreground rounded-md text-sm border border-warning/20">
            <AlertTriangle className="w-4 h-4" />
            <span>WIP 제한에 근접했습니다</span>
          </div>
        )}

        {/* Add Card Button */}
        <button 
          onClick={() => onCardAdd(column.id)}
          className="w-full mt-2 p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors flex items-center justify-center"
        >
          <Plus className="w-4 h-4 mr-1" />
          카드 추가
        </button>
      </div>

      {/* Cards */}
      <Droppable droppableId={column.id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 md:p-4 space-y-3 overflow-y-auto max-h-[400px] md:max-h-none ${
              snapshot.isDraggingOver ? 'bg-accent/50' : ''
            }`}
          >
            {column.cards.map((card, index) => (
              <Draggable key={card.id} draggableId={card.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={snapshot.isDragging ? 'card-dragging' : ''}
                  >
                    <KanbanCard
                      card={card}
                      users={users}
                      onEdit={onCardEdit}
                      onDelete={onCardDelete}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
};

export default KanbanColumn;