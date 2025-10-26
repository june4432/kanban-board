import { NextApiRequest, NextApiResponse } from 'next';
import { getRepositories } from '@/lib/repositories';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId } = req.query;

    // userId가 없으면 빈 배열 반환
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: 'User ID is required', projects: [] });
    }

    const { projects } = getRepositories();

    // 사용자가 소유하거나 멤버인 프로젝트들
    const myProjects = projects.findByUserId(userId);

    console.log(`[DEBUG] User ${userId} has ${myProjects.length} projects`);
    res.status(200).json({ projects: myProjects });
  } catch (error) {
    console.error('Error fetching my projects:', error);
    res.status(500).json({ error: 'Failed to fetch my projects' });
  }
}
