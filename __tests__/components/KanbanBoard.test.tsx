import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import KanbanBoard from '@/components/KanbanBoard';
import { Column, User } from '@/types';

// Mock @hello-pangea/dnd
jest.mock('@hello-pangea/dnd', () => ({
  DragDropContext: ({ children }: any) => <div>{children}</div>,
  Droppable: ({ children }: any) => children({ droppableProps: {}, innerRef: jest.fn(), placeholder: null }, {}),
  Draggable: ({ children }: any) => children({ draggableProps: {}, innerRef: jest.fn(), dragHandleProps: {} }, {}),
}));

describe('KanbanBoard', () => {
  const mockColumns: Column[] = [
    {
      id: 'todo',
      title: 'To Do',
      cards: [
        {
          id: 'card1',
          title: 'Test Card',
          description: 'Test Description',
          assignees: [],
          priority: 'medium',
          labels: [],
          columnId: 'todo',
          createdAt: new Date(),
          updatedAt: new Date(),
          position: 0
        }
      ],
      wipLimit: 5,
      position: 0
    }
  ];

  const mockUsers: User[] = [
    {
      id: 'user1',
      name: 'Test User',
      email: 'test@example.com',
      avatar: '/avatar.jpg'
    }
  ];

  const mockProps = {
    columns: mockColumns,
    users: mockUsers,
    onCardMove: jest.fn(),
    onCardEdit: jest.fn(),
    onCardDelete: jest.fn(),
    onWipLimitChange: jest.fn(),
    onCardAdd: jest.fn()
  };

  it('should render columns', () => {
    render(<KanbanBoard {...mockProps} />);

    expect(screen.getByText('To Do')).toBeInTheDocument();
  });

  it('should render cards in columns', () => {
    render(<KanbanBoard {...mockProps} />);

    expect(screen.getByText('Test Card')).toBeInTheDocument();
  });
});