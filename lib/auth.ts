import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { User } from '@/types';

const usersFilePath = path.join(process.cwd(), 'data', 'users.json');

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

export async function findUserByEmail(email: string): Promise<User | null> {
  try {
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    const users: User[] = JSON.parse(fileContent);
    return users.find(user => user.email === email) || null;
  } catch (error) {
    console.error('Error reading users file:', error);
    return null;
  }
}

export async function createUser(userData: Omit<User, 'id' | 'createdAt'>): Promise<User | null> {
  try {
    const fileContent = fs.readFileSync(usersFilePath, 'utf-8');
    const users: User[] = JSON.parse(fileContent);

    // Check if user already exists
    if (users.find(u => u.email === userData.email)) {
      return null;
    }

    const newUser: User = {
      ...userData,
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
    };

    users.push(newUser);
    fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2));

    // Remove password before returning
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}