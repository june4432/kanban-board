import crypto from 'crypto';
import { query, queryOne, queryAll } from '@/lib/postgres';
import { v4 as uuidv4 } from 'uuid';

/**
 * API Key Service (PostgreSQL)
 *
 * AWS-style API key generation and management:
 * - Format: sk_live_[32-char-random] or sk_test_[32-char-random]
 * - Storage: Only hash is stored, never the full key
 * - Security: SHA-256 hashing with prefix for identification
 */

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string;
  isActive: boolean;
  lastUsedAt: string | null;
  usageCount: number;
  createdAt: string;
  expiresAt: string | null;
  createdIp: string | null;
  lastUsedIp: string | null;
  userAgent: string | null;
}

export interface CreateApiKeyInput {
  userId: string;
  name: string;
  scopes?: string[]; // ['read', 'write', 'admin']
  expiresAt?: string | null;
  createdIp?: string;
  userAgent?: string;
  environment?: 'live' | 'test';
}

export interface ApiKeyWithSecret {
  apiKey: ApiKey;
  secret: string; // Full key - only returned once on creation!
}

export interface ValidateApiKeyResult {
  valid: boolean;
  apiKey?: ApiKey;
  reason?: string;
}

export class ApiKeyService {
  // No constructor needed - uses global connection pool

  /**
   * Map database row (snake_case) to ApiKey interface (camelCase)
   */
  private mapDbRowToApiKey(row: any): ApiKey {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      keyPrefix: row.key_prefix,
      keyHash: row.key_hash,
      scopes: row.scopes,
      isActive: row.is_active,
      lastUsedAt: row.last_used_at,
      usageCount: row.usage_count || 0,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      createdIp: row.created_ip,
      lastUsedIp: row.last_used_ip,
      userAgent: row.user_agent,
    };
  }

  /**
   * Generate a new API key
   * Returns the full key ONLY ONCE - it will never be retrievable again!
   */
  async generateApiKey(input: CreateApiKeyInput): Promise<ApiKeyWithSecret> {
    const env = input.environment || 'live';
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars base64url
    const randomPart = randomBytes.toString('base64url').substring(0, 32);

    // Format: sk_live_... or sk_test_...
    const secret = `sk_${env}_${randomPart}`;

    // Extract prefix (first 10 chars for identification)
    const keyPrefix = secret.substring(0, 10);

    // Hash the full key for storage
    const keyHash = this.hashApiKey(secret);

    // Create API key record
    const scopes = JSON.stringify(input.scopes || ['read', 'write']);
    const id = uuidv4();

    const dbRow = await queryOne(`
      INSERT INTO api_keys (
        id, user_id, name, key_prefix, key_hash, scopes,
        expires_at, created_ip, user_agent, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *
    `, [
      id,
      input.userId,
      input.name,
      keyPrefix,
      keyHash,
      scopes,
      input.expiresAt || null,
      input.createdIp || null,
      input.userAgent || null
    ]);

    const apiKey = this.mapDbRowToApiKey(dbRow);

    return {
      apiKey,
      secret, // ⚠️ ONLY time the full key is returned!
    };
  }

  /**
   * Hash an API key using SHA-256
   */
  hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }

  /**
   * Validate an API key and return user info if valid
   */
  async validateApiKey(apiKey: string): Promise<ValidateApiKeyResult> {
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return { valid: false, reason: 'Invalid API key format' };
    }

    const keyHash = this.hashApiKey(apiKey);

    const dbRow = await queryOne(`
      SELECT * FROM api_keys
      WHERE key_hash = $1 AND is_active = true
    `, [keyHash]);

    if (!dbRow) {
      return { valid: false, reason: 'API key not found or inactive' };
    }

    const apiKeyRecord = this.mapDbRowToApiKey(dbRow);

    // Check expiration
    if (apiKeyRecord.expiresAt) {
      const expiresAt = new Date(apiKeyRecord.expiresAt);
      if (expiresAt < new Date()) {
        return { valid: false, reason: 'API key expired' };
      }
    }

    return { valid: true, apiKey: apiKeyRecord };
  }

  /**
   * Update last used timestamp and increment usage count
   */
  async updateLastUsed(apiKeyId: string, ipAddress?: string): Promise<void> {
    await query(`
      UPDATE api_keys
      SET last_used_at = NOW(),
          last_used_ip = COALESCE($1, last_used_ip)
      WHERE id = $2
    `, [ipAddress || null, apiKeyId]);
  }

  /**
   * Revoke (deactivate) an API key
   */
  async revokeApiKey(apiKeyId: string, userId: string): Promise<boolean> {
    const result = await query(`
      UPDATE api_keys
      SET is_active = false
      WHERE id = $1 AND user_id = $2
    `, [apiKeyId, userId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * Delete an API key permanently
   */
  async deleteApiKey(apiKeyId: string, userId: string): Promise<boolean> {
    const result = await query(`
      DELETE FROM api_keys
      WHERE id = $1 AND user_id = $2
    `, [apiKeyId, userId]);

    return (result.rowCount ?? 0) > 0;
  }

  /**
   * List all API keys for a user (without secrets!)
   */
  async listUserApiKeys(userId: string): Promise<ApiKey[]> {
    const dbRows = await queryAll(`
      SELECT * FROM api_keys
      WHERE user_id = $1
      ORDER BY created_at DESC
    `, [userId]);

    return dbRows.map(row => this.mapDbRowToApiKey(row));
  }

  /**
   * Get API key by ID (for management, not authentication)
   */
  async getApiKeyById(apiKeyId: string, userId: string): Promise<ApiKey | undefined> {
    const dbRow = await queryOne(`
      SELECT * FROM api_keys
      WHERE id = $1 AND user_id = $2
    `, [apiKeyId, userId]);

    return dbRow ? this.mapDbRowToApiKey(dbRow) : undefined;
  }

  /**
   * Update API key settings
   */
  async updateApiKey(
    apiKeyId: string,
    userId: string,
    updates: {
      name?: string;
      scopes?: string[];
      expiresAt?: string | null;
    }
  ): Promise<ApiKey | undefined> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }

    if (updates.scopes !== undefined) {
      fields.push(`scopes = $${paramIndex++}`);
      values.push(JSON.stringify(updates.scopes));
    }

    if (updates.expiresAt !== undefined) {
      fields.push(`expires_at = $${paramIndex++}`);
      values.push(updates.expiresAt);
    }

    if (fields.length === 0) {
      return this.getApiKeyById(apiKeyId, userId);
    }

    values.push(apiKeyId, userId);

    const dbRow = await queryOne(`
      UPDATE api_keys
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
      RETURNING *
    `, values);

    return dbRow ? this.mapDbRowToApiKey(dbRow) : undefined;
  }

  /**
   * Get usage statistics for an API key
   */
  async getUsageStats(apiKeyId: string, userId: string, _days: number = 30): Promise<{
    totalRequests: number;
    lastUsedAt: string | null;
    isActive: boolean;
  }> {
    // Verify ownership and get basic stats
    const apiKey = await this.getApiKeyById(apiKeyId, userId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    return {
      totalRequests: apiKey.usageCount,
      lastUsedAt: apiKey.lastUsedAt,
      isActive: apiKey.isActive,
    };
  }

  /**
   * Cleanup expired API keys
   */
  async cleanup(): Promise<{ keysDeleted: number }> {
    // Delete expired keys that haven't been used in 30 days
    const result = await query(`
      DELETE FROM api_keys
      WHERE expires_at < NOW()
        AND (last_used_at IS NULL OR last_used_at < NOW() - INTERVAL '30 days')
    `);

    return {
      keysDeleted: result.rowCount ?? 0,
    };
  }
}

// Singleton instance for convenience
let _apiKeyService: ApiKeyService | null = null;

export function getApiKeyService(): ApiKeyService {
  if (!_apiKeyService) {
    _apiKeyService = new ApiKeyService();
  }
  return _apiKeyService;
}
