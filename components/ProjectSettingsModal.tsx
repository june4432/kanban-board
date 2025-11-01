import React, { useState, useEffect } from 'react';
import { Project, AuthUser, User } from '@/types';
import { X, Globe, Lock, Users, UserCheck, UserX, Clock, Settings, Save, UserPlus } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

interface ProjectSettingsModalProps {
  project: Project;
  currentUser: AuthUser;
  isOpen: boolean;
  onClose: () => void;
  onProjectUpdate: (updatedProject: Project) => void;
}

const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  project,
  currentUser,
  isOpen,
  onClose,
  onProjectUpdate
}) => {
  const [settings, setSettings] = useState({
    name: project.name,
    description: project.description || '',
    color: project.color || '#3b82f6',
    isPublic: project.isPublic || false
  });
  const [activeTab, setActiveTab] = useState<'general' | 'members' | 'requests'>('general');
  const [loading, setLoading] = useState(false);
  const [_users, setUsers] = useState<User[]>([]);
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
        isPublic: project.isPublic || false
      });
      
      // 사용자 목록 가져오기
      fetchUsers();
    }
  }, [project, isOpen]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
      console.error('Failed to fetch users:', error);
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
      const response = await fetch(`/api/projects/${project.projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...settings,
          userId: currentUser.id
        }),
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
      const response = await fetch(`/api/projects/${project.projectId}/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, userId: currentUser.id }),
      });

      if (response.ok) {
        const data = await response.json();
        onProjectUpdate(data.project);
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
      const response = await fetch(`/api/projects/${project.projectId}/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: currentUser.id }),
      });

      if (response.ok) {
        const data = await response.json();
        onProjectUpdate(data.project);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-card-foreground">프로젝트 설정</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 네비게이션 */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'general'
                ? 'border-primary text-primary bg-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            일반
          </button>
          <button
            onClick={() => setActiveTab('members')}
            className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'members'
                ? 'border-primary text-primary bg-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            멤버 ({project.members?.length || 0})
          </button>
          {isOwner && pendingRequests.length > 0 && (
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'requests'
                  ? 'border-primary text-primary bg-accent'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <UserPlus className="w-4 h-4 inline mr-2" />
              신청 ({pendingRequests.length})
            </button>
          )}
        </div>

        {/* 탭 내용 */}
        <div className="overflow-y-auto max-h-[60vh]">
          {activeTab === 'general' && (
            <div className="p-6 space-y-6">
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

          {/* 멤버 관리 탭 */}
          {activeTab === 'members' && (
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-card-foreground">프로젝트 멤버</h3>
                  <span className="text-sm text-muted-foreground">{project.members?.length || 0}명</span>
                </div>

                <div className="space-y-3">
                  {project.members?.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <img
                          src={member.avatar || '/default-avatar.png'}
                          alt={member.name}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-card-foreground">{member.name}</span>
                            {member.id === project.ownerId && (
                              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                소유자
                              </span>
                            )}
                          </div>
                          <span className="text-sm text-muted-foreground">{member.email}</span>
                        </div>
                      </div>
                      
                      {isOwner && member.id !== project.ownerId && member.id !== currentUser.id && (
                        <button
                          onClick={() => {
                            if (confirm(`${member.name}님을 프로젝트에서 제거하시겠습니까?`)) {
                              removeMember(member.id);
                            }
                          }}
                          className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                          title="멤버 제거"
                        >
                          <UserX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {(!project.members || project.members.length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      프로젝트 멤버가 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 가입 신청 관리 탭 */}
          {activeTab === 'requests' && isOwner && (
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-card-foreground">가입 신청</h3>
                  <span className="text-sm text-muted-foreground">{pendingRequests.length}건</span>
                </div>

                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div key={request.id} className="p-4 border border-border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <img
                            src={request.user.avatar || '/default-avatar.png'}
                            alt={request.user.name}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-card-foreground">{request.user.name}</span>
                              <Clock className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <span className="text-sm text-muted-foreground">{request.user.email}</span>
                            {request.message && (
                              <p className="text-sm text-card-foreground mt-1">{request.message}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleJoinRequestResponse(request.id, 'approve')}
                            className="flex items-center px-3 py-1 bg-success/10 text-success-foreground rounded-lg hover:bg-success/20 transition-colors"
                          >
                            <UserCheck className="w-4 h-4 mr-1" />
                            승인
                          </button>
                          <button
                            onClick={() => handleJoinRequestResponse(request.id, 'reject')}
                            className="flex items-center px-3 py-1 bg-destructive/10 text-destructive-foreground rounded-lg hover:bg-destructive/20 transition-colors"
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            거부
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {pendingRequests.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      대기 중인 가입 신청이 없습니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {activeTab === 'general' ? '취소' : '닫기'}
          </button>
          {activeTab === 'general' && (
            <button
              onClick={handleSave}
              disabled={loading || (!isOwner && !isMember)}
              className="flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2"></div>
              )}
              <Save className="w-4 h-4 mr-1.5" />
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectSettingsModal;