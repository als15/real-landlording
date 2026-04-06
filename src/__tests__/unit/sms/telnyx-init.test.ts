/**
 * Tests for SMS Module (Telnyx provider)
 *
 * Ensures the SMS module is correctly gated by environment variables.
 * SMS_ENABLED must be 'true' AND Telnyx credentials must be present.
 */

// Clear relevant env vars before each test to isolate state
const originalEnv = process.env;

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  delete process.env.SMS_ENABLED;
  delete process.env.TELNYX_API_KEY;
  delete process.env.TELNYX_PHONE_NUMBER;
});

afterAll(() => {
  process.env = originalEnv;
});

describe('SMS Module - Telnyx Provider', () => {
  it('should not throw when importing the module', async () => {
    await expect(import('@/lib/sms/telnyx')).resolves.not.toThrow();
  });

  it('should report SMS as disabled when no env vars are set', async () => {
    const { isSmsEnabled } = await import('@/lib/sms/telnyx');
    expect(isSmsEnabled).toBe(false);
  });

  it('should report SMS as disabled when only API key is set', async () => {
    process.env.TELNYX_API_KEY = 'test-key';
    const { isSmsEnabled } = await import('@/lib/sms/telnyx');
    expect(isSmsEnabled).toBe(false);
  });

  it('should report SMS as disabled when credentials exist but SMS_ENABLED is not true', async () => {
    process.env.TELNYX_API_KEY = 'test-key';
    process.env.TELNYX_PHONE_NUMBER = '+15551234567';
    const { isSmsEnabled } = await import('@/lib/sms/telnyx');
    expect(isSmsEnabled).toBe(false);
  });

  it('should report SMS as enabled only when SMS_ENABLED=true and all credentials are set', async () => {
    process.env.SMS_ENABLED = 'true';
    process.env.TELNYX_API_KEY = 'test-key';
    process.env.TELNYX_PHONE_NUMBER = '+15551234567';
    const { isSmsEnabled } = await import('@/lib/sms/telnyx');
    expect(isSmsEnabled).toBe(true);
  });

  it('should throw when calling sendSmsMessage without API key', async () => {
    const { sendSmsMessage } = await import('@/lib/sms/telnyx');
    await expect(sendSmsMessage('+15551234567', 'test')).rejects.toThrow(
      'TELNYX_API_KEY is not configured'
    );
  });

  it('should export FROM_PHONE from environment', async () => {
    process.env.TELNYX_PHONE_NUMBER = '+15559876543';
    const { FROM_PHONE } = await import('@/lib/sms/telnyx');
    expect(FROM_PHONE).toBe('+15559876543');
  });

  it('should export empty FROM_PHONE when env var is absent', async () => {
    const { FROM_PHONE } = await import('@/lib/sms/telnyx');
    expect(FROM_PHONE).toBe('');
  });
});
