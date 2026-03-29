/**
 * Tests for SMS Module (stub while Telnyx campaign is pending)
 *
 * Ensures the SMS module is safely disabled until Telnyx is configured.
 */

describe('SMS Module Initialization (Telnyx pending)', () => {
  it('should not throw when importing the module', async () => {
    await expect(import('@/lib/sms/twilio')).resolves.not.toThrow();
  });

  it('should report SMS as disabled', async () => {
    const { isSmsEnabled } = await import('@/lib/sms/twilio');
    expect(isSmsEnabled).toBe(false);
  });

  it('should throw when trying to send SMS', async () => {
    const { twilioClient } = await import('@/lib/sms/twilio');

    await expect(
      twilioClient.messages.create({
        body: 'Test message',
        from: '+1234567890',
        to: '+1234567891',
      })
    ).rejects.toThrow('SMS provider not configured');
  });
});
