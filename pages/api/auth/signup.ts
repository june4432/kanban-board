import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { User, AuthUser } from '@/types';

const USERS_FILE_PATH = path.join(process.cwd(), 'data', 'users.json');

// 사용자 데이터 읽기
const readUsers = (): { users: User[] } => {
  try {
    const fileContents = fs.readFileSync(USERS_FILE_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    
    data.users.forEach((user: any) => {
      if (user.createdAt) user.createdAt = new Date(user.createdAt);
    });
    
    return data;
  } catch (error) {
    console.error('Error reading users file:', error);
    return { users: [] };
  }
};

// 사용자 데이터 쓰기
const writeUsers = (data: { users: User[] }): void => {
  try {
    fs.writeFileSync(USERS_FILE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users file:', error);
    throw new Error('Failed to write users file');
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
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

    const usersData = readUsers();
    
    // 이메일 중복 검사
    const existingUser = usersData.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(409).json({ error: '이미 사용중인 이메일입니다.' });
    }

    // 새 사용자 생성
    const newUser: User = {
      id: uuidv4(),
      name,
      email,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3b82f6&color=fff`,
      password,
      role: 'user',
      createdAt: new Date()
    };

    usersData.users.push(newUser);
    writeUsers(usersData);

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