import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, ProjectProvider } from '@/contexts/ProjectContext';
import { useKanbanAPI } from '@/hooks/useKanbanAPI';
import GlobalWebSocketManager from '@/components/GlobalWebSocketManager';
import { useToast } from '@/contexts/ToastContext';
import ToastContainer from '@/components/ToastContainer';
import Layout from '@/components/Layout';
import FilterPanel from '@/components/FilterPanel';
import KanbanBoard from '@/components/KanbanBoard';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import ManualView from '@/components/ManualView';
import CardModal from '@/components/CardModal';
import ProjectSelector from '@/components/ProjectSelector';
import AuthModal from '@/components/AuthModal';
import ProjectQuickSettings from '@/components/ProjectQuickSettings';
import { Card, User, Project } from '@/types';

function KanbanApp() {
  const { user } = useAuth();
  const { currentProject, selectProject, createProject, projects, fetchProjects } = useProject();
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | undefined>();
  const [newCardColumnId, setNewCardColumnId] = useState<string>('');  
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users');
        const data = await response.json();
        setAllUsers(data.users || []);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, []);

  // 현재 프로젝트의 사용자 목록 (프로젝트 멤버들)
  const projectUsers = currentProject?.members || [];
  
  // hooks는 항상 같은 순서로 호출되어야 함
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
  } = useKanbanAPI(currentProject?.projectId, user);

  // 전역 WebSocket 이벤트 처리는 GlobalWebSocketManager에서 담당

  // 프로젝트가 선택되지 않았거나 프로젝트 선택기를 표시해야 할 때
  if (!currentProject || showProjectSelector) {
    return (
      <ProjectSelector
        user={user!}
        selectedProject={currentProject || undefined}
        onProjectSelect={(project) => {
          selectProject(project);
          setShowProjectSelector(false);
        }}
        onProjectCreate={createProject}
      />
    );
  }

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

  const handleProjectUpdate = (updatedProject: Project) => {
    selectProject(updatedProject);
    fetchProjects(); // 프로젝트 목록 새로고침
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
            users={allUsers}
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
      currentProject={currentProject}
      onProjectChange={() => setShowProjectSelector(true)}
      onProjectSettings={() => setIsProjectSettingsOpen(true)}
      allProjects={projects}
      onProjectSelect={selectProject}
    >
      {renderContent()}

      <FilterPanel
        filter={filter}
        users={allUsers}
        labels={board.labels}
        isOpen={isFilterOpen}
        onFilterChange={setFilter}
        onClose={() => setIsFilterOpen(false)}
      />

      <CardModal
        card={editingCard}
        isOpen={isCardModalOpen}
        users={allUsers}
        labels={board.labels}
        milestones={board.milestones}
        onSave={handleCardSave}
        onClose={handleCardModalClose}
        onCreateLabel={createLabel}
        onCreateMilestone={createMilestone}
      />

      <ProjectQuickSettings
        project={currentProject}
        currentUser={user!}
        isOpen={isProjectSettingsOpen}
        onClose={() => setIsProjectSettingsOpen(false)}
        onProjectUpdate={handleProjectUpdate}
      />
    </Layout>
  );
}

export default function Home() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">프로젝트 관리 보드</h1>
          <p className="text-gray-600 mb-6">로그인이 필요합니다.</p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            로그인 / 회원가입
          </button>
          <AuthModal 
            isOpen={showAuthModal} 
            onClose={() => setShowAuthModal(false)} 
          />
        </div>
      </div>
    );
  }

  return (
    <ProjectProvider user={user}>
      <GlobalWebSocketManager />
      <KanbanApp />
    </ProjectProvider>
  );
}