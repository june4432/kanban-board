import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { Building2, Plus, Users, Crown, Settings } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  plan: 'free' | 'pro' | 'enterprise';
  memberCount?: number;
  role?: string;
  createdAt: string;
}

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default function OrganizationsPage() {
  const { status } = useSession();
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadOrganizations();
    }
  }, [status, router]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/organizations');

      if (!response.ok) {
        throw new Error('조직 목록을 불러오는데 실패했습니다');
      }

      const result = await response.json();
      setOrganizations(result.data || []);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrganization = async (data: { name: string; slug?: string; description?: string; plan?: string }) => {
    try {
      const response = await fetch('/api/v1/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || '조직 생성에 실패했습니다');
      }

      const result = await response.json();
      setOrganizations([result.data, ...organizations]);
      setShowCreateModal(false);

      // 조직 상세 페이지로 이동
      router.push(`/settings/organizations/${result.data.id}`);
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const getPlanBadge = (plan: string) => {
    const badges = {
      free: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      pro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
      enterprise: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    };
    return badges[plan as keyof typeof badges] || badges.free;
  };

  const getPlanLabel = (plan: string) => {
    const labels = {
      free: '무료',
      pro: '프로',
      enterprise: '엔터프라이즈',
    };
    return labels[plan as keyof typeof labels] || plan;
  };

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Building2 className="w-8 h-8" />
                조직 관리
              </h1>
              <p className="text-muted-foreground mt-2">
                팀과 프로젝트를 조직 단위로 관리하세요
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              새 조직 만들기
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
            {error}
          </div>
        )}

        {/* Organizations List */}
        {organizations.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-xl">
            <Building2 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">
              아직 조직이 없습니다
            </h3>
            <p className="text-muted-foreground mb-6">
              첫 번째 조직을 만들어 팀원들과 협업을 시작하세요
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              조직 만들기
            </button>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <div
                key={org.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => router.push(`/settings/organizations/${org.id}`)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Building2 className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {org.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">/{org.slug}</p>
                    </div>
                  </div>
                  {org.role === 'owner' && (
                    <Crown className="w-5 h-5 text-amber-500" />
                  )}
                </div>

                {org.description && (
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {org.description}
                  </p>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>{org.memberCount || 0}명</span>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded ${getPlanBadge(org.plan)}`}>
                    {getPlanLabel(org.plan)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Organization Modal */}
        {showCreateModal && (
          <CreateOrganizationModal
            onClose={() => setShowCreateModal(false)}
            onCreate={handleCreateOrganization}
          />
        )}
      </div>
    </Layout>
  );
}

// Create Organization Modal Component
function CreateOrganizationModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (data: any) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    plan: 'free',
  });
  const [autoSlug, setAutoSlug] = useState(true);

  const handleNameChange = (name: string) => {
    setFormData({ ...formData, name });
    if (autoSlug) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData({ ...formData, name, slug });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('조직 이름을 입력해주세요');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card border border-border rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            새 조직 만들기
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Organization Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              조직 이름 <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="예: 우리 회사"
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
              required
            />
          </div>

          {/* Organization Slug */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              URL 슬러그
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">/</span>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => {
                  setAutoSlug(false);
                  setFormData({ ...formData, slug: e.target.value });
                }}
                placeholder="our-company"
                pattern="[a-z0-9-]+"
                className="flex-1 px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground placeholder:text-muted-foreground"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              소문자, 숫자, 하이픈만 사용 가능합니다
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="조직에 대한 간단한 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all resize-none text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Plan */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              플랜
            </label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
              className="w-full px-4 py-3 bg-input border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:bg-background transition-all text-foreground"
            >
              <option value="free">무료</option>
              <option value="pro">프로</option>
              <option value="enterprise">엔터프라이즈</option>
            </select>
          </div>

          {/* Actions */}
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
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
