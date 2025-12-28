import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../auth/[...nextauth]';
import { getApiKeyService } from '@/lib/services/api-key.service';
import { withErrorHandler } from '@/lib/error-handler';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';

/**
 * API Key Revocation
 *
 * POST /api/v1/api-keys/[id]/revoke - Revoke (deactivate) API key
 */

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Require session authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    throw new ValidationError('Invalid API key ID');
  }

  const apiKeyService = getApiKeyService();
  const userId = session.user.id;

  // Revoke the API key
  const revoked = await apiKeyService.revokeApiKey(id, userId);

  if (!revoked) {
    throw new NotFoundError('API key');
  }

  return res.status(200).json({
    success: true,
    message: 'API key revoked successfully',
  });
});
