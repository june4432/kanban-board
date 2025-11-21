import { NextApiRequest, NextApiResponse } from 'next';
import { AuthUser } from '@/types';
import { getRepositories } from '@/lib/repositories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
    }

    // 비밀번호 길이 검증
    if (password.length < 4) {
      return res.status(400).json({ error: '비밀번호는 4자리 이상이어야 합니다.' });
    }

    const { users } = getRepositories();

    // 이메일 중복 검사
    const existingUser = await users.findByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: '이미 사용중인 이메일입니다.' });
    }

    // 새 사용자 생성 (비밀번호는 자동으로 해싱됨)
    const newUser = await users.create({
      name,
      email,
      password,
      role: 'user',
    });

    // 비밀번호 제외하고 반환
    const authUser: AuthUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      avatar: newUser.avatar,
      role: newUser.role || 'user'
    };

    res.status(201).json({ user: authUser, message: '회원가입이 완료되었습니다!' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: '회원가입 중 오류가 발생했습니다.' });
  }
}