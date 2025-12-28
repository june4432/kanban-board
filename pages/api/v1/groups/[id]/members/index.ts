/**
 * Group Members API
 * GET - List all members of a group
 * POST - Add a member to the group
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

    // Check if group exists
    const group = await groupRepo.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Group not found'
      });
    }

    if (req.method === 'GET') {
      const members = await groupRepo.getMembers(groupId);

      return res.status(200).json({
        success: true,
        data: { members }
      });
    }

    if (req.method === 'POST') {
      // Check if current user is admin of the group
      const userRole = await groupRepo.getUserRole(groupId, userId);
      if (userRole !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Only group admins can add members'
        });
      }

      const { userId: newUserId, role = 'member' } = req.body;

      if (!newUserId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'User ID is required'
        });
      }

      // Check if user exists
      const newUser = await userRepo.findById(newUserId);
      if (!newUser) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User not found'
        });
      }

      // Check if already a member
      const isMember = await groupRepo.isMember(groupId, newUserId);
      if (isMember) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'User is already a member of this group'
        });
      }

      await groupRepo.addMember(groupId, newUserId, role);

      const members = await groupRepo.getMembers(groupId);

      return res.status(201).json({
        success: true,
        data: { members },
        message: 'Member added successfully'
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Group Members API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
