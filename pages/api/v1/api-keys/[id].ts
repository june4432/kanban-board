import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getApiKeyService } from '@/lib/services/api-key.service';
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

// Helper to parse scopes
function parseScopes(scopes: string | string[]): string[] {
  try {
    return typeof scopes === 'string' ? JSON.parse(scopes) : scopes;
  } catch {
    return String(scopes).split(',');
  }
}

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

  const apiKeyService = getApiKeyService();
  const userId = session.user.id;

  switch (req.method) {
    case 'GET': {
      // Get API key details
      const apiKey = await apiKeyService.getApiKeyById(id, userId);

      if (!apiKey) {
        throw new NotFoundError('API key');
      }

      return res.status(200).json({
        apiKey: {
          id: apiKey.id,
          name: apiKey.name,
          keyPrefix: apiKey.keyPrefix,
          scopes: parseScopes(apiKey.scopes),
          isActive: apiKey.isActive,
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

      const updatedKey = await apiKeyService.updateApiKey(id, userId, updates);

      if (!updatedKey) {
        throw new NotFoundError('API key');
      }

      return res.status(200).json({
        apiKey: {
          id: updatedKey.id,
          name: updatedKey.name,
          keyPrefix: updatedKey.keyPrefix,
          scopes: parseScopes(updatedKey.scopes),
          isActive: updatedKey.isActive,
          lastUsedAt: updatedKey.lastUsedAt,
          usageCount: updatedKey.usageCount,
          createdAt: updatedKey.createdAt,
          expiresAt: updatedKey.expiresAt,
        },
      });
    }

    case 'DELETE': {
      // Delete API key permanently
      const deleted = await apiKeyService.deleteApiKey(id, userId);

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
