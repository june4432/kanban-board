/**
 * Project Group Detail API
 * PATCH - Update group permission for project
 * DELETE - Unlink group from project
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GroupRepository } from '@/lib/repositories/group.repository';
import { ProjectRepository } from '@/lib/repositories/project.repository';

const groupRepo = new GroupRepository();
const projectRepo = new ProjectRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, groupId } = req.query;
    const projectId = id as string;
    const targetGroupId = groupId as string;

    // Get current user from header or query
    const userId = req.headers['x-user-id'] as string || req.query.userId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    // Check if project exists
    const project = await projectRepo.findById(projectId);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Project not found'
      });
    }

    // Check if user is project owner
    if (project.ownerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Only project owner can manage group links'
      });
    }

    if (req.method === 'PATCH') {
      const { permission } = req.body;

      if (!permission || !['view', 'edit', 'admin'].includes(permission)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Valid permission (view, edit, or admin) is required'
        });
      }

      await groupRepo.linkToProject(projectId, targetGroupId, permission);

      const projectGroups = await groupRepo.getProjectGroups(projectId);

      return res.status(200).json({
        success: true,
        data: { groups: projectGroups },
        message: 'Group permission updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      const result = await groupRepo.unlinkFromProject(projectId, targetGroupId);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Group is not linked to this project'
        });
      }

      const projectGroups = await groupRepo.getProjectGroups(projectId);

      return res.status(200).json({
        success: true,
        data: { groups: projectGroups },
        message: 'Group unlinked from project successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Project Group Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
