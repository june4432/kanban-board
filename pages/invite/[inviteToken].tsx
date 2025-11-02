import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Globe, Lock, Calendar, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from '@/components/AuthModal';

interface InvitationInfo {
  projectName: string;
  projectDescription: string | null;
  projectColor: string;
  invitedBy: string;
  expiresAt: string | null;
  usesRemaining: number | null;
}

export default function InvitePage() {
  const router = useRouter();
  const { inviteToken } = router.query;
  const { user } = useAuth();

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (inviteToken && typeof inviteToken === 'string') {
      fetchInvitationInfo();
    }
  }, [inviteToken]);

  const fetchInvitationInfo = async () => {
    try {
      const response = await fetch(`/api/invite/${inviteToken}`);

      if (response.ok) {
        const data = await response.json();
        setInvitation(data);
        setError(null);
      } else if (response.status === 404) {
        setError('유효하지 않거나 만료된 초대 링크입니다.');
      } else if (response.status === 410) {
        const data = await response.json();
        setError(data.error || '초대 링크가 만료되었거나 사용 횟수를 초과했습니다.');
      } else {
        setError('초대 정보를 불러오는데 실패했습니다.');
      }
    } catch (error) {
      setError('초대 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinProject = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setJoining(true);
    try {
      const response = await fetch(`/api/invite/${inviteToken}`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setJoinSuccess(true);

        // 프로젝트 페이지로 리다이렉트
        setTimeout(() => {
          router.push(`/?project=${data.project.project_id}`);
        }, 2000);
      } else if (response.status === 400) {
        const data = await response.json();
        if (data.error.includes('Already a member')) {
          setError('이미 이 프로젝트의 멤버입니다.');
          // 이미 멤버라면 프로젝트로 이동
          setTimeout(() => {
            router.push('/');
          }, 2000);
        } else {
          setError(data.error);
        }
      } else if (response.status === 410) {
        const data = await response.json();
        setError(data.error);
      } else {
        setError('프로젝트 참여에 실패했습니다.');
      }
    } catch (error) {
      setError('프로젝트 참여 중 오류가 발생했습니다.');
    } finally {
      setJoining(false);
    }
  };

  // 로그인 성공 후 자동으로 프로젝트 참여
  useEffect(() => {
    if (user && showAuthModal) {
      setShowAuthModal(false);
      handleJoinProject();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">초대 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-card-foreground mb-2">초대 링크 오류</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  if (joinSuccess) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-card-foreground mb-2">환영합니다!</h1>
          <p className="text-muted-foreground mb-6">
            프로젝트에 성공적으로 참여했습니다. 잠시 후 프로젝트 페이지로 이동합니다.
          </p>
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!invitation) {
    return null;
  }

  const isExpiringSoon = invitation.expiresAt &&
    new Date(invitation.expiresAt).getTime() - Date.now() < 24 * 60 * 60 * 1000;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden">
        {/* 헤더 */}
        <div
          className="p-8 text-white relative"
          style={{ backgroundColor: invitation.projectColor }}
        >
          <div className="relative z-10">
            <div className="flex items-center space-x-2 mb-2">
              <Users className="w-5 h-5" />
              <span className="text-sm font-medium opacity-90">프로젝트 초대</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">{invitation.projectName}</h1>
            {invitation.projectDescription && (
              <p className="text-sm opacity-90">{invitation.projectDescription}</p>
            )}
          </div>
        </div>

        {/* 본문 */}
        <div className="p-8 space-y-6">
          {/* 초대 정보 */}
          <div className="space-y-4">
            <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
              <Users className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <div className="text-sm font-medium text-card-foreground">초대한 사람</div>
                <div className="text-muted-foreground">{invitation.invitedBy}님이 이 프로젝트에 초대했습니다</div>
              </div>
            </div>

            {invitation.expiresAt && (
              <div className={`flex items-start space-x-3 p-4 rounded-lg ${
                isExpiringSoon ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-muted'
              }`}>
                <Calendar className={`w-5 h-5 mt-0.5 ${isExpiringSoon ? 'text-amber-500' : 'text-primary'}`} />
                <div>
                  <div className="text-sm font-medium text-card-foreground">만료 일시</div>
                  <div className="text-muted-foreground">
                    {new Date(invitation.expiresAt).toLocaleString('ko-KR')}
                    {isExpiringSoon && (
                      <span className="ml-2 text-amber-500 text-sm font-medium">곧 만료됩니다</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {invitation.usesRemaining !== null && (
              <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
                <AlertCircle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <div className="text-sm font-medium text-card-foreground">남은 사용 횟수</div>
                  <div className="text-muted-foreground">
                    {invitation.usesRemaining}회 남음
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 오류 메시지 */}
          {error && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2 text-destructive">
                <XCircle className="w-5 h-5" />
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="space-y-3">
            {user ? (
              <button
                onClick={handleJoinProject}
                disabled={joining}
                className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
              >
                {joining ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    <span>참여 중...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>프로젝트 참여하기</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  프로젝트에 참여하려면 로그인이 필요합니다
                </p>
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                >
                  로그인 / 회원가입
                </button>
              </div>
            )}
          </div>

          {/* 추가 정보 */}
          <div className="pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              이 초대 링크는 {invitation.projectName} 프로젝트로 이동합니다.
              <br />
              참여 후 프로젝트의 모든 카드와 작업을 확인하고 협업할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* 인증 모달 */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </div>
  );
}
