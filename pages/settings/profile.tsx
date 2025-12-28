import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { useAuth } from '@/contexts/AuthContext';
import { User, Camera, Save, ArrowLeft, Check, AlertCircle, Loader2 } from 'lucide-react';

// Disable static generation for this page
export async function getServerSideProps() {
  return {
    props: {}
  };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshUser } = useAuth();
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검사 (최대 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('이미지 크기는 2MB 이하여야 합니다');
      return;
    }

    // 이미지 파일인지 검사
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드할 수 있습니다');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('/api/v1/upload/avatar', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '업로드에 실패했습니다');
      }

      setAvatar(data.data.url);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
      // 같은 파일 다시 선택 가능하도록 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('이름을 입력해주세요');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/v1/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          avatar: avatar || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || '프로필 업데이트에 실패했습니다');
      }

      // localStorage 업데이트
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        parsedUser.name = name.trim();
        if (avatar) parsedUser.avatar = avatar;
        localStorage.setItem('user', JSON.stringify(parsedUser));
      }

      // AuthContext 새로고침 (있는 경우)
      if (refreshUser) {
        await refreshUser();
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-lg text-foreground">로딩 중...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <Head>
        <title>프로필 설정 - 프로젝트 관리 보드</title>
      </Head>
      <div className="min-h-screen bg-background">
        {/* 헤더 */}
        <div className="border-b border-border bg-card">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>뒤로</span>
            </button>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-card rounded-lg border border-border p-6">
            <h1 className="text-2xl font-bold text-foreground mb-6">프로필 설정</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 아바타 */}
              <div className="flex flex-col items-center">
                <div className="relative group">
                  <div 
                    className={`w-24 h-24 rounded-full overflow-hidden bg-muted flex items-center justify-center cursor-pointer border-2 border-border hover:border-primary transition-colors ${uploading ? 'opacity-50' : ''}`}
                    onClick={handleAvatarClick}
                  >
                    {uploading ? (
                      <Loader2 className="w-8 h-8 text-primary animate-spin" />
                    ) : avatar ? (
                      <img 
                        src={avatar} 
                        alt="프로필 이미지" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-12 h-12 text-muted-foreground" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleAvatarClick}
                    disabled={uploading}
                    className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  클릭하여 프로필 이미지 변경 (최대 2MB)
                </p>
              </div>

              {/* 이름 */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
                  이름
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                  placeholder="이름을 입력하세요"
                />
              </div>

              {/* 이메일 (읽기 전용) */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
                  이메일
                </label>
                <input
                  type="email"
                  id="email"
                  value={user.email || ''}
                  disabled
                  className="w-full px-3 py-2 bg-muted border border-border rounded-lg text-muted-foreground cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  이메일은 변경할 수 없습니다
                </p>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* 성공 메시지 */}
              {success && (
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-600 dark:text-green-400">
                  <Check className="w-5 h-5 flex-shrink-0" />
                  <span className="text-sm">프로필이 업데이트되었습니다</span>
                </div>
              )}

              {/* 저장 버튼 */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      <span>저장 중...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>저장</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* 계정 정보 */}
          <div className="bg-card rounded-lg border border-border p-6 mt-6">
            <h2 className="text-lg font-semibold text-foreground mb-4">계정 정보</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">사용자 ID</span>
                <span className="text-foreground font-mono text-xs">{user.id}</span>
              </div>
              {user.companyId && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">회사 역할</span>
                  <span className="text-foreground">{user.companyRole || 'member'}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
