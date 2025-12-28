/**
 * Groups API
 * GET - List all groups in user's company
 * POST - Create a new group
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { GroupRepository } from '@/lib/repositories/group.repository';
import { UserRepository } from '@/lib/repositories/user.repository';

const groupRepo = new GroupRepository();
const userRepo = new UserRepository();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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

    if (req.method === 'GET') {
      // Get companyId from query or user
      const companyId = req.query.companyId as string || user.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Company ID is required'
        });
      }

      const groups = await groupRepo.findByCompanyId(companyId);

      return res.status(200).json({
        success: true,
        data: { groups }
      });
    }

    if (req.method === 'POST') {
      const { name, description, color, companyId: bodyCompanyId } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Group name is required'
        });
      }

      const companyId = bodyCompanyId || user.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          error: 'Bad Request',
          message: 'Company ID is required'
        });
      }

      const group = await groupRepo.create({
        name,
        description,
        color,
        createdBy: userId,
        companyId
      });

      return res.status(201).json({
        success: true,
        data: { group }
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed',
      message: `Method ${req.method} is not allowed`
    });
  } catch (error) {
    console.error('Groups API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
