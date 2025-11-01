import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ToastContainer from '@/components/ToastContainer';
import { useEffect } from 'react';
import { assertValidEnv } from '@/lib/env-validation';

// 서버 사이드에서만 환경 변수 검증
if (typeof window === 'undefined') {
  assertValidEnv();
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
          <AuthProvider>
            <Component {...pageProps} />
            <ToastContainer />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}