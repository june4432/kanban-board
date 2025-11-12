import { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]';
import { getDatabase } from '@/lib/database';
import { ApiKeyService } from '@/lib/services/api-key.service';
import { withErrorHandler } from '@/lib/error-handler';
import { UnauthorizedError, ValidationError } from '@/lib/errors';
import { z } from 'zod';
import { validate } from '@/lib/validation';

/**
 * API Keys Management
 *
 * GET    /api/v1/api-keys - List user's API keys
 * POST   /api/v1/api-keys - Create new API key
 */

// Validation schema for creating API key
const createApiKeySchema = z.object({
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name is too long'),
  scopes: z.array(z.enum(['read', 'write', 'admin']))
    .min(1, 'At least one scope is required')
    .default(['read', 'write']),
  expiresAt: z.string().datetime().nullable().optional(),
  environment: z.enum(['live', 'test']).default('live'),
});

export default withErrorHandler(async (req: NextApiRequest, res: NextApiResponse) => {
  // Require session authentication (this is for user management, not API key usage)
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) {
    throw new UnauthorizedError('Authentication required');
  }

  const db = getDatabase();
  const apiKeyService = new ApiKeyService(db);
  const userId = session.user.id;

  switch (req.method) {
    case 'GET': {
      // List user's API keys
      const apiKeys = apiKeyService.listUserApiKeys(userId);

      // Remove sensitive data before sending
      const sanitizedKeys = apiKeys.map(key => ({
        id: key.id,
        name: key.name,
        keyPrefix: key.keyPrefix,
        scopes: key.scopes.split(','),
        isActive: key.isActive === 1,
        lastUsedAt: key.lastUsedAt,
        usageCount: key.usageCount,
        createdAt: key.createdAt,
        expiresAt: key.expiresAt,
      }));

      return res.status(200).json({ apiKeys: sanitizedKeys });
    }

    case 'POST': {
      // Create new API key
      const input = validate(createApiKeySchema, req.body);

      // Get request metadata
      const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
      const userAgent = req.headers['user-agent'];

      // Generate API key
      const { apiKey, secret } = apiKeyService.generateApiKey({
        userId,
        name: input.name,
        scopes: input.scopes,
        expiresAt: input.expiresAt || null,
        createdIp: ipAddress,
        userAgent,
        environment: input.environment,
      });

      // Return the API key WITH the secret (only time it's ever shown!)
      return res.status(201).json({
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
        },
        secret, // ⚠️ IMPORTANT: Save this immediately - it will never be shown again!
        warning: 'Save this API key now! You will not be able to see it again.',
      });
    }

    default:
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }
});
