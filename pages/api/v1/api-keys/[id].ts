import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';
import { ApiKeyService } from '@/lib/services/api-key.service';
import { withErrorHandler } from '@/lib/error-handler';
import { UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { validate } from '@/lib/validation';

/**
 * API Key Management - Individual Key
 *
 * GET    /api/v1/api-keys/[id] - Get API key details
 * PATCH  /api/v1/api-keys/[id] - Update API key
 * DELETE /api/v1/api-keys/[id] - Delete API key
 */

// Validation schema for updating API key
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.enum(['read', 'write', 'admin'])).min(1).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
});

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  // Require session authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  const { id } = req.query;
  if (typeof id !== 'string') {
    throw new ValidationError('Invalid API key ID');
  }

  const db = getDatabase();
  const apiKeyService = new ApiKeyService(db);
  const userId = session.user.id;

  switch (req.method) {
    case 'GET': {
      // Get API key details
      const apiKey = apiKeyService.getApiKeyById(id, userId);

      if (!apiKey) {
        throw new NotFoundError('API key');
      }

      return res.status(200).json({
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          scopes: apiKey.scopes.split(','),
          isActive: apiKey.isActive === 1,
          lastUsedAt: apiKey.lastUsedAt,
          usageCount: apiKey.usageCount,
          createdAt: apiKey.createdAt,
          expiresAt: apiKey.expiresAt,
          createdIp: apiKey.createdIp,
          lastUsedIp: apiKey.lastUsedIp,
        },
      });
    }

    case 'PATCH': {
      // Update API key
      const updates = validate(updateApiKeySchema, req.body);

      const updatedKey = apiKeyService.updateApiKey(id, userId, updates);

      if (!updatedKey) {
        throw new NotFoundError('API key');
      }

      return res.status(200).json({
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          keyPrefix: updatedKey.keyPrefix,
          scopes: updatedKey.scopes.split(','),
          isActive: updatedKey.isActive === 1,
          lastUsedAt: updatedKey.lastUsedAt,
          usageCount: updatedKey.usageCount,
          createdAt: updatedKey.createdAt,
          expiresAt: updatedKey.expiresAt,
        },
      });
    }

    case 'DELETE': {
      // Delete API key permanently
      const deleted = apiKeyService.deleteApiKey(id, userId);

      if (!deleted) {
        throw new NotFoundError('API key');
      }

      return res.status(200).json({
        success: true,
        message: 'API key deleted permanently',
      });
    }

    default:
      res.setHeader('Allow', ['GET', 'PATCH', 'DELETE']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
