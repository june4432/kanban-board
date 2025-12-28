import React, { useState, useEffect } from 'react';
import { Project, AuthUser, User, Column, Milestone, Label } from '@/types';
import { X, Globe, Lock, Users, UserCheck, UserX, Clock, Settings, Save, UserPlus, Columns, Plus, Trash2, Edit3, Bell, GripVertical, Link, Copy, Calendar, Hash, Tag, Target } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ProjectSettingsModalProps {
  project: Project;
  currentUser: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdate: (updatedProject: Project) => void;
  onBoardUpdate?: () => void;
  activeTab: 'general' | 'members' | 'requests' | 'columns' | 'invites' | 'integrations' | 'milestones' | 'labels';
  onTabChange: (tab: 'general' | 'members' | 'requests' | 'columns' | 'invites' | 'integrations' | 'milestones' | 'labels') => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  project,
  currentUser,
  isOpen,
  onClose,
  onProjectUpdate,
  onBoardUpdate,
  activeTab,
  onTabChange
}) => {
  const [settings, setSettings] = useState({
    name: project.name,
    description: project.description || '',
    color: project.color || '#3b82f6',
    isPublic: project.isPublic || false,
    slackWebhookUrl: project.slackWebhookUrl || '',
    slackEnabled: project.slackEnabled || false
  });
  const [loading, setLoading] = useState(false);
  const [_users, setUsers] = useState<User[]>([]);
  const [columns, setColumns] = useState<Column[]>([]);
  const [loadingColumns, setLoadingColumns] = useState(false);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  const [wipLimits, setWipLimits] = useState<Record<string, number>>({});
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnWipLimit, setNewColumnWipLimit] = useState(5);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [newInviteExpiresIn, setNewInviteExpiresIn] = useState<number | null>(null);
  const [newInviteMaxUses, setNewInviteMaxUses] = useState<number | null>(null);
  
  
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loadingMilestones, setLoadingMilestones] = useState(false);
  const [labels, setLabels] = useState<Label[]>([]);
  const [loadingLabels, setLoadingLabels] = useState(false);
  const [newMilestoneName, setNewMilestoneName] = useState('');
  const [newMilestoneDescription, setNewMilestoneDescription] = useState('');
  const [newMilestoneDueDate, setNewMilestoneDueDate] = useState('');
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#3b82f6');
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [editingMilestoneName, setEditingMilestoneName] = useState('');
  const [editingMilestoneDescription, setEditingMilestoneDescription] = useState('');
  const [editingMilestoneDueDate, setEditingMilestoneDueDate] = useState('');
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelName, setEditingLabelName] = useState('');
  const [editingLabelColor, setEditingLabelColor] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const { addToast } = useToast();

  // 프로젝트 소유자인지 확인
  const isOwner = project.ownerId === currentUser.id;
  const isMember = project.members?.some(member => member.id === currentUser.id);

  // 대기중인 가입 신청들
  const pendingRequests = project.pendingRequests?.filter(req => req.status === 'pending') || [];

  useEffect(() => {
    if (isOpen) {
      setSettings({
        name: project.name,
        description: project.description || '',
        color: project.color || '#3b82f6',
        isPublic: project.isPublic || false,
        slackWebhookUrl: project.slackWebhookUrl || '',
        slackEnabled: project.slackEnabled || false
      });

      // 사용자 목록 가져오기
      fetchUsers();
    }
  }, [project, isOpen]);

  // Fetch columns when columns tab is activated
  useEffect(() => {
    console.log('[DEBUG] useEffect - isOpen:', isOpen, 'activeTab:', activeTab, 'columns.length:', columns.length);
    if (isOpen && activeTab === 'columns' && columns.length === 0) {
      console.log('[DEBUG] Calling fetchColumns()');
      fetchColumns();
    }
  }, [isOpen, activeTab]);

  // Fetch invitations when invites tab is activated
  useEffect(() => {
    if (isOpen && activeTab === 'invites' && isOwner) {
      fetchInvitations();
    }
  }, [isOpen, activeTab, isOwner]);

  

  // Fetch milestones when milestones tab is activated
  useEffect(() => {
    if (isOpen && activeTab === 'milestones') {
      fetchMilestones();
    }
  }, [isOpen, activeTab]);

  // Fetch labels when labels tab is activated
  useEffect(() => {
    if (isOpen && activeTab === 'labels') {
      fetchLabels();
    }
  }, [isOpen, activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/v1/users');
      const responseData = await response.json();
      // V1 API returns { data: [...users], meta: {...} }
      setUsers(responseData.data || responseData.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchColumns = async () => {
    console.log('[DEBUG] fetchColumns called for projectId:', project.projectId);
    setLoadingColumns(true);
    try {
      const url = `/api/v1/projects/${project.projectId}/board`;
      console.log('[DEBUG] Fetching from URL:', url);
      const response = await fetch(url);
      console.log('[DEBUG] Response status:', response.status);
      const responseData = await response.json();
      console.log('[DEBUG] Response data:', responseData);
      // V1 API returns { data: { board }, meta: {...} }
      const board = responseData.data || responseData.board;
      if (board?.columns) {
        console.log('[DEBUG] Setting columns:', board.columns.length);
        setColumns(board.columns);
        // Initialize WIP limits
        const limits: Record<string, number> = {};
        board.columns.forEach((col: Column) => {
          limits[col.id] = col.wipLimit;
        });
        setWipLimits(limits);
        console.log('[DEBUG] WIP limits initialized:', limits);
      }
    } catch (error) {
      console.error('[DEBUG] Failed to fetch columns:', error);
      addToast({
        type: 'error',
        title: '컬럼 로드 실패',
        message: '컬럼 정보를 불러오는데 실패했습니다.',
        duration: 3000
      });
    } finally {
      setLoadingColumns(false);
    }
  };

  const fetchInvitations = async () => {
    setLoadingInvitations(true);
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/invites`);
      if (response.ok) {
        const data = await response.json();
        setInvitations(data.invitations || []);
      } else {
        throw new Error('초대 링크 목록을 불러오는데 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '로드 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 3000
      });
    } finally {
      setLoadingInvitations(false);
    }
  };

  const createInvitation = async () => {
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expiresIn: newInviteExpiresIn,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          type: 'success',
          title: '초대 링크 생성됨',
          message: '초대 링크가 성공적으로 생성되었습니다.',
          duration: 3000
        });
        setIsCreatingInvite(false);
        setNewInviteExpiresIn(null);
        setNewInviteMaxUses(null);
        fetchInvitations();

        // 자동으로 클립보드에 복사
        if (data.inviteUrl) {
          copyToClipboard(data.inviteUrl);
        }
      } else {
        throw new Error('초대 링크 생성에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '생성 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const deleteInvitation = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/invites/${inviteId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: '초대 링크 삭제됨',
          message: '초대 링크가 비활성화되었습니다.',
          duration: 3000
        });
        fetchInvitations();
      } else {
        throw new Error('초대 링크 삭제에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        type: 'success',
        title: '복사됨',
        message: '초대 링크가 클립보드에 복사되었습니다.',
        duration: 2000
      });
    } catch (error) {
      addToast({
        type: 'error',
        title: '복사 실패',
        message: '클립보드에 복사하는데 실패했습니다.',
        duration: 3000
      });
    }
  };

  // 사용자 검색
  const searchUsers = async (query: string) => {
    if (query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }

    setSearchingUsers(true);
    try {
      const response = await fetch(`/api/v1/users/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
      } else {
        throw new Error('사용자 검색에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '검색 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 3000
      });
    } finally {
      setSearchingUsers(false);
    }
  };

  // 사용자 초대
  const inviteUserToProject = async (userId: string, userName: string) => {
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/members/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: '초대 완료',
          message: `${userName}님을 프로젝트에 초대했습니다.`,
          duration: 3000
        });
        setUserSearchQuery('');
        setUserSearchResults([]);
        // 프로젝트 정보 새로고침을 위해 부모 컴포넌트에 알림
        fetchUsers();
      } else {
        const error = await response.json();
        throw new Error(error.error || '초대에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '초대 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 3000
      });
    }
  };

  const handleSave = async () => {
    if (!isOwner && !isMember) {
      addToast({
        type: 'error',
        title: '권한 없음',
        message: '프로젝트 설정을 변경할 권한이 없습니다.',
        duration: 3000
      });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        const data = await response.json();
        onProjectUpdate(data.project);
        addToast({
          type: 'success',
          title: '설정 저장',
          message: '프로젝트 설정이 저장되었습니다.',
          duration: 3000
        });
        onClose();
      } else {
        throw new Error('프로젝트 설정 저장에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '저장 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleJoinRequestResponse = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/join-requests/${requestId}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        // V1 API returns { data: { project }, meta: {...} }
        const updatedProject = responseData.data?.project || responseData.project;
        if (updatedProject) {
          onProjectUpdate(updatedProject);
        }
        addToast({
          type: 'success',
          title: action === 'approve' ? '가입 승인' : '가입 거부',
          message: `가입 신청이 ${action === 'approve' ? '승인' : '거부'}되었습니다.`,
          duration: 3000
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '처리 실패',
        message: '가입 신청 처리 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const removeMember = async (memberId: string) => {
    if (!isOwner) {
      addToast({
        type: 'error',
        title: '권한 없음',
        message: '프로젝트 소유자만 멤버를 제거할 수 있습니다.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const responseData = await response.json();
        // V1 API returns { data: { project }, meta: {...} }
        const updatedProject = responseData.data?.project || responseData.project;
        if (updatedProject) {
          onProjectUpdate(updatedProject);
        }
        addToast({
          type: 'success',
          title: '멤버 제거',
          message: '멤버가 프로젝트에서 제거되었습니다.',
          duration: 3000
        });
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '제거 실패',
        message: '멤버 제거 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  

  const fetchMilestones = async () => {
    setLoadingMilestones(true);
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/board`);
      if (response.ok) {
        const responseData = await response.json();
        // V1 API returns { data: { board }, meta: {...} }
        const board = responseData.data || responseData.board;
        setMilestones(board?.milestones || []);
      }
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
      addToast({
        type: 'error',
        title: '로드 실패',
        message: '마일스톤 목록을 불러오는데 실패했습니다.',
        duration: 3000
      });
    } finally {
      setLoadingMilestones(false);
    }
  };

  const fetchLabels = async () => {
    setLoadingLabels(true);
    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/board`);
      if (response.ok) {
        const responseData = await response.json();
        // V1 API returns { data: { board }, meta: {...} }
        const board = responseData.data || responseData.board;
        setLabels(board?.labels || []);
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error);
      addToast({
        type: 'error',
        title: '로드 실패',
        message: '라벨 목록을 불러오는데 실패했습니다.',
        duration: 3000
      });
    } finally {
      setLoadingLabels(false);
    }
  };

  const createMilestone = async () => {
    if (!newMilestoneName.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '마일스톤 이름을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    if (!newMilestoneDueDate) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '마감일을 선택해주세요.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/milestones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newMilestoneName.trim(),
          dueDate: newMilestoneDueDate, // YYYY-MM-DD format
          description: newMilestoneDescription.trim() || undefined,
          scope: 'project',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          type: 'success',
          title: '마일스톤 생성',
          message: '마일스톤이 성공적으로 생성되었습니다.',
          duration: 3000
        });
        setNewMilestoneName('');
        setNewMilestoneDescription('');
        setNewMilestoneDueDate('');
        // 새로 생성된 마일스톤을 로컬 상태에 추가 (전체 보드 리로드 방지)
        if (data.data?.milestone) {
          setMilestones(prev => [...prev, data.data.milestone]);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '마일스톤 생성에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '생성 실패',
        message: error.message || '마일스톤 생성 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const createLabel = async () => {
    if (!newLabelName.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '라벨 이름을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/labels`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newLabelName.trim(),
          color: newLabelColor,
          scope: 'project',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          type: 'success',
          title: '라벨 생성',
          message: '라벨이 성공적으로 생성되었습니다.',
          duration: 3000
        });
        setNewLabelName('');
        setNewLabelColor('#3b82f6');
        // 새로 생성된 라벨을 로컬 상태에 추가 (전체 보드 리로드 방지)
        if (data.data?.label) {
          setLabels(prev => [...prev, data.data.label]);
        }
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '라벨 생성에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '생성 실패',
        message: error.message || '라벨 생성 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const startEditingMilestone = (milestone: Milestone) => {
    setEditingMilestoneId(milestone.id);
    setEditingMilestoneName(milestone.name);
    setEditingMilestoneDescription(milestone.description || '');
    const date = new Date(milestone.dueDate);
    const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    setEditingMilestoneDueDate(localDate.toISOString().slice(0, 10));
  };

  const cancelEditingMilestone = () => {
    setEditingMilestoneId(null);
    setEditingMilestoneName('');
    setEditingMilestoneDescription('');
    setEditingMilestoneDueDate('');
  };

  const updateMilestone = async () => {
    if (!editingMilestoneId) return;

    if (!editingMilestoneName.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '마일스톤 이름을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    if (!editingMilestoneDueDate) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '마감일을 선택해주세요.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/milestones/${editingMilestoneId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingMilestoneName.trim(),
          dueDate: editingMilestoneDueDate, // YYYY-MM-DD format
          description: editingMilestoneDescription.trim() || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          type: 'success',
          title: '마일스톤 수정',
          message: '마일스톤이 성공적으로 수정되었습니다.',
          duration: 3000
        });
        cancelEditingMilestone();
        // 수정된 마일스톤을 로컬 상태에 반영 (전체 보드 리로드 방지)
        if (data.data?.milestone) {
          setMilestones(prev => prev.map(m => m.id === editingMilestoneId ? data.data.milestone : m));
        }
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '마일스톤 수정에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '수정 실패',
        message: error.message || '마일스톤 수정 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const deleteMilestone = async (milestoneId: string, milestoneName: string) => {
    if (!confirm(`"${milestoneName}" 마일스톤을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/milestones/${milestoneId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: '마일스톤 삭제',
          message: '마일스톤이 성공적으로 삭제되었습니다.',
          duration: 3000
        });
        // 삭제된 마일스톤을 로컬 상태에서 제거 (전체 보드 리로드 방지)
        setMilestones(prev => prev.filter(m => m.id !== milestoneId));
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '마일스톤 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: error.message || '마일스톤 삭제 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const startEditingLabel = (label: Label) => {
    setEditingLabelId(label.id);
    setEditingLabelName(label.name);
    setEditingLabelColor(label.color);
  };

  const cancelEditingLabel = () => {
    setEditingLabelId(null);
    setEditingLabelName('');
    setEditingLabelColor('');
  };

  const updateLabel = async () => {
    if (!editingLabelId) return;

    if (!editingLabelName.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '라벨 이름을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/labels/${editingLabelId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: editingLabelName.trim(),
          color: editingLabelColor,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        addToast({
          type: 'success',
          title: '라벨 수정',
          message: '라벨이 성공적으로 수정되었습니다.',
          duration: 3000
        });
        cancelEditingLabel();
        // 수정된 라벨을 로컬 상태에 반영 (전체 보드 리로드 방지)
        if (data.data?.label) {
          setLabels(prev => prev.map(l => l.id === editingLabelId ? data.data.label : l));
        }
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '라벨 수정에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '수정 실패',
        message: error.message || '라벨 수정 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const deleteLabel = async (labelId: string, labelName: string) => {
    if (!confirm(`"${labelName}" 라벨을 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/labels/${labelId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        addToast({
          type: 'success',
          title: '라벨 삭제',
          message: '라벨이 성공적으로 삭제되었습니다.',
          duration: 3000
        });
        // 삭제된 라벨을 로컬 상태에서 제거 (전체 보드 리로드 방지)
        setLabels(prev => prev.filter(l => l.id !== labelId));
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || '라벨 삭제에 실패했습니다.');
      }
    } catch (error: any) {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: error.message || '라벨 삭제 중 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const handleWipLimitChange = (columnId: string, value: string) => {
    const newLimit = parseInt(value) || 0;
    setWipLimits(prev => ({ ...prev, [columnId]: newLimit }));
  };

  const saveWipLimit = async (columnId: string) => {
    console.log(`[DEBUG] saveWipLimit called for columnId: ${columnId}`);

    if (!isOwner && !isMember) {
      console.log('[DEBUG] Permission denied - not owner or member');
      addToast({
        type: 'error',
        title: '권한 없음',
        message: '컬럼을 수정할 권한이 없습니다.',
        duration: 3000
      });
      return;
    }

    const newLimit = wipLimits[columnId];
    const originalColumn = columns.find(col => col.id === columnId);

    console.log(`[DEBUG] newLimit=${newLimit}, originalWipLimit=${originalColumn?.wipLimit}`);

    // newLimit이 undefined이면 저장하지 않음
    if (newLimit === undefined) {
      console.log('[DEBUG] newLimit is undefined, skipping save');
      return;
    }

    // 값이 변경되지 않았으면 API 호출 안 함
    if (originalColumn && originalColumn.wipLimit === newLimit) {
      console.log('[DEBUG] No change detected, skipping save');
      return;
    }

    console.log(`[DEBUG] Saving WIP limit for column ${columnId}: ${newLimit}`);

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          wipLimit: newLimit,
          userId: currentUser.id
        }),
      });

      console.log('API response:', response.status);

      if (response.ok) {
        // Update local state
        setColumns(prev =>
          prev.map(col =>
            col.id === columnId ? { ...col, wipLimit: newLimit } : col
          )
        );
        addToast({
          type: 'success',
          title: 'WIP 제한 업데이트',
          message: 'WIP 제한이 성공적으로 업데이트되었습니다.',
          duration: 3000
        });
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.error || 'WIP 제한 업데이트에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to update WIP limit:', error);
      // 에러 발생 시 원래 값으로 복구
      if (originalColumn) {
        setWipLimits(prev => ({ ...prev, [columnId]: originalColumn.wipLimit }));
      }
      addToast({
        type: 'error',
        title: '업데이트 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const startEditingColumnTitle = (columnId: string, currentTitle: string) => {
    setEditingColumnId(columnId);
    setEditingColumnTitle(currentTitle);
  };

  const saveColumnTitle = async (columnId: string) => {
    if (!editingColumnTitle.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '컬럼 제목을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/columns/${columnId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editingColumnTitle,
          userId: currentUser.id
        }),
      });

      if (response.ok) {
        setColumns(prev =>
          prev.map(col =>
            col.id === columnId ? { ...col, title: editingColumnTitle } : col
          )
        );
        setEditingColumnId(null);
        setEditingColumnTitle('');
        addToast({
          type: 'success',
          title: '컬럼 제목 업데이트',
          message: '컬럼 제목이 성공적으로 변경되었습니다.',
          duration: 3000
        });
      } else {
        throw new Error('컬럼 제목 업데이트에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '업데이트 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const startAddingColumn = () => {
    if (!isOwner && !isMember) {
      addToast({
        type: 'error',
        title: '권한 없음',
        message: '컬럼을 추가할 권한이 없습니다.',
        duration: 3000
      });
      return;
    }
    setIsAddingColumn(true);
    setNewColumnTitle('');
    setNewColumnWipLimit(5);
  };

  const cancelAddingColumn = () => {
    setIsAddingColumn(false);
    setNewColumnTitle('');
    setNewColumnWipLimit(5);
  };

  const saveNewColumn = async () => {
    if (!newColumnTitle.trim()) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: '컬럼 제목을 입력해주세요.',
        duration: 3000
      });
      return;
    }

    if (isNaN(newColumnWipLimit) || newColumnWipLimit < 0) {
      addToast({
        type: 'error',
        title: '입력 오류',
        message: 'WIP 제한은 0 이상의 숫자여야 합니다.',
        duration: 3000
      });
      return;
    }

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newColumnTitle.trim(),
          wipLimit: newColumnWipLimit,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.board?.columns) {
          setColumns(data.board.columns);
          // Update WIP limits state
          const limits: Record<string, number> = {};
          data.board.columns.forEach((col: Column) => {
            limits[col.id] = col.wipLimit;
          });
          setWipLimits(limits);
        }
        addToast({
          type: 'success',
          title: '컬럼 추가됨',
          message: `"${newColumnTitle}" 컬럼이 성공적으로 추가되었습니다.`,
          duration: 3000
        });
        setIsAddingColumn(false);
        setNewColumnTitle('');
        setNewColumnWipLimit(5);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '컬럼 추가에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '추가 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const deleteColumn = async (columnId: string, columnTitle: string) => {
    if (!isOwner && !isMember) {
      addToast({
        type: 'error',
        title: '권한 없음',
        message: '컬럼을 삭제할 권한이 없습니다.',
        duration: 3000
      });
      return;
    }

    const confirmed = confirm(
      `"${columnTitle}" 컬럼을 삭제하시겠습니까?\n\n주의: 이 컬럼에 카드가 있으면 삭제할 수 없습니다.`
    );

    if (!confirmed) return;

    try {
      const response = await fetch(`/api/v1/projects/${project.projectId}/columns/${columnId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.board?.columns) {
          setColumns(data.board.columns);
          // Update WIP limits state
          const limits: Record<string, number> = {};
          data.board.columns.forEach((col: Column) => {
            limits[col.id] = col.wipLimit;
          });
          setWipLimits(limits);
        }
        addToast({
          type: 'success',
          title: '컬럼 삭제됨',
          message: `"${columnTitle}" 컬럼이 성공적으로 삭제되었습니다.`,
          duration: 3000
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || '컬럼 삭제에 실패했습니다.');
      }
    } catch (error) {
      addToast({
        type: 'error',
        title: '삭제 실패',
        message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
        duration: 5000
      });
    }
  };

  const handleColumnDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination } = result;
    if (source.index === destination.index) return;

    // 로컬에서 먼저 순서 변경 (optimistic update)
    const newColumns = Array.from(columns);
    const [removed] = newColumns.splice(source.index, 1);
    if (!removed) return; // 드래그된 아이템이 없으면 early return
    newColumns.splice(destination.index, 0, removed);

    // position 업데이트
    const updatedColumns = newColumns.map((col, index) => ({
      ...col,
      position: index
    }));

    setColumns(updatedColumns);

    // 서버에 업데이트
    try {
      const columnUpdates = updatedColumns.map((col, index) => ({
        id: col.id,
        position: index
      }));

      const response = await fetch(`/api/v1/projects/${project.projectId}/columns/reorder`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ columnUpdates }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.board?.columns) {
          setColumns(data.board.columns);
        }
        addToast({
          type: 'success',
          title: '순서 변경',
          message: '컬럼 순서가 성공적으로 변경되었습니다.',
          duration: 2000
        });
        // 메인 칸반 보드 새로고침
        if (onBoardUpdate) {
          onBoardUpdate();
        }
      } else {
        throw new Error('Failed to reorder columns');
      }
    } catch (error) {
      // 실패 시 원래 순서로 복구
      setColumns(columns);
      addToast({
        type: 'error',
        title: '순서 변경 실패',
        message: '컬럼 순서 변경 중 오류가 발생했습니다.',
        duration: 3000
      });
    }
  };

  // 모달이 닫힐 때 상태 초기화
  useEffect(() => {
    if (!isOpen) {
      setInvitations([]);
      setIsCreatingInvite(false);
      setNewInviteExpiresIn(null);
      setNewInviteMaxUses(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-0 sm:p-4" onMouseDown={onClose}>
      <div className="bg-card border border-border rounded-none sm:rounded-xl shadow-xl w-full max-w-2xl h-full sm:h-auto sm:max-h-[90vh] overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border">
          <h2 className="text-lg sm:text-xl font-semibold text-card-foreground">프로젝트 설정</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 -mr-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-border overflow-x-auto overflow-y-hidden">
          <button
            onClick={() => onTabChange('general')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'general'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
            <span>일반</span>
          </button>
          <button
            onClick={() => onTabChange('columns')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'columns'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Columns className="w-4 h-4 flex-shrink-0" />
            <span>컬럼</span>
          </button>
          <button
            onClick={() => onTabChange('members')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'members'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Users className="w-4 h-4 flex-shrink-0" />
            <span>멤버</span>
            <span className="text-xs">({project.members?.length || 0})</span>
          </button>
          {isOwner && pendingRequests.length > 0 && (
            <button
              onClick={() => onTabChange('requests')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'requests'
                ? 'border-primary text-primary bg-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <UserPlus className="w-4 h-4 flex-shrink-0" />
              <span>신청</span>
              <span className="text-xs">({pendingRequests.length})</span>
            </button>
          )}
          {isOwner && (
            <button
              onClick={() => onTabChange('invites')}
              className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'invites'
                ? 'border-primary text-primary bg-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
            >
              <Link className="w-4 h-4 flex-shrink-0" />
              <span>초대</span>
            </button>
          )}
          <button
            onClick={() => onTabChange('integrations')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'integrations'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Bell className="w-4 h-4 flex-shrink-0" />
            <span>통합</span>
          </button>
          <button
            onClick={() => onTabChange('milestones')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'milestones'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Target className="w-4 h-4 flex-shrink-0" />
            <span>마일스톤</span>
          </button>
          <button
            onClick={() => onTabChange('labels')}
            className={`flex items-center justify-center gap-1.5 px-3 sm:px-6 py-3 font-medium text-xs sm:text-sm border-b-2 transition-colors whitespace-nowrap ${activeTab === 'labels'
              ? 'border-primary text-primary bg-accent'
              : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
          >
            <Tag className="w-4 h-4 flex-shrink-0" />
            <span>라벨</span>
          </button>
        </div>

        {/* 탭 내용 */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 240px)' }}>
          {activeTab === 'general' && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* 권한 표시 */}
              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {isOwner ? '프로젝트 소유자' : isMember ? '프로젝트 멤버' : '권한 없음'}
                  </span>
                </div>
                {!isOwner && (
                  <p className="text-xs text-muted-foreground mt-1">
                    일부 설정은 프로젝트 소유자만 변경할 수 있습니다.
                  </p>
                )}
              </div>

              {/* 프로젝트 이름 */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  프로젝트 이름
                </label>
                <input
                  type="text"
                  value={settings.name}
                  onChange={(e) => setSettings(prev => ({ ...prev, name: e.target.value }))}
                  disabled={!isOwner}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground"
                  placeholder="프로젝트 이름을 입력하세요"
                />
              </div>

              {/* 프로젝트 설명 */}
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">
                  설명
                </label>
                <textarea
                  value={settings.description}
                  onChange={(e) => setSettings(prev => ({ ...prev, description: e.target.value }))}
                  disabled={!isOwner && !isMember}
                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground"
                  rows={3}
                  placeholder="프로젝트 설명을 입력하세요"
                />
              </div>

              {/* 색상 (소유자만) */}
              {isOwner && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-2">
                    프로젝트 색상
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={settings.color}
                      onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                      className="w-10 h-10 rounded border border-border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground">{settings.color}</span>
                  </div>
                </div>
              )}

              {/* 공개 설정 (소유자만) */}
              {isOwner && (
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-3">
                    프로젝트 공개 설정
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={!settings.isPublic}
                        onChange={() => setSettings(prev => ({ ...prev, isPublic: false }))}
                        className="text-primary focus:ring-primary border-border"
                      />
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-card-foreground">비공개</div>
                        <div className="text-xs text-muted-foreground">초대된 멤버만 접근 가능</div>
                      </div>
                    </label>
                    <label className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="visibility"
                        checked={settings.isPublic}
                        onChange={() => setSettings(prev => ({ ...prev, isPublic: true }))}
                        className="text-primary focus:ring-primary border-border"
                      />
                      <Globe className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm font-medium text-card-foreground">공개</div>
                        <div className="text-xs text-muted-foreground">누구나 찾아서 참여 신청 가능</div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 컬럼 관리 탭 */}
          {activeTab === 'columns' && (
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-card-foreground">컬럼 관리</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      컬럼 제목과 WIP(Work In Progress) 제한을 설정하세요
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {loadingColumns && (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    )}
                    {(isOwner || isMember) && !loadingColumns && !isAddingColumn && (
                      <button
                        onClick={startAddingColumn}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
                      >
                        <Plus className="w-4 h-4" />
                        <span>컬럼 추가</span>
                      </button>
                    )}
                  </div>
                </div>

                {loadingColumns ? (
                  <div className="text-center py-8 text-muted-foreground">
                    컬럼 정보를 불러오는 중...
                  </div>
                ) : (
                  <DragDropContext onDragEnd={handleColumnDragEnd}>
                    <Droppable droppableId="columns">
                      {(provided) => (
                        <div
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                          className="space-y-3"
                        >
                          {columns.map((column, index) => {
                            const hasChanged = wipLimits[column.id] !== undefined && wipLimits[column.id] !== column.wipLimit;
                            console.log(`[DEBUG] Column ${column.id}: current=${column.wipLimit}, new=${wipLimits[column.id]}, hasChanged=${hasChanged}`);
                            return (
                              <Draggable key={column.id} draggableId={column.id} index={index}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`p-3 sm:p-4 bg-muted rounded-lg border border-border hover:border-primary/50 transition-colors ${snapshot.isDragging ? 'shadow-lg ring-2 ring-primary' : ''
                                      }`}
                                  >
                                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 flex-1 min-w-0">
                                        {/* Drag Handle */}
                                        <div
                                          {...provided.dragHandleProps}
                                          className="flex-shrink-0 pt-1 sm:pt-2 cursor-grab active:cursor-grabbing"
                                        >
                                          <GripVertical className="w-5 h-5 text-muted-foreground hover:text-foreground" />
                                        </div>

                                        {/* 컬럼 제목 */}
                                        <div className="flex-1 min-w-0">
                                          {editingColumnId === column.id ? (
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                              <input
                                                type="text"
                                                value={editingColumnTitle}
                                                onChange={(e) => setEditingColumnTitle(e.target.value)}
                                                onKeyDown={(e) => {
                                                  if (e.key === 'Enter') {
                                                    saveColumnTitle(column.id);
                                                  } else if (e.key === 'Escape') {
                                                    setEditingColumnId(null);
                                                    setEditingColumnTitle('');
                                                  }
                                                }}
                                                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm"
                                                autoFocus
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => saveColumnTitle(column.id)}
                                                  className="flex-1 sm:flex-none px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                                                >
                                                  저장
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingColumnId(null);
                                                    setEditingColumnTitle('');
                                                  }}
                                                  className="flex-1 sm:flex-none px-3 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80"
                                                >
                                                  취소
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <h4 className="font-medium text-card-foreground text-sm sm:text-base">{column.title}</h4>
                                                {(isOwner || isMember) && (
                                                  <button
                                                    onClick={() => startEditingColumnTitle(column.id, column.title)}
                                                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-accent rounded"
                                                    title="제목 수정"
                                                  >
                                                    <Edit3 className="w-3 h-3 sm:w-4 sm:h-4" />
                                                  </button>
                                                )}
                                              </div>
                                              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                                카드: {column.cards?.length || 0}개 • 순서: {index + 1}
                                              </p>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* WIP 제한 */}
                                      <div className="flex items-center gap-2 self-start">
                                        <label className="text-xs sm:text-sm font-medium text-card-foreground whitespace-nowrap">
                                          WIP:
                                        </label>
                                        <input
                                          type="number"
                                          min="0"
                                          value={wipLimits[column.id] ?? column.wipLimit}
                                          onChange={(e) => handleWipLimitChange(column.id, e.target.value)}
                                          disabled={!isOwner && !isMember}
                                          className="w-16 sm:w-20 px-2 sm:px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed text-foreground text-center text-sm"
                                        />
                                        {hasChanged && (
                                          <button
                                            onClick={() => {
                                              console.log(`[DEBUG] Save button clicked for column ${column.id}`);
                                              saveWipLimit(column.id);
                                            }}
                                            className="px-2 sm:px-3 py-1.5 sm:py-1 text-xs sm:text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 whitespace-nowrap"
                                          >
                                            저장
                                          </button>
                                        )}
                                      </div>
                                    </div>

                                    {/* WIP 경고 */}
                                    {column.wipLimit > 0 && column.cards && column.cards.length >= column.wipLimit && (
                                      <div className="flex items-center space-x-2 p-2 mt-3 bg-destructive/10 text-destructive-foreground rounded-md text-sm border border-destructive/20">
                                        <Settings className="w-4 h-4" />
                                        <span>WIP 제한에 도달했습니다!</span>
                                      </div>
                                    )}

                                    {/* 컬럼 삭제 */}
                                    {(isOwner || isMember) && (
                                      <div className="flex justify-end mt-3 pt-3 border-t border-border">
                                        <button
                                          onClick={() => deleteColumn(column.id, column.title)}
                                          className="flex items-center space-x-2 px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                          title="컬럼 삭제"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          <span>삭제</span>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}

                          {columns.length === 0 && !isAddingColumn && (
                            <div className="text-center py-8 text-muted-foreground">
                              컬럼이 없습니다.
                            </div>
                          )}

                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>

                    {/* 인라인 컬럼 추가 폼 */}
                    {isAddingColumn && (
                      <div className="p-4 bg-accent rounded-lg border-2 border-primary">
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-card-foreground mb-2">
                              컬럼 제목
                            </label>
                            <input
                              type="text"
                              value={newColumnTitle}
                              onChange={(e) => setNewColumnTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  saveNewColumn();
                                } else if (e.key === 'Escape') {
                                  cancelAddingColumn();
                                }
                              }}
                              placeholder="새 컬럼의 제목을 입력하세요"
                              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                              autoFocus
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-card-foreground mb-2">
                              WIP 제한 (0 = 무제한)
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={newColumnWipLimit}
                              onChange={(e) => setNewColumnWipLimit(parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                            />
                          </div>

                          <div className="flex flex-col sm:flex-row items-center gap-2">
                            <button
                              onClick={saveNewColumn}
                              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                              저장
                            </button>
                            <button
                              onClick={cancelAddingColumn}
                              className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                            >
                              취소
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </DragDropContext>
                )}

                {!isOwner && !isMember && (
                  <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                    컬럼 설정을 변경할 권한이 없습니다.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 멤버 관리 탭 */}
          {activeTab === 'members' && (
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-medium text-card-foreground">프로젝트 멤버</h3>
                  <span className="text-sm text-muted-foreground">{project.members?.length || 0}명</span>
                </div>

                <div className="space-y-3">
                  {project.members?.map((member) => (
                    <div key={member.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3 min-w-0 flex-1">
                        <img
                          src={member.avatar || '/default-avatar.png'}
                          alt={member.name}
                          className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-card-foreground text-sm sm:text-base truncate">{member.name}</span>
                            {member.id === project.ownerId && (
                              <span className="px-2 py-0.5 text-xs bg-primary/10 text-primary rounded-full whitespace-nowrap">
                                소유자
                              </span>
                            )}
                          </div>
                          <span className="text-xs sm:text-sm text-muted-foreground truncate block">{member.email}</span>
                        </div>
                      </div>

                      {isOwner && member.id !== project.ownerId && member.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            if (confirm(`${member.name}님을 프로젝트에서 제거하시겠습니까?`)) {
                              removeMember(member.id);
                            }
                          }}
                          className="self-end sm:self-auto px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2 w-full sm:w-auto justify-center"
                          title="멤버 제거"
                        >
                          <UserX className="w-4 h-4" />
                          <span className="sm:hidden">제거</span>
                        </button>
                      )}
                    </div>
                  ))}

                  {(!project.members || project.members.length === 0) && (
                    <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                      프로젝트 멤버가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 가입 신청 관리 탭 */}
          {activeTab === 'requests' && isOwner && (
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-medium text-card-foreground">가입 신청</h3>
                  <span className="text-sm text-muted-foreground">{pendingRequests.length}건</span>
                </div>

                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-3 sm:p-4 border border-border rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <img
                            src={request.user.avatar || '/default-avatar.png'}
                            alt={request.user.name}
                            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-2 flex-wrap">
                              <span className="font-medium text-card-foreground text-sm sm:text-base">{request.user.name}</span>
                              <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground flex-shrink-0" />
                            </div>
                            <span className="text-xs sm:text-sm text-muted-foreground block truncate">{request.user.email}</span>
                            {request.message && (
                              <p className="text-xs sm:text-sm text-card-foreground mt-2 p-2 bg-muted rounded">{request.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleJoinRequestResponse(request.id, 'approve')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm bg-success/10 text-success-foreground rounded-lg hover:bg-success/20 transition-colors"
                          >
                            <UserCheck className="w-4 h-4" />
                            <span>승인</span>
                          </button>
                          <button
                            onClick={() => handleJoinRequestResponse(request.id, 'reject')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-sm bg-destructive/10 text-destructive-foreground rounded-lg hover:bg-destructive/20 transition-colors"
                          >
                            <UserX className="w-4 h-4" />
                            <span>거부</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingRequests.length === 0 && (
                    <div className="text-center py-8 text-sm sm:text-base text-muted-foreground">
                      대기 중인 가입 신청이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 초대 링크 관리 탭 */}
          {activeTab === 'invites' && isOwner && (
            <div className="p-4 sm:p-6">
              <div className="space-y-6">
                {/* 사용자 검색 및 직접 초대 섹션 */}
                <div className="space-y-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-card-foreground">사용자 초대</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      이메일이나 이름으로 사용자를 검색하여 초대하세요
                    </p>
                  </div>

                  {/* 검색 입력 - 드롭다운 형태 */}
                  <div className="relative">
                    <input
                      type="text"
                      value={userSearchQuery}
                      onChange={(e) => {
                        setUserSearchQuery(e.target.value);
                        searchUsers(e.target.value);
                      }}
                      placeholder="사용자 이메일 또는 이름 검색..."
                      className="w-full px-4 py-2.5 pl-10 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                    <Users className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2" />
                    {searchingUsers && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}

                    {/* 드롭다운 검색 결과 */}
                    {userSearchQuery.length >= 2 && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                        {searchingUsers ? (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            검색 중...
                          </div>
                        ) : userSearchResults.length > 0 ? (
                          <div className="divide-y divide-border">
                            {userSearchResults.map((user) => {
                              const isAlreadyMember = project.members?.some(m => m.id === user.id);
                              return (
                                <div
                                  key={user.id}
                                  className="p-3 flex items-center justify-between hover:bg-accent transition-colors"
                                >
                                  <div className="flex items-center gap-3 flex-1 min-w-0">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="font-medium text-card-foreground truncate">{user.name}</div>
                                      <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                                    </div>
                                  </div>
                                  {isAlreadyMember ? (
                                    <span className="text-xs text-muted-foreground">이미 멤버</span>
                                  ) : (
                                    <button
                                      onClick={() => inviteUserToProject(user.id, user.name)}
                                      className="px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors flex items-center gap-1"
                                    >
                                      <UserPlus className="w-3 h-3" />
                                      초대
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="p-4 text-center text-muted-foreground text-sm">
                            검색 결과가 없습니다
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 구분선 */}
                <div className="border-t border-border"></div>

                {/* 초대 링크 생성 섹션 */}
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-card-foreground">초대 링크 관리</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      링크를 통해 팀원을 프로젝트에 초대하세요
                    </p>
                  </div>
                  {!isCreatingInvite && (
                    <button
                      onClick={() => setIsCreatingInvite(true)}
                      className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full sm:w-auto"
                    >
                      <Plus className="w-4 h-4" />
                      <span>새 링크 생성</span>
                    </button>
                  )}
                </div>

                {/* 새 초대 링크 생성 폼 */}
                {isCreatingInvite && (
                  <div className="p-4 bg-accent rounded-lg border-2 border-primary space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        <Calendar className="w-4 h-4 inline mr-1" />
                        만료 기간 (초)
                      </label>
                      <input
                        type="number"
                        value={newInviteExpiresIn || ''}
                        onChange={(e) => setNewInviteExpiresIn(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="비워두면 무제한 (예: 86400 = 1일)"
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        3600 = 1시간, 86400 = 1일, 604800 = 7일
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-card-foreground mb-2">
                        <Hash className="w-4 h-4 inline mr-1" />
                        최대 사용 횟수
                      </label>
                      <input
                        type="number"
                        value={newInviteMaxUses || ''}
                        onChange={(e) => setNewInviteMaxUses(e.target.value ? parseInt(e.target.value) : null)}
                        placeholder="비워두면 무제한"
                        className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:space-x-2">
                      <button
                        onClick={createInvitation}
                        className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        생성
                      </button>
                      <button
                        onClick={() => {
                          setIsCreatingInvite(false);
                          setNewInviteExpiresIn(null);
                          setNewInviteMaxUses(null);
                        }}
                        className="w-full sm:flex-1 px-4 py-2.5 sm:py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* 초대 링크 목록 */}
                {loadingInvitations ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    로딩 중...
                  </div>
                ) : (
                  <div className="space-y-3">
                    {invitations.map((invitation) => {
                      const inviteUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/invite/${invitation.invite_token}`;
                      const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date();
                      const isMaxedOut = invitation.max_uses && invitation.current_uses >= invitation.max_uses;
                      const isInactive = isExpired || isMaxedOut;

                      return (
                        <div
                          key={invitation.id}
                          className={`p-3 sm:p-4 rounded-lg border ${isInactive ? 'bg-muted/50 border-border/50' : 'bg-muted border-border'}`}
                        >
                          <div className="space-y-3">
                            {/* 초대 링크 URL */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                              <input
                                type="text"
                                value={inviteUrl}
                                readOnly
                                className="flex-1 px-3 py-2 bg-input border border-border rounded-lg text-xs sm:text-sm font-mono text-foreground min-w-0"
                              />
                              <button
                                onClick={() => copyToClipboard(inviteUrl)}
                                className="w-full sm:w-auto px-4 py-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors flex items-center justify-center gap-2"
                                title="복사"
                              >
                                <Copy className="w-4 h-4" />
                                <span className="sm:hidden">복사</span>
                              </button>
                            </div>

                            {/* 상태 정보 */}
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                                {invitation.expires_at ? (
                                  <span className={`flex items-center gap-1 ${isExpired ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    <span className="truncate">{isExpired ? '만료됨' : `${new Date(invitation.expires_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`}</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    무제한
                                  </span>
                                )}

                                {invitation.max_uses ? (
                                  <span className={`flex items-center gap-1 ${isMaxedOut ? 'text-destructive' : 'text-muted-foreground'}`}>
                                    <Hash className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    {invitation.current_uses} / {invitation.max_uses}회
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-muted-foreground">
                                    <Hash className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                                    {invitation.current_uses}회 사용
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => {
                                  if (confirm('이 초대 링크를 삭제하시겠습니까?')) {
                                    deleteInvitation(invitation.id);
                                  }
                                }}
                                className="self-start sm:self-auto px-3 py-1.5 text-sm text-destructive hover:bg-destructive/10 rounded-lg transition-colors flex items-center gap-2"
                                title="삭제"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="sm:hidden">삭제</span>
                              </button>
                            </div>

                            {/* 생성 정보 */}
                            <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                              <span className="block sm:inline">{invitation.created_by_name}</span>
                              <span className="hidden sm:inline"> • </span>
                              <span className="block sm:inline text-xs">{new Date(invitation.created_at).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {invitations.length === 0 && !isCreatingInvite && (
                      <div className="text-center py-8 text-muted-foreground">
                        생성된 초대 링크가 없습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 마일스톤 관리 탭 */}
          {activeTab === 'milestones' && (
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-card-foreground">마일스톤 관리</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      프로젝트의 주요 목표와 마감일을 설정하세요
                    </p>
                  </div>
                </div>

                {/* 마일스톤 생성 폼 */}
                <div className="p-4 bg-accent rounded-lg border border-border space-y-4">
                  <h4 className="font-medium text-card-foreground">새 마일스톤 추가</h4>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      마일스톤 이름 *
                    </label>
                    <input
                      type="text"
                      value={newMilestoneName}
                      onChange={(e) => setNewMilestoneName(e.target.value)}
                      placeholder="예: v1.0 출시"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      maxLength={100}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      마감일 *
                    </label>
                    <input
                      type="date"
                      value={newMilestoneDueDate}
                      onChange={(e) => setNewMilestoneDueDate(e.target.value)}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      설명 (선택)
                    </label>
                    <textarea
                      value={newMilestoneDescription}
                      onChange={(e) => setNewMilestoneDescription(e.target.value)}
                      placeholder="마일스톤 설명을 입력하세요"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      rows={3}
                      maxLength={500}
                    />
                  </div>

                  <button
                    onClick={createMilestone}
                    className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>마일스톤 추가</span>
                  </button>
                </div>

                {/* 마일스톤 목록 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-card-foreground">현재 마일스톤</h4>

                  {loadingMilestones ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      로딩 중...
                    </div>
                  ) : milestones.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      등록된 마일스톤이 없습니다.
                    </div>
                  ) : (
                    milestones.map((milestone) => {
                      const dueDate = new Date(milestone.dueDate);
                      const isOverdue = dueDate < new Date();
                      const isEditing = editingMilestoneId === milestone.id;

                      return (
                        <div key={milestone.id} className="p-4 bg-muted rounded-lg border border-border">
                          {isEditing ? (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm font-medium text-card-foreground mb-2">
                                  마일스톤 이름 *
                                </label>
                                <input
                                  type="text"
                                  value={editingMilestoneName}
                                  onChange={(e) => setEditingMilestoneName(e.target.value)}
                                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                  maxLength={100}
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-card-foreground mb-2">
                                  마감일 *
                                </label>
                                <input
                                  type="date"
                                  value={editingMilestoneDueDate}
                                  onChange={(e) => setEditingMilestoneDueDate(e.target.value)}
                                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-card-foreground mb-2">
                                  설명 (선택)
                                </label>
                                <textarea
                                  value={editingMilestoneDescription}
                                  onChange={(e) => setEditingMilestoneDescription(e.target.value)}
                                  className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                                  rows={3}
                                  maxLength={500}
                                />
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={updateMilestone}
                                  className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                                >
                                  저장
                                </button>
                                <button
                                  onClick={cancelEditingMilestone}
                                  className="flex-1 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h5 className="font-medium text-card-foreground">{milestone.name}</h5>
                                  {isOverdue && (
                                    <span className="px-2 py-0.5 text-xs bg-destructive/10 text-destructive rounded-full">
                                      기한 초과
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  마감: {dueDate.toLocaleDateString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </p>
                                {milestone.description && (
                                  <p className="text-sm text-card-foreground mt-2 p-2 bg-background rounded">
                                    {milestone.description}
                                  </p>
                                )}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEditingMilestone(milestone);
                                  }}
                                  className="p-2 text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                  title="수정"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    deleteMilestone(milestone.id, milestone.name);
                                  }}
                                  className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                  title="삭제"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 라벨 관리 탭 */}
          {activeTab === 'labels' && (
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-medium text-card-foreground">라벨 관리</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      카드를 분류하기 위한 라벨을 생성하세요
                    </p>
                  </div>
                </div>

                {/* 라벨 생성 폼 */}
                <div className="p-4 bg-accent rounded-lg border border-border space-y-4">
                  <h4 className="font-medium text-card-foreground">새 라벨 추가</h4>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      라벨 이름 *
                    </label>
                    <input
                      type="text"
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      placeholder="예: 버그, 기능, 긴급"
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                      maxLength={50}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      색상 *
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newLabelColor}
                        onChange={(e) => setNewLabelColor(e.target.value)}
                        className="w-16 h-10 rounded border border-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={newLabelColor}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                            setNewLabelColor(value);
                          }
                        }}
                        placeholder="#3b82f6"
                        className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-mono"
                        maxLength={7}
                      />
                    </div>
                  </div>

                  <button
                    onClick={createLabel}
                    className="w-full px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>라벨 추가</span>
                  </button>
                </div>

                {/* 라벨 목록 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-card-foreground">현재 라벨</h4>

                  {loadingLabels ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      로딩 중...
                    </div>
                  ) : labels.length === 0 ? (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      등록된 라벨이 없습니다.
                    </div>
                  ) : editingLabelId ? (
                    <div className="p-4 bg-accent rounded-lg border border-primary space-y-4">
                      <h4 className="font-medium text-card-foreground">라벨 수정</h4>

                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          라벨 이름 *
                        </label>
                        <input
                          type="text"
                          value={editingLabelName}
                          onChange={(e) => setEditingLabelName(e.target.value)}
                          className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          maxLength={50}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-card-foreground mb-2">
                          색상 *
                        </label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={editingLabelColor}
                            onChange={(e) => setEditingLabelColor(e.target.value)}
                            className="w-16 h-10 rounded border border-border cursor-pointer"
                          />
                          <input
                            type="text"
                            value={editingLabelColor}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                setEditingLabelColor(value);
                              }
                            }}
                            className="flex-1 px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground font-mono"
                            maxLength={7}
                          />
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={updateLabel}
                          className="flex-1 px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          저장
                        </button>
                        <button
                          onClick={cancelEditingLabel}
                          className="flex-1 px-4 py-2 text-sm bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {labels.map((label) => (
                        <div key={label.id} className="p-3 bg-muted rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded flex-shrink-0"
                              style={{ backgroundColor: label.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-card-foreground truncate">
                                {label.name}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                {label.color}
                              </div>
                            </div>
                            <div className="flex gap-1 flex-shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEditingLabel(label);
                                }}
                                className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                                title="수정"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  deleteLabel(label.id, label.name);
                                }}
                                className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 통합 관리 탭 */}
          {activeTab === 'integrations' && (
            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Slack 통합 */}
              <div>
                <div className="flex items-center space-x-2 mb-4">
                  <Bell className="w-5 h-5 text-muted-foreground" />
                  <h3 className="text-lg font-medium text-card-foreground">Slack 알림</h3>
                </div>

                <div className="bg-muted rounded-lg p-4 mb-4">
                  <p className="text-sm text-muted-foreground">
                    카드 생성, 이동, 수정, 삭제 시 Slack 채널로 알림을 받을 수 있습니다.
                  </p>
                </div>

                <div className="space-y-4">
                  {/* Slack 활성화 토글 */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <div className="font-medium text-card-foreground">Slack 알림 활성화</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        프로젝트 활동을 Slack으로 전송합니다
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.slackEnabled}
                        onChange={(e) => setSettings(prev => ({ ...prev, slackEnabled: e.target.checked }))}
                        disabled={!isOwner && !isMember}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-muted-foreground/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>

                  {/* Webhook URL */}
                  <div>
                    <label className="block text-sm font-medium text-card-foreground mb-2">
                      Slack Webhook URL
                    </label>
                    <input
                      type="url"
                      value={settings.slackWebhookUrl}
                      onChange={(e) => setSettings(prev => ({ ...prev, slackWebhookUrl: e.target.value }))}
                      disabled={!isOwner && !isMember}
                      className="w-full px-3 py-2 bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted disabled:cursor-not-allowed text-foreground placeholder:text-muted-foreground font-mono text-sm"
                      placeholder="https://hooks.slack.com/services/..."
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      Slack에서 Incoming Webhook을 생성하고 URL을 입력하세요.{' '}
                      <a
                        href="https://api.slack.com/messaging/webhooks"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        설정 방법 보기
                      </a>
                    </p>
                  </div>

                  {/* 알림 이벤트 안내 */}
                  <div className="bg-accent/50 rounded-lg p-4">
                    <div className="text-sm font-medium text-card-foreground mb-2">알림이 전송되는 이벤트:</div>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>카드 생성</li>
                      <li>카드 이동 (컬럼 변경)</li>
                      <li>카드 수정</li>
                      <li>카드 삭제</li>
                    </ul>
                  </div>

                  {!isOwner && !isMember && (
                    <div className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                      통합 설정을 변경할 권한이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-3 p-4 sm:p-6 border-t border-border bg-muted rounded-b-none sm:rounded-b-xl">
          <button
            onClick={onClose}
            className="order-2 sm:order-1 px-4 py-2.5 sm:py-2 text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors"
          >
            {(activeTab === 'general' || activeTab === 'integrations') ? '취소' : '닫기'}
          </button>
          {(activeTab === 'general' || activeTab === 'integrations') && (
            <button
              onClick={handleSave}
              disabled={loading || (!isOwner && !isMember)}
              className="order-1 sm:order-2 flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 text-sm sm:text-base bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
              )}
              <Save className="w-4 h-4" />
              <span>저장</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;