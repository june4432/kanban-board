import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { getApiKeyService } from '@/lib/services/api-key.service';
import { withErrorHandler } from '@/lib/error-handler';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';

/**
 * API Key Usage Statistics
 *
 * GET /api/v1/api-keys/[id]/usage?days=30 - Get usage statistics
 */

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Require session authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id, days } = req.query;
  if (typeof id !== 'string') {
    throw new ValidationError('Invalid API key ID');
  }

  const apiKeyService = getApiKeyService();
  const userId = session.user.id;

  // Parse days parameter (default: 30)
  const daysNum = days && typeof days === 'string' ? parseInt(days, 10) : 30;
  if (isNaN(daysNum) || daysNum < 1 || daysNum > 365) {
    throw new ValidationError('Days must be between 1 and 365');
  }

  try {
    // Get usage statistics
    const stats = await apiKeyService.getUsageStats(id, userId, daysNum);

    return res.status(200).json({
      apiKeyId: id,
      period: {
        days: daysNum,
        from: new Date(Date.now() - daysNum * 24 * 60 * 60 * 1000).toISOString(),
        to: new Date().toISOString(),
      },
      stats,
    });
  } catch (error: any) {
    if (error.message === 'API key not found') {
      throw new NotFoundError('API key');
    }
    throw error;
  }
});
