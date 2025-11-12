import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import ApiKeyList from '@/components/ApiKeyList';
import CreateApiKeyModal from '@/components/CreateApiKeyModal';

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  expiresAt: string | null;
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      loadApiKeys();
    }
  }, [status, router]);

  const loadApiKeys = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/v1/api-keys');

      if (!response.ok) {
        throw new Error('Failed to load API keys');
      }

      const data = await response.json();
      setApiKeys(data.apiKeys);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSuccess = (newKey: ApiKey) => {
    setApiKeys([newKey, ...apiKeys]);
    setShowCreateModal(false);
  };

  const handleRevoke = async (keyId: string) => {
    if (!confirm('정말 이 API 키를 비활성화하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/api-keys/${keyId}/revoke`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to revoke API key');
      }

      // Reload list
      loadApiKeys();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleDelete = async (keyId: string) => {
    if (!confirm('정말 이 API 키를 영구 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/api-keys/${keyId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete API key');
      }

      // Remove from list
      setApiKeys(apiKeys.filter(k => k.id !== keyId));
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            API Keys
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            외부 시스템, CLI 도구, MCP 서버에서 API에 접근하기 위한 API 키를 관리하세요.
          </p>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                API 키 사용 방법
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-400">
                <ul className="list-disc list-inside space-y-1">
                  <li>API 키는 생성 시 한 번만 표시됩니다. 안전한 곳에 저장하세요.</li>
                  <li>Authorization 헤더에 <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Bearer sk_live_...</code> 형식으로 전달하세요.</li>
                  <li>권한 범위(scope)에 따라 API 접근이 제한됩니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            새 API 키 생성
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
          </div>
        )}

        {/* API Keys List */}
        <ApiKeyList
          apiKeys={apiKeys}
          onRevoke={handleRevoke}
          onDelete={handleDelete}
        />

        {/* Create Modal */}
        {showCreateModal && (
          <CreateApiKeyModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
          />
        )}
      </div>
    </Layout>
  );
}
