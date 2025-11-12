/**
 * Rate Limiter Middleware
 * Simple in-memory rate limiting (use Redis in production)
 */

import { NextApiResponse } from 'next';
import { ApiRequest } from '../types';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store (use Redis in production!)
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  max: number; // Max requests per window
  keyGenerator?: (req: ApiRequest) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
}

/**
 * Default configuration:
 * - 100 requests per 15 minutes (API key auth)
 * - 1000 requests per 15 minutes (session auth)
 */
const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests
};

/**
 * Generate rate limit key from request
 */
function getKey(req: ApiRequest, config: RateLimitConfig): string {
  if (config.keyGenerator) {
    return config.keyGenerator(req);
  }

  // Use API key ID or user ID + IP
  if (req.isApiKeyAuth && req.user) {
    return `api-key:${req.user.id}`;
  }

  if (req.user) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown';
    return `session:${req.user.id}:${ip}`;
  }

  // Fallback to IP only
  const ip = (req.headers['x-forwarded-for'] as string) || req.socket?.remoteAddress || 'unknown';
  return `ip:${ip}`;
}

/**
 * Rate limiter middleware
 */
export function rateLimit(config: Partial<RateLimitConfig> = {}) {
  const cfg: RateLimitConfig = { ...defaultConfig, ...config };

  return (handler: (req: ApiRequest, res: NextApiResponse) => Promise<void>) => {
    return async (req: ApiRequest, res: NextApiResponse) => {
      const key = getKey(req, cfg);
      const now = Date.now();

      // Get or create entry
      let entry = rateLimitStore.get(key);

      // Reset if window expired
      if (!entry || entry.resetAt < now) {
        entry = {
          count: 0,
          resetAt: now + cfg.windowMs,
        };
        rateLimitStore.set(key, entry);
      }

      // Increment request count
      entry.count++;

      // Set rate limit headers
      const remaining = Math.max(0, cfg.max - entry.count);
      const resetTime = Math.ceil(entry.resetAt / 1000);

      res.setHeader('X-RateLimit-Limit', cfg.max);
      res.setHeader('X-RateLimit-Remaining', remaining);
      res.setHeader('X-RateLimit-Reset', resetTime);

      // Check if rate limit exceeded
      if (entry.count > cfg.max) {
        const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
        res.setHeader('Retry-After', retryAfter);

        return res.status(429).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          },
          meta: {
            requestId: req.requestId || 'unknown',
            timestamp: new Date().toISOString(),
          },
        });
      }

      // Continue to handler
      return handler(req, res);
    };
  };
}

/**
 * Strict rate limiter for expensive operations
 */
export function strictRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
  });
}

/**
 * Lenient rate limiter for read operations
 */
export function lenientRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // 1000 requests (for session auth)
  });
}

/**
 * Get current rate limit status for a key
 */
export function getRateLimitStatus(key: string): { count: number; remaining: number; resetAt: number } | null {
  const entry = rateLimitStore.get(key);
  if (!entry) return null;

  return {
    count: entry.count,
    remaining: Math.max(0, defaultConfig.max - entry.count),
    resetAt: entry.resetAt,
  };
}

/**
 * Reset rate limit for a key (admin use)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (admin use)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}
