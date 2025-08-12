import { useState, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Board, Card, Column, FilterState, ViewMode, Priority, User, Label, Milestone } from '@/types';
import { mockBoard } from '@/utils/mockData';

export const useKanban = () => {
  const [board, setBoard] = useState<Board>(mockBoard);
  const [filter, setFilter] = useState<FilterState>({
    searchText: '',
    selectedLabels: [],
    selectedAssignees: [],
    dateRange: {},
    priorities: []
  });
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // 필터링된 카드들
  const filteredCards = useMemo(() => {
    return board.columns.map(column => ({
      ...column,
      cards: column.cards.filter(card => {
        // 텍스트 검색
        if (filter.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          const titleMatch = card.title.toLowerCase().includes(searchLower);
          const descMatch = card.description.toLowerCase().includes(searchLower);
          if (!titleMatch && !descMatch) return false;
        }

        // 라벨 필터
        if (filter.selectedLabels.length > 0) {
          const hasLabel = card.labels.some(label => 
            filter.selectedLabels.includes(label.id)
          );
          if (!hasLabel) return false;
        }

        // 담당자 필터
        if (filter.selectedAssignees.length > 0) {
          if (!card.assignee || !filter.selectedAssignees.includes(card.assignee.id)) {
            return false;
          }
        }

        // 우선순위 필터
        if (filter.priorities.length > 0) {
          if (!filter.priorities.includes(card.priority)) return false;
        }

        // 날짜 범위 필터
        if (filter.dateRange.start && card.dueDate) {
          if (card.dueDate < filter.dateRange.start) return false;
        }
        if (filter.dateRange.end && card.dueDate) {
          if (card.dueDate > filter.dateRange.end) return false;
        }

        return true;
      })
    }));
  }, [board.columns, filter.searchText, filter.selectedLabels, filter.selectedAssignees, filter.priorities, filter.dateRange]);

  // 카드 이동
  const moveCard = useCallback((cardId: string, sourceColumnId: string, destinationColumnId: string, destinationIndex: number) => {
    setBoard(prevBoard => {
      const newColumns = prevBoard.columns.map(column => {
        if (column.id === sourceColumnId) {
          return {
            ...column,
            cards: column.cards.filter(card => card.id !== cardId)
          };
        }
        return column;
      });

      const sourceColumn = prevBoard.columns.find(col => col.id === sourceColumnId);
      const destinationColumn = newColumns.find(col => col.id === destinationColumnId);
      const cardToMove = sourceColumn?.cards.find(card => card.id === cardId);

      if (!cardToMove || !destinationColumn) return prevBoard;

      // WIP 제한 체크
      if (destinationColumn.cards.length >= destinationColumn.wipLimit) {
        alert(`WIP 제한 초과: ${destinationColumn.title} 컬럼의 최대 카드 수는 ${destinationColumn.wipLimit}개입니다.`);
        return prevBoard;
      }

      const updatedCard = {
        ...cardToMove,
        columnId: destinationColumnId,
        updatedAt: new Date()
      };

      const finalColumns = newColumns.map(column => {
        if (column.id === destinationColumnId) {
          const newCards = [...column.cards];
          newCards.splice(destinationIndex, 0, updatedCard);
          return {
            ...column,
            cards: newCards
          };
        }
        return column;
      });

      return {
        ...prevBoard,
        columns: finalColumns
      };
    });
  }, []);

  // 카드 생성
  const createCard = useCallback((columnId: string, cardData: Partial<Card>) => {
    const column = board.columns.find(col => col.id === columnId);
    if (!column) return;

    if (column.cards.length >= column.wipLimit) {
      alert(`WIP 제한 초과: ${column.title} 컬럼의 최대 카드 수는 ${column.wipLimit}개입니다.`);
      return;
    }

    const newCard: Card = {
      id: uuidv4(),
      title: cardData.title || '',
      description: cardData.description || '',
      assignee: cardData.assignee,
      milestone: cardData.milestone,
      priority: cardData.priority || 'medium',
      labels: cardData.labels || [],
      columnId,
      createdAt: new Date(),
      updatedAt: new Date(),
      dueDate: cardData.dueDate,
      position: column.cards.length
    };

    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(col =>
        col.id === columnId
          ? { ...col, cards: [...col.cards, newCard] }
          : col
      )
    }));
  }, [board.columns]);

  // 카드 업데이트
  const updateCard = useCallback((cardId: string, updates: Partial<Card>) => {
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(column => ({
        ...column,
        cards: column.cards.map(card =>
          card.id === cardId
            ? { ...card, ...updates, updatedAt: new Date() }
            : card
        )
      }))
    }));
  }, []);

  // 카드 삭제
  const deleteCard = useCallback((cardId: string) => {
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(column => ({
        ...column,
        cards: column.cards.filter(card => card.id !== cardId)
      }))
    }));
  }, []);

  // WIP 제한 업데이트
  const updateWipLimit = useCallback((columnId: string, newLimit: number) => {
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(column =>
        column.id === columnId
          ? { ...column, wipLimit: newLimit }
          : column
      )
    }));
  }, []);

  // 라벨 생성
  const createLabel = useCallback((name: string, color: string) => {
    const newLabel: Label = {
      id: uuidv4(),
      name,
      color
    };
    setBoard(prevBoard => ({
      ...prevBoard,
      labels: [...prevBoard.labels, newLabel]
    }));
    return newLabel;
  }, []);

  // 마일스톤 생성
  const createMilestone = useCallback((name: string, dueDate: Date, description?: string) => {
    const newMilestone: Milestone = {
      id: uuidv4(),
      name,
      dueDate,
      description
    };
    setBoard(prevBoard => ({
      ...prevBoard,
      milestones: [...prevBoard.milestones, newMilestone]
    }));
    return newMilestone;
  }, []);

  return {
    board: viewMode === 'kanban' ? { ...board, columns: filteredCards } : board,
    filter,
    viewMode,
    setFilter,
    setViewMode,
    moveCard,
    createCard,
    updateCard,
    deleteCard,
    updateWipLimit,
    createLabel,
    createMilestone
  };
};