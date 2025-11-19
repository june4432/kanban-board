import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Building2, Users, Mail, Shield, Trash2, Settings, ArrowLeft, UserPlus, Crown, Edit2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

interface Member {
  userId: string;
  userName: string;
  userEmail: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer' | 'member';
  joinedAt: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  createdAt: string;
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default function OrganizationDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { id } = router.query;

  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated' && id) {
      loadOrganizationData();
    }
  }, [status, id, router]);

  const loadOrganizationData = async () => {
    try {
      setLoading(true);

      // Load organization details
      const orgResponse = await fetch(`/api/v1/organizations/${id}`);
      if (!orgResponse.ok) {
        throw new Error('조직 정보를 불러오는데 실패했습니다');
      }
      const orgData = await orgResponse.json();
      setOrganization(orgData.data);

      // Load members
      const membersResponse = await fetch(`/api/v1/organizations/${id}/members`);
      if (!membersResponse.ok) {
        throw new Error('멤버 목록을 불러오는데 실패했습니다');
      }
      const membersData = await membersResponse.json();
      setMembers(membersData.data || []);

      // Find current user's role
      const currentMember = membersData.data?.find((m: Member) => m.userEmail === session?.user?.email);
      setCurrentUserRole(currentMember?.role || '');

      // Load join requests (only for admin/owner)
      if (currentMember && ['owner', 'admin'].includes(currentMember.role)) {
        try {
          const joinRequestsResponse = await fetch(`/api/v1/organizations/${id}/join-requests`);
          if (joinRequestsResponse.ok) {
            const joinRequestsData = await joinRequestsResponse.json();
            setJoinRequests(joinRequestsData.data?.filter((jr: JoinRequest) => jr.status === 'pending') || []);
          }
        } catch (err) {
          console.error('Failed to load join requests:', err);
        }
      }

      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async (userEmail: string, role: string) => {
    try {
      const response = await fetch(`/api/v1/organizations/${id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '멤버 추가에 실패했습니다');
      }

      await loadOrganizationData();
      setShowInviteModal(false);
      alert('멤버가 추가되었습니다');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('정말 이 멤버를 제거하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/organizations/${id}/members/${userId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('멤버 제거에 실패했습니다');
      }

      await loadOrganizationData();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleUpdateOrganization = async (data: any) => {
    try {
      const response = await fetch(`/api/v1/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '조직 수정에 실패했습니다');
      }

      await loadOrganizationData();
      setShowEditModal(false);
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleDeleteOrganization = async () => {
    if (!confirm('정말 이 조직을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/organizations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('조직 삭제에 실패했습니다');
      }

      router.push('/settings/organizations');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const response = await fetch(`/api/v1/organizations/${id}/join-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'member' }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '가입 승인에 실패했습니다');
      }

      await loadOrganizationData();
      alert('가입 요청이 승인되었습니다');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!confirm('이 가입 요청을 거부하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/organizations/${id}/join-requests/${requestId}/reject`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '가입 거부에 실패했습니다');
      }

      await loadOrganizationData();
      alert('가입 요청이 거부되었습니다');
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const getRoleBadge = (role: string) => {
    const badges = {
      owner: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
      admin: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
      editor: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      viewer: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      member: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    };
    return badges[role as keyof typeof badges] || badges.member;
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      owner: '소유자',
      admin: '관리자',
      editor: '편집자',
      viewer: '뷰어',
      member: '멤버',
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">로딩 중...</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !organization) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="text-center py-16">
            <p className="text-destructive mb-4">{error || '조직을 찾을 수 없습니다'}</p>
            <button
              onClick={() => router.push('/settings/organizations')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              목록으로 돌아가기
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.push('/settings/organizations')}
          className="mb-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          조직 목록으로 돌아가기
        </button>

        {/* Organization Header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{organization.name}</h1>
                <p className="text-muted-foreground">/{organization.slug}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 text-sm font-medium rounded ${getPlanBadge(organization.plan)}`}>
                {organization.plan.toUpperCase()}
              </span>
              {isAdmin && (
                <>
                  <button
                    onClick={() => setShowEditModal(true)}
                    className="p-2 hover:bg-secondary rounded-lg transition-colors"
                    title="조직 수정"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {currentUserRole === 'owner' && (
                    <button
                      onClick={handleDeleteOrganization}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      title="조직 삭제"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {organization.description && (
            <p className="text-muted-foreground">{organization.description}</p>
          )}
        </div>

        {/* Members Section */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Users className="w-5 h-5" />
              멤버 ({members.length})
            </h2>
            {isAdmin && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                멤버 초대
              </button>
            )}
          </div>

          <div className="space-y-3">
            {members.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-primary">
                      {member.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground">{member.userName}</p>
                      {member.role === 'owner' && (
                        <Crown className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{member.userEmail}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 text-xs font-medium rounded ${getRoleBadge(member.role)}`}>
                    {getRoleLabel(member.role)}
                  </span>
                  {isAdmin && member.role !== 'owner' && member.userEmail !== session?.user?.email && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors"
                      title="멤버 제거"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Join Requests Section (Admin/Owner only) */}
        {isAdmin && joinRequests.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <Mail className="w-5 h-5" />
                가입 요청 ({joinRequests.length})
              </h2>
            </div>

            <div className="space-y-3">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-sm font-semibold text-primary">
                        {request.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">{request.userName}</p>
                      <p className="text-sm text-muted-foreground truncate">{request.userEmail}</p>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1 italic">
                          &quot;{request.message}&quot;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(request.createdAt).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => handleApproveRequest(request.id)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
                      title="승인"
                    >
                      승인
                    </button>
                    <button
                      onClick={() => handleRejectRequest(request.id)}
                      className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors text-sm font-medium"
                      title="거부"
                    >
                      거부
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invite Member Modal */}
        {showInviteModal && (
          <InviteMemberModal
            onClose={() => setShowInviteModal(false)}
            onInvite={handleInviteMember}
          />
        )}

        {/* Edit Organization Modal */}
        {showEditModal && organization && (
          <EditOrganizationModal
            organization={organization}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleUpdateOrganization}
          />
        )}
      </div>
    </Layout>
  );
}

// Invite Member Modal Component
function InviteMemberModal({
  onClose,
  onInvite,
}: {
  onClose: () => void;
  onInvite: (userEmail: string, role: string) => void;
}) {
  const [userEmail, setUserEmail] = useState('');
  const [role, setRole] = useState('member');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userEmail || !userEmail.includes('@')) {
      alert('올바른 이메일 주소를 입력해주세요');
      return;
    }
    onInvite(userEmail, role);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            멤버 초대
          </h2>
          <p className="text-sm text-muted-foreground mt-2">
            초대할 사용자의 이메일 주소를 입력해주세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              이메일 주소 <span className="text-destructive">*</span>
            </label>
            <input
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
              required
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground mt-2">
              해당 이메일로 가입된 사용자가 조직에 추가됩니다
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              역할
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground"
            >
              <option value="member">멤버</option>
              <option value="viewer">뷰어</option>
              <option value="editor">편집자</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              초대
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Organization Modal Component
function EditOrganizationModal({
  organization,
  onClose,
  onUpdate,
}: {
  organization: Organization;
  onClose: () => void;
  onUpdate: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
    plan: organization.plan,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('조직 이름을 입력해주세요');
      return;
    }
    onUpdate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Edit2 className="w-5 h-5" />
            조직 수정
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              조직 이름 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all resize-none text-foreground"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              플랜
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value as any })}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground"
            >
              <option value="free">무료</option>
              <option value="pro">프로</option>
              <option value="enterprise">엔터프라이즈</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
