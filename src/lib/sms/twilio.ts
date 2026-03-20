// SMS provider stub - Twilio removed, Telnyx pending campaign approval
// Once Telnyx is ready, replace this file with the Telnyx implementation.

// SMS is disabled until Telnyx is configured
export const isSmsEnabled = false;

export const FROM_PHONE = '';

export const twilioClient = {
  messages: {
    create: async (_options: { body: string; from: string; to: string }): Promise<{ sid: string; status: string }> => {
      console.warn('[SMS] SMS provider not configured - Telnyx pending');
      throw new Error('SMS provider not configured');
    },
  },
};

// SMS types (mirrors email types)
export type SmsType =
  | 'vendor_intro'
  | 'landlord_intro'
  | 'follow_up'
  | 'vendor_welcome'
  | 'vendor_rejected'
  | 'request_received';
