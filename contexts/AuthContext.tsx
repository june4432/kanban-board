import React, { createContext, useContext, useState, useEffect } from 'react';
import { useSession, signIn, signOut } from 'next-auth/react';
import { AuthUser } from '@/types';

interface AuthContextType {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<AuthUser | null>(null);
  const loading = status === 'loading';

  // NextAuth 세션에서 사용자 정보 추출
  useEffect(() => {
    if (session?.user) {
      const authUser: AuthUser = {
        id: (session.user as any).id,
        name: session.user.name || '',
        email: session.user.email || '',
        avatar: session.user.image || '',
        role: 'user'
      };
      setUser(authUser);
    } else {
      setUser(null);
    }
  }, [session]);

  const login = async (email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { success: false, message: '이메일 또는 비밀번호가 잘못되었습니다.' };
      }

      if (result?.ok) {
        return { success: true };
      }

      return { success: false, message: '로그인 중 오류가 발생했습니다.' };
    } catch (error) {
      return { success: false, message: '로그인 중 오류가 발생했습니다.' };
    }
  };

  const signup = async (name: string, email: string, password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      // 1. 먼저 사용자 생성
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, message: data.error };
      }

      // 2. 회원가입 성공 후 자동 로그인 (NextAuth 세션 생성)
      const loginResult = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (loginResult?.error) {
        return { success: true, message: data.message + ' 로그인 페이지에서 로그인해주세요.' };
      }

      return { success: true, message: data.message };
    } catch (error) {
      return { success: false, message: '회원가입 중 오류가 발생했습니다.' };
    }
  };

  const logout = () => {
    signOut({ redirect: false });
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};