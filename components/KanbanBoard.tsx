import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Column } from '@/types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  columns: Column[];
  onCardMove: (cardId: string, sourceColumnId: string, destinationColumnId: string, destinationIndex: number) => void;
  onCardEdit: (cardId: string) => void;
  onCardDelete: (cardId: string) => void;
  onWipLimitChange: (columnId: string, newLimit: number) => void;
  onCardAdd: (columnId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  onCardMove,
  onCardEdit,
  onCardDelete,
  onWipLimitChange,
  onCardAdd
}) => {
  const handleDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    onCardMove(
      draggableId,
      source.droppableId,
      destination.droppableId,
      destination.index
    );
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-x-auto h-full pb-4">
        {columns.map((column, index) => (
          <div key={column.id} className="flex-shrink-0">
            <KanbanColumn
              column={column}
              onCardEdit={onCardEdit}
              onCardDelete={onCardDelete}
              onWipLimitChange={onWipLimitChange}
              onCardAdd={onCardAdd}
            />
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};

export default KanbanBoard;