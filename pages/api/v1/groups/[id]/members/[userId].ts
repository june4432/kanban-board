/**
 * Group Member Detail API
 * PATCH - Update member role
 * DELETE - Remove member from group
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GroupRepository } from '@/lib/repositories/group.repository';

const groupRepo = new GroupRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { id, userId: targetUserId } = req.query;
    const groupId = id as string;
    const memberId = targetUserId as string;

    // Get current user from header or query
    const currentUserId = req.headers['x-user-id'] as string || req.query.currentUserId as string;

    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'User ID is required'
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

    // Check if target user is a member
    const isMember = await groupRepo.isMember(groupId, memberId);
    if (!isMember) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Member not found in this group'
      });
    }

    if (req.method === 'PATCH') {
      // Check if current user is admin of the group
      const currentUserRole = await groupRepo.getUserRole(groupId, currentUserId);
      if (currentUserRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only group admins can update member roles'
        });
      }

      const { role } = req.body;

      if (!role || !['admin', 'member'].includes(role)) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Valid role (admin or member) is required'
        });
      }

      await groupRepo.updateMemberRole(groupId, memberId, role);

      const members = await groupRepo.getMembers(groupId);

      return res.status(200).json({
        success: true,
        data: { members },
        message: 'Member role updated successfully'
      });
    }

    if (req.method === 'DELETE') {
      // Check if current user is admin OR removing themselves
      const currentUserRole = await groupRepo.getUserRole(groupId, currentUserId);
      const isSelf = currentUserId === memberId;

      if (currentUserRole !== 'admin' && !isSelf) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only group admins can remove members'
        });
      }

      // Prevent removing the last admin
      if (currentUserRole === 'admin') {
        const members = await groupRepo.getMembers(groupId);
        const adminCount = members.filter(m => m.role === 'admin').length;
        const targetRole = await groupRepo.getUserRole(groupId, memberId);

        if (targetRole === 'admin' && adminCount <= 1) {
          return res.status(400).json({
            success: false,
            error: 'Bad Request',
            message: 'Cannot remove the last admin from the group'
          });
        }
      }

      await groupRepo.removeMember(groupId, memberId);

      const members = await groupRepo.getMembers(groupId);

      return res.status(200).json({
        success: true,
        data: { members },
        message: 'Member removed successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Group Member Detail API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
