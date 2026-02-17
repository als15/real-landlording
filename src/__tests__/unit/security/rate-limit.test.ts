/**
 * Tests for in-memory rate limiter
 */

import { rateLimit, resetRateLimits } from '@/lib/rate-limit';

describe('Rate Limiter', () => {
  beforeEach(() => {
    resetRateLimits();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should allow the first request', () => {
    const result = rateLimit('test-key', 5, 60000);
    expect(result.allowed).toBe(true);
  });

  it('should allow requests up to the limit', () => {
    for (let i = 0; i < 5; i++) {
      const result = rateLimit('test-key', 5, 60000);
      expect(result.allowed).toBe(true);
    }
  });

  it('should block requests exceeding the limit', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('test-key', 5, 60000);
    }
    const result = rateLimit('test-key', 5, 60000);
    expect(result.allowed).toBe(false);
  });

  it('should reset after window expires', () => {
    // Use up the limit
    for (let i = 0; i < 5; i++) {
      rateLimit('test-key', 5, 60000);
    }
    expect(rateLimit('test-key', 5, 60000).allowed).toBe(false);

    // Advance time past the window
    jest.advanceTimersByTime(60001);

    // Should be allowed again
    expect(rateLimit('test-key', 5, 60000).allowed).toBe(true);
  });

  it('should track different keys independently', () => {
    // Use up limit for key-a
    for (let i = 0; i < 3; i++) {
      rateLimit('key-a', 3, 60000);
    }
    expect(rateLimit('key-a', 3, 60000).allowed).toBe(false);

    // key-b should still be allowed
    expect(rateLimit('key-b', 3, 60000).allowed).toBe(true);
  });

  it('should handle limit of 1', () => {
    expect(rateLimit('one-shot', 1, 60000).allowed).toBe(true);
    expect(rateLimit('one-shot', 1, 60000).allowed).toBe(false);
  });

  it('should handle concurrent different windows', () => {
    // Login: 5 per 15 min
    for (let i = 0; i < 5; i++) {
      rateLimit('login:1.2.3.4', 5, 15 * 60 * 1000);
    }
    expect(rateLimit('login:1.2.3.4', 5, 15 * 60 * 1000).allowed).toBe(false);

    // Password reset: 3 per hour (same IP, different key prefix)
    expect(rateLimit('reset:1.2.3.4', 3, 60 * 60 * 1000).allowed).toBe(true);
  });
});
