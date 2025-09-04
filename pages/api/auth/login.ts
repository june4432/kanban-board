import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { User, AuthUser } from '@/types';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// 사용자 데이터 읽기
const readUsers = (): { users: User[] } => {
  try {
    const fileContents = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    // Date 객체로 변환
    data.users.forEach((user: any) => {
      if (user.createdAt) user.createdAt = new Date(user.createdAt);
    });
    
    return data;
  } catch (error) {
    console.error('Error reading users file:', error);
    return { users: [] };
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    const usersData = readUsers();
    const user = usersData.users.find(u => u.email === email && u.password === password);

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