import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ToastContainer from '@/components/ToastContainer';
import { useEffect } from 'react';

export default function App({ Component, pageProps }: AppProps) {
  // 웹소켓 API 초기화
  useEffect(() => {
    fetch('/api/websocket');
  }, []);

  return (
    <ThemeProvider>
      <ToastProvider>
        <AuthProvider>
          <Component {...pageProps} />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}