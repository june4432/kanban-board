import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '@/contexts/AuthContext';
import { useProject, ProjectProvider } from '@/contexts/ProjectContext';
import { useKanbanAPI } from '@/hooks/useKanbanAPI';
import GlobalWebSocketManager from '@/components/GlobalWebSocketManager';
import Layout from '@/components/Layout';
import FilterPanel from '@/components/FilterPanel';
import KanbanBoard from '@/components/KanbanBoard';
import CalendarView from '@/components/CalendarView';
import GanttView from '@/components/GanttView';
import TableView from '@/components/TableView';
import ManualView from '@/components/ManualView';
import DashboardView from '@/components/DashboardView';
import CardModal from '@/components/CardModal';
import AuthModal from '@/components/AuthModal';
import ProjectSettingsModal from '@/components/ProjectSettingsModal';
import { Card, User, Project } from '@/types';

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

function ProjectPage() {
  const router = useRouter();
  const { projectId } = router.query;
  const { user } = useAuth();
  const { currentProject, selectProject, projects, fetchProjects } = useProject();
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<Card | undefined>();
  const [newCardColumnId, setNewCardColumnId] = useState<string>('');
  const [isProjectSettingsOpen, setIsProjectSettingsOpen] = useState(false);
  const [projectSettingsTab, setProjectSettingsTab] = useState<'general' | 'members' | 'requests' | 'columns' | 'labels' | 'milestones' | 'invites' | 'integrations'>('general');
  const [allUsers, setAllUsers] = useState<User[]>([]);

  // URL의 projectId로 프로젝트 선택
  useEffect(() => {
    if (projectId && typeof projectId === 'string' && projects.length > 0) {
      const project = projects.find(p => p.projectId === projectId);
      if (project && (!currentProject || currentProject.projectId !== projectId)) {
        selectProject(project);
      } else if (!project) {
        // 프로젝트를 찾을 수 없으면 홈으로 리다이렉트
        router.replace('/');
      }
    }
  }, [projectId, projects, currentProject, selectProject, router]);

  // 사용자 정보 가져오기
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/v1/users');
        const responseData = await response.json();
        const users = responseData.data?.users || responseData.users || [];
        setAllUsers(users);
      } catch (error) {
        console.error('Failed to fetch users:', error);
      }
    };

    fetchUsers();
  }, []);

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
    createMilestone,
    reloadBoard
  } = useKanbanAPI(projectId as string, user);

  // URL 해시 기반 뷰 모드 유지
  const validViewModes = ['kanban', 'calendar', 'gantt', 'table', 'manual', 'dashboard'] as const;
  
  // 페이지 로드 시 해시에서 뷰 모드 읽기
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash.replace('#', '');
      if (hash && validViewModes.includes(hash as any) && hash !== viewMode) {
        setViewMode(hash as typeof viewMode);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setViewMode]);

  // 뷰 모드 변경 시 URL 해시 업데이트
  useEffect(() => {
    if (typeof window !== 'undefined' && viewMode) {
      const currentHash = window.location.hash.replace('#', '');
      if (currentHash !== viewMode) {
        window.history.replaceState(null, '', `#${viewMode}`);
      }
    }
  }, [viewMode]);

  // 브라우저 뒤로/앞으로 버튼 처리
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && validViewModes.includes(hash as any) && hash !== viewMode) {
        setViewMode(hash as typeof viewMode);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [viewMode, setViewMode]);

  // 모든 카드에 컬럼 정보 추가 (status 표시용)
  const allCards = board.columns.flatMap(column =>
    column.cards.map(card => ({
      ...card,
      status: column.title
    }))
  );

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
    fetchProjects();
  };

  const handleProjectSelect = (project: Project) => {
    // 현재 뷰 모드를 유지하면서 프로젝트 이동
    router.push(`/${project.projectId}#${viewMode}`);
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
      case 'table':
        return (
          <TableView
            cards={allCards}
            users={allUsers}
            onCardClick={handleEditCard}
          />
        );
      case 'manual':
        return <ManualView />;
      case 'dashboard':
        return <DashboardView projectId={projectId as string} />;
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

  if (!projectId || loading) {
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

  if (!currentProject) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">프로젝트를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>{currentProject.name} - 프로젝트 관리 보드</title>
      </Head>
      <Layout
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onFilterToggle={() => setIsFilterOpen(true)}
        currentProject={currentProject}
        onProjectChange={() => router.push('/')}
        onProjectSettings={() => setIsProjectSettingsOpen(true)}
        allProjects={projects}
        onProjectSelect={handleProjectSelect}
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

        <ProjectSettingsModal
          project={currentProject}
          currentUser={user!}
          isOpen={isProjectSettingsOpen}
          onClose={() => {
            setIsProjectSettingsOpen(false);
            setProjectSettingsTab('general');
          }}
          onProjectUpdate={handleProjectUpdate}
          onBoardUpdate={reloadBoard}
          activeTab={projectSettingsTab}
          onTabChange={setProjectSettingsTab}
        />
      </Layout>
    </>
  );
}

export default function ProjectPageWrapper() {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <>
        <Head>
          <title>프로젝트 관리 보드</title>
        </Head>
        <div className="h-screen flex items-center justify-center">
          <div className="text-lg">로딩 중...</div>
        </div>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Head>
          <title>프로젝트 관리 보드</title>
        </Head>
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
      </>
    );
  }

  return (
    <ProjectProvider user={user}>
      <GlobalWebSocketManager />
      <ProjectPage />
    </ProjectProvider>
  );
}
