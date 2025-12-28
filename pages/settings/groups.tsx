import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { useGroup } from '@/contexts/GroupContext';
import { Plus, Users, Trash2, Edit2, ChevronRight, UserPlus, X } from 'lucide-react';

interface GroupMember {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string;
  role: 'admin' | 'member';
  joinedAt: string;
}

interface Group {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  color: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  members: GroupMember[];
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default function GroupsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { groups, loading: groupsLoading, createGroup, updateGroup, deleteGroup, addMember, removeMember, refreshGroups } = useGroup();
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#6366f1');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setError('그룹 이름을 입력해주세요');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        color: newGroupColor
      });
      setShowCreateModal(false);
      setNewGroupName('');
      setNewGroupDescription('');
      setNewGroupColor('#6366f1');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleUpdateGroup = async () => {
    if (!selectedGroup || !newGroupName.trim()) {
      setError('그룹 이름을 입력해주세요');
      return;
    }

    try {
      setProcessing(true);
      setError(null);
      await updateGroup(selectedGroup.id, {
        name: newGroupName.trim(),
        description: newGroupDescription.trim(),
        color: newGroupColor
      });
      setShowEditModal(false);
      setSelectedGroup(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteGroup = async (group: Group) => {
    if (!confirm(`'${group.name}' 그룹을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setProcessing(true);
      await deleteGroup(group.id);
      if (selectedGroup?.id === group.id) {
        setSelectedGroup(null);
      }
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedGroup || !newMemberEmail.trim()) {
      setError('이메일을 입력해주세요');
      return;
    }

    try {
      setProcessing(true);
      setError(null);

      // Find user by email
      const response = await fetch(`/api/v1/users?email=${encodeURIComponent(newMemberEmail.trim())}`, {
        headers: { 'x-user-id': user?.id || '' }
      });

      if (!response.ok) {
        throw new Error('사용자를 찾을 수 없습니다');
      }

      const result = await response.json();
      const foundUser = result.data?.users?.[0];

      if (!foundUser) {
        throw new Error('해당 이메일의 사용자를 찾을 수 없습니다');
      }

      await addMember(selectedGroup.id, foundUser.id);
      await refreshGroups();

      // Update selected group with new data
      const updatedGroup = groups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }

      setShowAddMemberModal(false);
      setNewMemberEmail('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!selectedGroup) return;

    if (!confirm(`'${memberName}'님을 그룹에서 제거하시겠습니까?`)) {
      return;
    }

    try {
      setProcessing(true);
      await removeMember(selectedGroup.id, memberId);
      await refreshGroups();

      // Update selected group
      const updatedGroup = groups.find(g => g.id === selectedGroup.id);
      if (updatedGroup) {
        setSelectedGroup(updatedGroup);
      }
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const openEditModal = (group: Group) => {
    setSelectedGroup(group);
    setNewGroupName(group.name);
    setNewGroupDescription(group.description || '');
    setNewGroupColor(group.color);
    setShowEditModal(true);
  };

  if (authLoading || groupsLoading) {
    return (
      <>
        <Head>
          <title>그룹 관리 - 프로젝트 관리 보드</title>
        </Head>
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>그룹 관리 - 프로젝트 관리 보드</title>
      </Head>
      <Layout>
        <div className="h-full overflow-hidden flex">
          {/* 그룹 목록 */}
          <div className="w-80 border-r border-border bg-card flex flex-col">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">그룹</h2>
              <button
                onClick={() => {
                  setNewGroupName('');
                  setNewGroupDescription('');
                  setNewGroupColor('#6366f1');
                  setShowCreateModal(true);
                }}
                className="p-2 hover:bg-accent rounded-lg transition-colors"
                title="그룹 추가"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>그룹이 없습니다</p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="mt-2 text-primary hover:underline"
                  >
                    첫 그룹 만들기
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  {groups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => setSelectedGroup(group)}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                        selectedGroup?.id === group.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-accent'
                      }`}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: group.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{group.name}</div>
                        <div className={`text-xs ${
                          selectedGroup?.id === group.id
                            ? 'text-primary-foreground/70'
                            : 'text-muted-foreground'
                        }`}>
                          {group.members.length}명의 멤버
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0 opacity-50" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 그룹 상세 */}
          <div className="flex-1 overflow-y-auto">
            {selectedGroup ? (
              <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold"
                      style={{ backgroundColor: selectedGroup.color }}
                    >
                      {selectedGroup.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold text-foreground">{selectedGroup.name}</h1>
                      {selectedGroup.description && (
                        <p className="text-muted-foreground mt-1">{selectedGroup.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEditModal(selectedGroup)}
                      className="p-2 hover:bg-accent rounded-lg transition-colors"
                      title="그룹 수정"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(selectedGroup)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      title="그룹 삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* 멤버 목록 */}
                <div className="bg-card rounded-lg border border-border">
                  <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">멤버 ({selectedGroup.members.length})</h3>
                    <button
                      onClick={() => {
                        setNewMemberEmail('');
                        setShowAddMemberModal(true);
                      }}
                      className="flex items-center gap-2 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
                    >
                      <UserPlus className="w-4 h-4" />
                      멤버 추가
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {selectedGroup.members.map((member) => (
                      <div key={member.id} className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.userAvatar}
                            alt={member.userName}
                            className="w-10 h-10 rounded-full"
                          />
                          <div>
                            <div className="font-medium text-foreground">{member.userName}</div>
                            <div className="text-sm text-muted-foreground">{member.userEmail}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            member.role === 'admin'
                              ? 'bg-primary/10 text-primary'
                              : 'bg-muted text-muted-foreground'
                          }`}>
                            {member.role === 'admin' ? '관리자' : '멤버'}
                          </span>
                          {member.userId !== user.id && (
                            <button
                              onClick={() => handleRemoveMember(member.userId, member.userName)}
                              className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"
                              title="멤버 제거"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {selectedGroup.members.length === 0 && (
                      <div className="p-8 text-center text-muted-foreground">
                        멤버가 없습니다
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>그룹을 선택하세요</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </Layout>

      {/* 그룹 생성 모달 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">새 그룹 만들기</h2>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  그룹 이름 *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="예: 개발팀, 마케팅팀"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  설명
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  placeholder="그룹에 대한 설명을 입력하세요"
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  색상
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-muted-foreground">{newGroupColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                disabled={processing}
              >
                취소
              </button>
              <button
                onClick={handleCreateGroup}
                disabled={processing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? '생성 중...' : '그룹 만들기'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 그룹 수정 모달 */}
      {showEditModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">그룹 수정</h2>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  그룹 이름 *
                </label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  설명
                </label>
                <textarea
                  value={newGroupDescription}
                  onChange={(e) => setNewGroupDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  색상
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newGroupColor}
                    onChange={(e) => setNewGroupColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <span className="text-muted-foreground">{newGroupColor}</span>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                disabled={processing}
              >
                취소
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={processing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 멤버 추가 모달 */}
      {showAddMemberModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-foreground mb-4">멤버 추가</h2>
            {error && (
              <div className="mb-4 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                {error}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                이메일 주소
              </label>
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                추가하려는 사용자의 이메일을 입력하세요
              </p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddMemberModal(false);
                  setError(null);
                }}
                className="px-4 py-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
                disabled={processing}
              >
                취소
              </button>
              <button
                onClick={handleAddMember}
                disabled={processing}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {processing ? '추가 중...' : '추가'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
