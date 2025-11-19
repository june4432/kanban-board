import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';

/**
 * GET /api/users/search?q=query
 * 사용자 검색 API - 이메일 또는 이름으로 검색
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { q } = req.query;

  if (!q || typeof q !== 'string') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const searchQuery = q.trim();
  if (searchQuery.length < 2) {
    return res.status(400).json({ error: 'Search query must be at least 2 characters' });
  }

  try {
    const db = getDatabase();

    // 이메일 또는 이름으로 검색 (현재 사용자 제외)
    const users = db.prepare(`
      SELECT id, email, name, avatar
      FROM users
      WHERE (email LIKE ? OR name LIKE ?)
      AND id != ?
      LIMIT 10
    `).all(`%${searchQuery}%`, `%${searchQuery}%`, session.user.id);

    return res.status(200).json({ users });
  } catch (error) {
    console.error('Error searching users:', error);
    return res.status(500).json({ error: 'Failed to search users' });
  }
}
