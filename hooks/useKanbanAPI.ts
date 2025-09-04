import { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Board, Card, Column, FilterState, ViewMode, Priority, User, Label, Milestone } from '@/types';

const API_BASE_URL = '/api';

export const useKanbanAPI = () => {
  const [board, setBoard] = useState<Board>({
    id: '',
    title: '',
    columns: [],
    users: [],
    labels: [],
    milestones: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [filter, setFilter] = useState<FilterState>({
    searchText: '',
    selectedLabels: [],
    selectedAssignees: [],
    dateRange: {},
    priorities: []
  });
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');

  // 초기 데이터 로드
  const loadBoard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE_URL}/kanban`);
      if (!response.ok) {
        throw new Error('Failed to load board data');
      }
      
      const data = await response.json();
      setBoard(data.board);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
      console.error('Error loading board:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // 보드 데이터 저장
  const saveBoard = useCallback(async (boardData: Board) => {
    try {
      const response = await fetch(`${API_BASE_URL}/kanban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ board: boardData }),
      });

      if (!response.ok) {
        throw new Error('Failed to save board data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      throw err;
    }
  }, []);

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadBoard();
  }, [loadBoard]);

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
  const moveCard = useCallback(async (cardId: string, sourceColumnId: string, destinationColumnId: string, destinationIndex: number) => {
    // 현재 상태 백업 (롤백용)
    const previousBoard = { ...board };
    
    // 옵티미스틱 업데이트: 즉시 로컬 상태 변경
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
      if (sourceColumnId !== destinationColumnId && 
          destinationColumn.cards.length >= destinationColumn.wipLimit) {
        alert(`WIP 제한 초과: ${destinationColumn.title} 컬럼의 최대 카드 수는 ${destinationColumn.wipLimit}개입니다.`);
        return prevBoard; // 변경하지 않음
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

    // 백그라운드에서 API 호출
    try {
      const response = await fetch(`${API_BASE_URL}/cards/move`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cardId,
          sourceColumnId,
          destinationColumnId,
          destinationIndex
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to move card');
      }

      // API 성공 시에는 추가 작업 없음 (이미 로컬 상태 업데이트됨)
    } catch (err) {
      // API 실패 시 롤백
      setBoard(previousBoard);
      setError(err instanceof Error ? err.message : 'Failed to move card');
      alert(err instanceof Error ? err.message : 'Failed to move card');
    }
  }, [board]);

  // 카드 생성
  const createCard = useCallback(async (columnId: string, cardData: Partial<Card>) => {
    const column = board.columns.find(col => col.id === columnId);
    if (!column) return;

    // WIP 제한 체크
    if (column.cards.length >= column.wipLimit) {
      alert(`WIP 제한 초과: ${column.title} 컬럼의 최대 카드 수는 ${column.wipLimit}개입니다.`);
      return;
    }

    // 임시 ID로 새 카드 생성 (옵티미스틱)
    const tempId = `temp_${Date.now()}`;
    const newCard = {
      id: tempId,
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
    } as Card;

    // 즉시 로컬 상태 업데이트
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(col =>
        col.id === columnId
          ? { ...col, cards: [...col.cards, newCard] }
          : col
      )
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/cards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          columnId,
          cardData
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create card');
      }

      const result = await response.json();
      
      // 임시 카드를 실제 서버 카드로 교체
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: prevBoard.columns.map(col =>
          col.id === columnId
            ? { ...col, cards: col.cards.map(card => 
                card.id === tempId ? result.card : card
              )}
            : col
        )
      }));
    } catch (err) {
      // 실패 시 임시 카드 제거
      setBoard(prevBoard => ({
        ...prevBoard,
        columns: prevBoard.columns.map(col =>
          col.id === columnId
            ? { ...col, cards: col.cards.filter(card => card.id !== tempId) }
            : col
        )
      }));
      setError(err instanceof Error ? err.message : 'Failed to create card');
      alert(err instanceof Error ? err.message : 'Failed to create card');
    }
  }, [board.columns]);

  // 카드 업데이트
  const updateCard = useCallback(async (cardId: string, updates: Partial<Card>) => {
    const previousBoard = { ...board };

    // 옵티미스틱 업데이트: 즉시 로컬 상태 변경
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

    try {
      const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update card');
      }

      // API 성공 시에는 추가 작업 없음
    } catch (err) {
      // API 실패 시 롤백
      setBoard(previousBoard);
      setError(err instanceof Error ? err.message : 'Failed to update card');
      alert(err instanceof Error ? err.message : 'Failed to update card');
    }
  }, [board]);

  // 카드 삭제
  const deleteCard = useCallback(async (cardId: string) => {
    const previousBoard = { ...board };

    // 옵티미스틱 업데이트: 즉시 로컬에서 삭제
    setBoard(prevBoard => ({
      ...prevBoard,
      columns: prevBoard.columns.map(column => ({
        ...column,
        cards: column.cards.filter(card => card.id !== cardId)
      }))
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/cards/${cardId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete card');
      }

      // API 성공 시에는 추가 작업 없음
    } catch (err) {
      // API 실패 시 롤백
      setBoard(previousBoard);
      setError(err instanceof Error ? err.message : 'Failed to delete card');
      alert(err instanceof Error ? err.message : 'Failed to delete card');
    }
  }, [board]);

  // WIP 제한 업데이트
  const updateWipLimit = useCallback(async (columnId: string, newLimit: number) => {
    try {
      const updatedBoard = {
        ...board,
        columns: board.columns.map(column =>
          column.id === columnId
            ? { ...column, wipLimit: newLimit }
            : column
        )
      };

      await saveBoard(updatedBoard);
      setBoard(updatedBoard);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update WIP limit');
      alert(err instanceof Error ? err.message : 'Failed to update WIP limit');
    }
  }, [board, saveBoard]);

  // 라벨 생성
  const createLabel = useCallback(async (name: string, color: string) => {
    try {
      const newLabel: Label = {
        id: uuidv4(),
        name,
        color
      };
      
      const updatedBoard = {
        ...board,
        labels: [...board.labels, newLabel]
      };

      await saveBoard(updatedBoard);
      setBoard(updatedBoard);
      return newLabel;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create label');
      throw err;
    }
  }, [board, saveBoard]);

  // 마일스톤 생성
  const createMilestone = useCallback(async (name: string, dueDate: Date, description?: string) => {
    try {
      const newMilestone: Milestone = {
        id: uuidv4(),
        name,
        dueDate,
        description
      };
      
      const updatedBoard = {
        ...board,
        milestones: [...board.milestones, newMilestone]
      };

      await saveBoard(updatedBoard);
      setBoard(updatedBoard);
      return newMilestone;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create milestone');
      throw err;
    }
  }, [board, saveBoard]);

  return {
    board: viewMode === 'kanban' ? { ...board, columns: filteredCards } : board,
    filter,
    viewMode,
    loading,
    error,
    setFilter,
    setViewMode,
    moveCard,
    createCard,
    updateCard,
    deleteCard,
    updateWipLimit,
    createLabel,
    createMilestone,
    reloadBoard: loadBoard
  };
};