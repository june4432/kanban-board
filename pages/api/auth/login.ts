import { NextApiRequest, NextApiResponse } from 'next';
import { AuthUser } from '@/types';
import { getRepositories } from '@/lib/repositories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const { users } = getRepositories();

    // 비밀번호 검증 (bcrypt compare)
    const user = await users.verifyPassword(email, password);

    if (!user) {
      return res.status(401).json({ error: '이메일 또는 비밀번호가 잘못되었습니다.' });
    }

    // 비밀번호 제외하고 반환
    const authUser: AuthUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      role: user.role || 'user'
    };

    res.status(200).json({ user: authUser });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
}