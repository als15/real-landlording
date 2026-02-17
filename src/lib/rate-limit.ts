/**
 * Simple in-memory rate limiter
 *
 * Tracks request counts per key within sliding time windows.
 * Suitable for single-instance deployments. For multi-instance,
 * consider upgrading to @upstash/ratelimit with Redis.
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if a request is allowed under the rate limit
 *
 * @param key - Unique identifier (e.g., `login:${ip}`)
 * @param limit - Max requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean }
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { allowed: boolean } {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= limit) {
    return { allowed: false };
  }

  entry.count++;
  return { allowed: true };
}

/**
 * Reset rate limit state (for testing)
 */
export function resetRateLimits(): void {
  rateLimitMap.clear();
}
