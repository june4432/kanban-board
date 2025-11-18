import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

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

interface ApiKeyListProps {
  apiKeys: ApiKey[];
  onRevoke: (keyId: string) => void;
  onDelete: (keyId: string) => void;
}

export default function ApiKeyList({ apiKeys, onRevoke, onDelete }: ApiKeyListProps) {
  const getScopeColor = (scope: string) => {
    switch (scope) {
      case 'admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'write':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'read':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (apiKeys.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
          />
        </svg>
        <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
          API 키가 없습니다
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          새 API 키를 생성하여 시작하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {apiKeys.map((apiKey) => (
        <div
          key={apiKey.id}
          className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                {/* Key Name and Status */}
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {apiKey.name}
                  </h3>
                  {apiKey.isActive ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                      활성
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                      비활성
                    </span>
                  )}
                </div>

                {/* Key Prefix */}
                <div className="flex items-center gap-2 mb-3">
                  <code className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-800 dark:text-gray-200">
                    {apiKey.keyPrefix}••••••••••••••••••••••••••••
                  </code>
                </div>

                {/* Scopes */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-500 dark:text-gray-400">권한:</span>
                  <div className="flex gap-1">
                    {apiKey.scopes.map((scope) => (
                      <span
                        key={scope}
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getScopeColor(scope)}`}
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Usage Stats */}
                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span>{(apiKey.usageCount ?? 0).toLocaleString()} 요청</span>
                  </div>
                  {apiKey.lastUsedAt && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>
                        {formatDistanceToNow(new Date(apiKey.lastUsedAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    </div>
                  )}
                  {apiKey.createdAt && (
                    <div className="flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>
                        {formatDistanceToNow(new Date(apiKey.createdAt), {
                          addSuffix: true,
                          locale: ko,
                        })} 생성
                      </span>
                    </div>
                  )}
                </div>

                {/* Expiration Warning */}
                {apiKey.expiresAt && (
                  <div className="mt-2">
                    {new Date(apiKey.expiresAt) < new Date() ? (
                      <span className="text-sm text-red-600 dark:text-red-400">
                        ⚠️ 만료됨
                      </span>
                    ) : (
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        만료: {formatDistanceToNow(new Date(apiKey.expiresAt), {
                          addSuffix: true,
                          locale: ko,
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 ml-4">
                {apiKey.isActive && (
                  <button
                    onClick={() => onRevoke(apiKey.id)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    비활성화
                  </button>
                )}
                <button
                  onClick={() => onDelete(apiKey.id)}
                  className="inline-flex items-center px-3 py-1.5 border border-red-300 dark:border-red-700 rounded-md text-sm font-medium text-red-700 dark:text-red-400 bg-white dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
