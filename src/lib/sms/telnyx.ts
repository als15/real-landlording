import Telnyx from 'telnyx';

// SMS is enabled only when Telnyx credentials are configured
// IMPORTANT: To activate SMS, set TELNYX_API_KEY and TELNYX_PHONE_NUMBER in environment
// AND set SMS_ENABLED=true (double gate to prevent accidental activation)
export const isSmsEnabled =
  process.env.SMS_ENABLED === 'true' &&
  !!process.env.TELNYX_API_KEY &&
  !!process.env.TELNYX_PHONE_NUMBER;

export const FROM_PHONE = process.env.TELNYX_PHONE_NUMBER || '';

// Lazy-initialize client only when actually needed
let _client: Telnyx | null = null;

function getClient(): Telnyx {
  if (!_client) {
    if (!process.env.TELNYX_API_KEY) {
      throw new Error('TELNYX_API_KEY is not configured');
    }
    _client = new Telnyx({ apiKey: process.env.TELNYX_API_KEY });
  }
  return _client;
}

/**
 * Send an SMS message via Telnyx.
 * Returns the message ID on success, or throws on failure.
 */
export async function sendSmsMessage(
  to: string,
  body: string
): Promise<{ id: string }> {
  const client = getClient();
  const response = await client.messages.send({
    from: FROM_PHONE,
    to,
    text: body,
    type: 'SMS',
  });
  return { id: response.data?.id || 'unknown' };
}

// SMS types (mirrors email types)
export type SmsType =
  | 'vendor_intro'
  | 'landlord_intro'
  | 'follow_up'
  | 'vendor_welcome'
  | 'vendor_rejected'
  | 'request_received';
