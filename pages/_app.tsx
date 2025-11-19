import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { OrganizationProvider } from '@/contexts/OrganizationContext';
import { ToastProvider, useToast } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ToastContainer from '@/components/ToastContainer';
import { useEffect } from 'react';
import { assertValidEnv } from '@/lib/env-validation';
import { configureApiClient } from '@/lib/api/v1-client';

// 서버 사이드에서만 환경 변수 검증
if (typeof window === 'undefined') {
  assertValidEnv();
}

// API v1 에러 핸들러 설정을 위한 래퍼 컴포넌트
function ApiConfigWrapper({ children }: { children: React.ReactNode }) {
  const { addToast } = useToast();

  useEffect(() => {
    // v1 API 전역 에러 핸들러 설정
    configureApiClient({
      onError: (error) => {
        const message = error.error.message || 'An error occurred';
        const code = error.error.code;

        // 에러 타입에 따른 메시지 표시
        if (code === 'UNAUTHORIZED') {
          addToast({ type: 'error', title: '인증 오류', message: '인증이 필요합니다. 다시 로그인해주세요.' });
        } else if (code === 'FORBIDDEN') {
          addToast({ type: 'error', title: '권한 오류', message: '권한이 없습니다.' });
        } else if (code === 'NOT_FOUND') {
          addToast({ type: 'error', title: '오류', message: '요청한 리소스를 찾을 수 없습니다.' });
        } else if (code === 'RATE_LIMIT_EXCEEDED') {
          addToast({ type: 'warning', title: '요청 제한', message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' });
        } else if (code === 'VALIDATION_ERROR') {
          addToast({ type: 'error', title: '입력 오류', message: message });
        } else {
          addToast({ type: 'error', title: 'API 오류', message });
        }
      },
    });
  }, [addToast]);

  return <>{children}</>;
}

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // 웹소켓 API 초기화
  useEffect(() => {
    fetch('/api/websocket');
  }, []);

  return (
    <SessionProvider session={session}>
      <ThemeProvider>
        <ToastProvider>
          <ApiConfigWrapper>
            <AuthProvider>
              <OrganizationProvider>
                <Component {...pageProps} />
                <ToastContainer />
              </OrganizationProvider>
            </AuthProvider>
          </ApiConfigWrapper>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}