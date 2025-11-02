import React from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { Column, User } from '@/types';
import KanbanColumn from './KanbanColumn';

interface KanbanBoardProps {
  columns: Column[];
  users: User[];
  onCardMove: (cardId: string, sourceColumnId: string, destinationColumnId: string, destinationIndex: number) => void;
  onCardEdit: (cardId: string) => void;
  onCardDelete: (cardId: string) => void;
  onWipLimitChange: (columnId: string, newLimit: number) => void;
  onCardAdd: (columnId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({
  columns,
  users,
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
      <div className="
        flex flex-col space-y-4 md:space-y-0
        md:flex-row md:space-x-2 md:overflow-x-auto
        lg:overflow-x-hidden lg:gap-2
        h-full pb-2 min-w-0
      ">
        {columns.map((column) => (
          <div
            key={column.id}
            className="
              w-full
              md:min-w-[300px] md:w-[300px]
              lg:flex-1 lg:min-w-[240px] lg:w-auto
              min-w-0
            "
          >
            <KanbanColumn
              column={column}
              users={users}
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