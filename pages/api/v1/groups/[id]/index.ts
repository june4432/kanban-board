/**
 * Group Detail API
 * GET - Get group details with members
 * PATCH - Update group
 * DELETE - Delete group
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GroupRepository } from '@/lib/repositories/group.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

const groupRepo = new GroupRepository();
const userRepo = new UserRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id } = req.query;
    const groupId = id as string;

    // Get current user from header or query
    const userId = req.headers['x-user-id'] as string || req.query.userId as string;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
      });
    }

    const user = await userRepo.findById(userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User not found'
      });
    }

    // Check if group exists
    const group = await groupRepo.findByIdWithMembers(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Group not found'
      });
    }

    if (req.method === 'GET') {
      const stats = await groupRepo.getStats(groupId);

      return res.status(200).json({
        success: true,
        data: { group, stats }
      });
    }

    if (req.method === 'PATCH') {
      // Check if user is admin of the group
      const userRole = await groupRepo.getUserRole(groupId, userId);
      if (userRole !== 'admin' && group.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only group admins can update the group'
        });
      }

      const { name, description, color } = req.body;

      const updatedGroup = await groupRepo.update(groupId, {
        name,
        description,
        color
      });

      return res.status(200).json({
        success: true,
        data: { group: updatedGroup }
      });
    }

    if (req.method === 'DELETE') {
      // Check if user is creator of the group
      if (group.createdBy !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only the group creator can delete the group'
        });
      }

      await groupRepo.delete(groupId);

      return res.status(200).json({
        success: true,
        message: 'Group deleted successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Group Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
