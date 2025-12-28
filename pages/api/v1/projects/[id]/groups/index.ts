/**
 * Project Groups API
 * GET - List all groups linked to a project
 * POST - Link a group to the project
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GroupRepository } from '@/lib/repositories/group.repository';
import { ProjectRepository } from '@/lib/repositories/project.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

const groupRepo = new GroupRepository();
const projectRepo = new ProjectRepository();
const userRepo = new UserRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const projectId = id as string;

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

    if (req.method === 'GET') {
      const projectGroups = await groupRepo.getProjectGroups(projectId);

      return res.status(200).json({
        success: true,
        data: { groups: projectGroups }
      });
    }

    if (req.method === 'POST') {
      // Check if user is project owner or admin
      if (project.ownerId !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only project owner can link groups'
        });
      }

      const { groupId, permission = 'view' } = req.body;

      if (!groupId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Group ID is required'
        });
      }

      // Check if group exists
      const group = await groupRepo.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'Group not found'
        });
      }

      // Check if group belongs to same company as project
      const user = await userRepo.findById(userId);
      if (group.companyId !== user?.companyId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Group must belong to the same company'
        });
      }

      await groupRepo.linkToProject(projectId, groupId, permission);

      const projectGroups = await groupRepo.getProjectGroups(projectId);

      return res.status(201).json({
        success: true,
        data: { groups: projectGroups },
        message: 'Group linked to project successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Project Groups API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
