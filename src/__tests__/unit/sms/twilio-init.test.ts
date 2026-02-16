/**
 * Tests for Twilio SMS Module Initialization
 *
 * Ensures the Twilio module doesn't crash when credentials are not configured.
 * This was a bug where the module would fail at import time with invalid placeholder credentials.
 */

describe('Twilio Module Initialization', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset modules to test fresh imports
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('Without Credentials', () => {
    beforeEach(() => {
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;
    });

    it('should not throw when importing the module without credentials', async () => {
      // This should not throw - the bug was that it crashed at import time
      await expect(import('@/lib/sms/twilio')).resolves.not.toThrow();
    });

    it('should report SMS as disabled when credentials are missing', async () => {
      const { isSmsEnabled } = await import('@/lib/sms/twilio');
      expect(isSmsEnabled).toBe(false);
    });

    it('should return null from getTwilioClient when disabled', async () => {
      const { getTwilioClient } = await import('@/lib/sms/twilio');
      expect(getTwilioClient()).toBeNull();
    });

    it('should throw when trying to send SMS without credentials', async () => {
      const { twilioClient } = await import('@/lib/sms/twilio');

      await expect(
        twilioClient.messages.create({
          body: 'Test message',
          from: '+1234567890',
          to: '+1234567891',
        })
      ).rejects.toThrow('Twilio client not initialized');
    });
  });

  describe('With Partial Credentials', () => {
    it('should report SMS as disabled with only ACCOUNT_SID', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      delete process.env.TWILIO_AUTH_TOKEN;
      delete process.env.TWILIO_PHONE_NUMBER;

      const { isSmsEnabled } = await import('@/lib/sms/twilio');
      expect(isSmsEnabled).toBe(false);
    });

    it('should report SMS as disabled without PHONE_NUMBER', async () => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123';
      process.env.TWILIO_AUTH_TOKEN = 'testtoken';
      delete process.env.TWILIO_PHONE_NUMBER;

      const { isSmsEnabled } = await import('@/lib/sms/twilio');
      expect(isSmsEnabled).toBe(false);
    });
  });

  describe('With Valid Credentials', () => {
    beforeEach(() => {
      process.env.TWILIO_ACCOUNT_SID = 'ACtest123456789012345678901234';
      process.env.TWILIO_AUTH_TOKEN = 'testtoken123456789012345678901';
      process.env.TWILIO_PHONE_NUMBER = '+15551234567';
    });

    it('should report SMS as enabled with all credentials', async () => {
      const { isSmsEnabled } = await import('@/lib/sms/twilio');
      expect(isSmsEnabled).toBe(true);
    });

    it('should return correct FROM_PHONE', async () => {
      const { FROM_PHONE } = await import('@/lib/sms/twilio');
      expect(FROM_PHONE).toBe('+15551234567');
    });
  });
});
