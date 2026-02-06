import twilio from 'twilio';
import type { Twilio } from 'twilio';

// Check if we should actually send SMS
export const isSmsEnabled = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

// From phone number for sending SMS
export const FROM_PHONE = process.env.TWILIO_PHONE_NUMBER || '';

// Lazy-initialized Twilio client - only created when needed and credentials exist
let _twilioClient: Twilio | null = null;

export function getTwilioClient(): Twilio | null {
  if (!isSmsEnabled) {
    return null;
  }

  if (!_twilioClient) {
    _twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_AUTH_TOKEN!
    );
  }

  return _twilioClient;
}

// For backward compatibility - but prefer getTwilioClient()
export const twilioClient = {
  messages: {
    create: async (options: { body: string; from: string; to: string }) => {
      const client = getTwilioClient();
      if (!client) {
        throw new Error('Twilio client not initialized - credentials missing');
      }
      return client.messages.create(options);
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
