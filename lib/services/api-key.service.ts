import crypto from 'crypto';
import type { Database } from 'better-sqlite3';

/**
 * API Key Service
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
  isActive: number;
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
  constructor(private db: Database) {}

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
      usageCount: row.usage_count,
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
  generateApiKey(input: CreateApiKeyInput): ApiKeyWithSecret {
    const env = input.environment || 'live';
    const randomBytes = crypto.randomBytes(24); // 24 bytes = 32 chars base64url
    const randomPart = randomBytes.toString('base64url').substring(0, 32);

    // Format: sk_live_... or sk_test_...
    const secret = `sk_${env}_${randomPart}`;

    // Extract prefix (first 12 chars for identification)
    const keyPrefix = secret.substring(0, 12); // e.g., "sk_live_abcd"

    // Hash the full key for storage
    const keyHash = this.hashApiKey(secret);

    // Create API key record
    const scopes = input.scopes?.join(',') || 'read,write';

    const dbRow = this.db.prepare(`
      INSERT INTO api_keys (
        user_id, name, key_prefix, key_hash, scopes,
        expires_at, created_ip, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *
    `).get(
      input.userId,
      input.name,
      keyPrefix,
      keyHash,
      scopes,
      input.expiresAt || null,
      input.createdIp || null,
      input.userAgent || null
    );

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
  validateApiKey(apiKey: string): ValidateApiKeyResult {
    if (!apiKey || !apiKey.startsWith('sk_')) {
      return { valid: false, reason: 'Invalid API key format' };
    }

    const keyHash = this.hashApiKey(apiKey);

    const dbRow = this.db.prepare(`
      SELECT * FROM api_keys
      WHERE key_hash = ? AND is_active = 1
    `).get(keyHash);

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
  updateLastUsed(apiKeyId: string, ipAddress?: string): void {
    this.db.prepare(`
      UPDATE api_keys
      SET last_used_at = datetime('now'),
          usage_count = usage_count + 1,
          last_used_ip = COALESCE(?, last_used_ip)
      WHERE id = ?
    `).run(ipAddress || null, apiKeyId);
  }

  /**
   * Log API key usage for audit trail
   */
  logUsage(
    apiKeyId: string,
    method: string,
    endpoint: string,
    statusCode: number,
    ipAddress?: string,
    userAgent?: string
  ): void {
    this.db.prepare(`
      INSERT INTO api_key_usage_logs (
        api_key_id, method, endpoint, status_code, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      apiKeyId,
      method,
      endpoint,
      statusCode,
      ipAddress || null,
      userAgent || null
    );
  }

  /**
   * Revoke (deactivate) an API key
   */
  revokeApiKey(apiKeyId: string, userId: string): boolean {
    const result = this.db.prepare(`
      UPDATE api_keys
      SET is_active = 0
      WHERE id = ? AND user_id = ?
    `).run(apiKeyId, userId);

    return result.changes > 0;
  }

  /**
   * Delete an API key permanently
   */
  deleteApiKey(apiKeyId: string, userId: string): boolean {
    const result = this.db.prepare(`
      DELETE FROM api_keys
      WHERE id = ? AND user_id = ?
    `).run(apiKeyId, userId);

    return result.changes > 0;
  }

  /**
   * List all API keys for a user (without secrets!)
   */
  listUserApiKeys(userId: string): ApiKey[] {
    const dbRows = this.db.prepare(`
      SELECT * FROM api_keys
      WHERE user_id = ?
      ORDER BY created_at DESC
    `).all(userId);

    return dbRows.map(row => this.mapDbRowToApiKey(row));
  }

  /**
   * Get API key by ID (for management, not authentication)
   */
  getApiKeyById(apiKeyId: string, userId: string): ApiKey | undefined {
    const dbRow = this.db.prepare(`
      SELECT * FROM api_keys
      WHERE id = ? AND user_id = ?
    `).get(apiKeyId, userId);

    return dbRow ? this.mapDbRowToApiKey(dbRow) : undefined;
  }

  /**
   * Update API key settings
   */
  updateApiKey(
    apiKeyId: string,
    userId: string,
    updates: {
      name?: string;
      scopes?: string[];
      expiresAt?: string | null;
    }
  ): ApiKey | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.scopes !== undefined) {
      fields.push('scopes = ?');
      values.push(updates.scopes.join(','));
    }

    if (updates.expiresAt !== undefined) {
      fields.push('expires_at = ?');
      values.push(updates.expiresAt);
    }

    if (fields.length === 0) {
      return this.getApiKeyById(apiKeyId, userId);
    }

    values.push(apiKeyId, userId);

    const dbRow = this.db.prepare(`
      UPDATE api_keys
      SET ${fields.join(', ')}
      WHERE id = ? AND user_id = ?
      RETURNING *
    `).get(...values);

    return dbRow ? this.mapDbRowToApiKey(dbRow) : undefined;
  }

  /**
   * Get usage statistics for an API key
   */
  getUsageStats(apiKeyId: string, userId: string, days: number = 30): {
    totalRequests: number;
    successRate: number;
    requestsByDay: Array<{ date: string; count: number }>;
    requestsByEndpoint: Array<{ endpoint: string; count: number }>;
  } {
    // Verify ownership
    const apiKey = this.getApiKeyById(apiKeyId, userId);
    if (!apiKey) {
      throw new Error('API key not found');
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // Total requests
    const totalResult = this.db.prepare(`
      SELECT COUNT(*) as count
      FROM api_key_usage_logs
      WHERE api_key_id = ? AND timestamp >= ?
    `).get(apiKeyId, since.toISOString()) as { count: number };

    // Success rate
    const successResult = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status_code >= 200 AND status_code < 400 THEN 1 ELSE 0 END) as success
      FROM api_key_usage_logs
      WHERE api_key_id = ? AND timestamp >= ?
    `).get(apiKeyId, since.toISOString()) as { total: number; success: number };

    const successRate = successResult.total > 0
      ? (successResult.success / successResult.total) * 100
      : 0;

    // Requests by day
    const requestsByDay = this.db.prepare(`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM api_key_usage_logs
      WHERE api_key_id = ? AND timestamp >= ?
      GROUP BY DATE(timestamp)
      ORDER BY date DESC
    `).all(apiKeyId, since.toISOString()) as Array<{ date: string; count: number }>;

    // Requests by endpoint
    const requestsByEndpoint = this.db.prepare(`
      SELECT
        endpoint,
        COUNT(*) as count
      FROM api_key_usage_logs
      WHERE api_key_id = ? AND timestamp >= ?
      GROUP BY endpoint
      ORDER BY count DESC
      LIMIT 10
    `).all(apiKeyId, since.toISOString()) as Array<{ endpoint: string; count: number }>;

    return {
      totalRequests: totalResult.count,
      successRate,
      requestsByDay,
      requestsByEndpoint,
    };
  }

  /**
   * Cleanup expired API keys and old usage logs
   */
  cleanup(daysToKeepLogs: number = 90): { keysDeleted: number; logsDeleted: number } {
    // Delete expired keys that haven't been used in 30 days
    const expiredKeys = this.db.prepare(`
      DELETE FROM api_keys
      WHERE expires_at < datetime('now')
        AND (last_used_at IS NULL OR last_used_at < datetime('now', '-30 days'))
    `).run();

    // Delete old usage logs
    const oldLogs = this.db.prepare(`
      DELETE FROM api_key_usage_logs
      WHERE timestamp < datetime('now', '-' || ? || ' days')
    `).run(daysToKeepLogs);

    return {
      keysDeleted: expiredKeys.changes,
      logsDeleted: oldLogs.changes,
    };
  }
}
