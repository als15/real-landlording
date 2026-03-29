/**
 * Tests for Mailchimp Client
 *
 * Covers feature flag, MD5 hashing, and graceful behavior when unconfigured.
 */

describe('Mailchimp Client', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isMailchimpConfigured', () => {
    it('should return false when no env vars are set', async () => {
      delete process.env.MAILCHIMP_API_KEY;
      delete process.env.MAILCHIMP_SERVER_PREFIX;
      delete process.env.MAILCHIMP_AUDIENCE_ID;

      const { isMailchimpConfigured } = await import('@/lib/mailchimp/client');
      expect(isMailchimpConfigured()).toBe(false);
    });

    it('should return false when only some env vars are set', async () => {
      process.env.MAILCHIMP_API_KEY = 'test-key';
      delete process.env.MAILCHIMP_SERVER_PREFIX;
      delete process.env.MAILCHIMP_AUDIENCE_ID;

      const { isMailchimpConfigured } = await import('@/lib/mailchimp/client');
      expect(isMailchimpConfigured()).toBe(false);
    });

    it('should return true when all env vars are set', async () => {
      process.env.MAILCHIMP_API_KEY = 'test-key-us14';
      process.env.MAILCHIMP_SERVER_PREFIX = 'us14';
      process.env.MAILCHIMP_AUDIENCE_ID = 'abc123';

      const { isMailchimpConfigured } = await import('@/lib/mailchimp/client');
      expect(isMailchimpConfigured()).toBe(true);
    });
  });

  describe('subscriberHash', () => {
    it('should return MD5 hash of lowercased email', async () => {
      const { subscriberHash } = await import('@/lib/mailchimp/client');
      // MD5 of "test@example.com"
      expect(subscriberHash('test@example.com')).toBe('55502f40dc8b7c769880b10874abc9d0');
    });

    it('should normalize email case', async () => {
      const { subscriberHash } = await import('@/lib/mailchimp/client');
      expect(subscriberHash('Test@Example.COM')).toBe(subscriberHash('test@example.com'));
    });

    it('should trim whitespace', async () => {
      const { subscriberHash } = await import('@/lib/mailchimp/client');
      expect(subscriberHash('  test@example.com  ')).toBe(subscriberHash('test@example.com'));
    });
  });

  describe('addSubscriber (unconfigured)', () => {
    it('should skip silently and return success when not configured', async () => {
      delete process.env.MAILCHIMP_API_KEY;
      delete process.env.MAILCHIMP_SERVER_PREFIX;
      delete process.env.MAILCHIMP_AUDIENCE_ID;

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      const { addSubscriber } = await import('@/lib/mailchimp/subscribers');

      const result = await addSubscriber({
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        tag: 'landlord',
      });

      expect(result.success).toBe(true);
      expect(consoleSpy).toHaveBeenCalledWith('[Mailchimp] SKIPPED — not configured');
      consoleSpy.mockRestore();
    });
  });
});
