import React, { useState } from 'react';
import { useKanbanAPI } from '@/hooks/useKanbanAPI';
import Layout from '@/components/Layout';
import FilterPanel from '@/components/FilterPanel';
import KanbanBoard from '@/components/KanbanBoard';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import ManualView from '@/components/ManualView';
import CardModal from '@/components/CardModal';
import { Card } from '@/types';

export default function Home() {
  const {
    board,
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
    createMilestone
  } = useKanbanAPI();

  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | undefined>();
  const [newCardColumnId, setNewCardColumnId] = useState<string>('');

  const allCards = board.columns.flatMap(column => column.cards);

  const handleAddCard = (columnId?: string) => {
    setNewCardColumnId(columnId || 'backlog');
    setEditingCard(undefined);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (cardId: string) => {
    const card = allCards.find(c => c.id === cardId);
    if (card) {
      setEditingCard(card);
      setIsCardModalOpen(true);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    if (confirm('이 카드를 삭제하시겠습니까?')) {
      deleteCard(cardId);
    }
  };

  const handleCardSave = (cardData: Partial<Card>) => {
    if (editingCard) {
      updateCard(editingCard.id, cardData);
    } else if (newCardColumnId) {
      createCard(newCardColumnId, cardData);
    }
    setIsCardModalOpen(false);
    setEditingCard(undefined);
    setNewCardColumnId('');
  };

  const handleCardModalClose = () => {
    setIsCardModalOpen(false);
    setEditingCard(undefined);
    setNewCardColumnId('');
  };

  const renderContent = () => {
    switch (viewMode) {
      case 'calendar':
        return (
          <CalendarView
            cards={allCards}
            onCardClick={handleEditCard}
          />
        );
      case 'gantt':
        return (
          <GanttView
            cards={allCards}
            onCardClick={handleEditCard}
          />
        );
      case 'manual':
        return <ManualView />;
      default:
        return (
          <KanbanBoard
            columns={board.columns}
            onCardMove={moveCard}
            onCardEdit={handleEditCard}
            onCardDelete={handleDeleteCard}
            onWipLimitChange={updateWipLimit}
            onCardAdd={handleAddCard}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">오류: {error}</div>
      </div>
    );
  }

  return (
    <Layout
      viewMode={viewMode}
      onViewModeChange={setViewMode}
      onFilterToggle={() => setIsFilterOpen(true)}
      onAddCard={() => handleAddCard()}
    >
      {renderContent()}

      <FilterPanel
        filter={filter}
        users={board.users}
        labels={board.labels}
        isOpen={isFilterOpen}
        onFilterChange={setFilter}
        onClose={() => setIsFilterOpen(false)}
      />

      <CardModal
        card={editingCard}
        isOpen={isCardModalOpen}
        users={board.users}
        labels={board.labels}
        milestones={board.milestones}
        onSave={handleCardSave}
        onClose={handleCardModalClose}
        onCreateLabel={createLabel}
        onCreateMilestone={createMilestone}
      />
    </Layout>
  );
}