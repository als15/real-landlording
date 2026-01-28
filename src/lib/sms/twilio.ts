import twilio from 'twilio';

// Use placeholder credentials if not set - actual sends will be skipped
const accountSid = process.env.TWILIO_ACCOUNT_SID || 'AC_placeholder';
const authToken = process.env.TWILIO_AUTH_TOKEN || 'placeholder_token';
const fromNumber = process.env.TWILIO_PHONE_NUMBER || '+1234567890';

if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
  console.warn('TWILIO credentials not set - SMS will not be sent');
}

export const twilioClient = twilio(accountSid, authToken);

// Check if we should actually send SMS
export const isSmsEnabled = !!(
  process.env.TWILIO_ACCOUNT_SID &&
  process.env.TWILIO_AUTH_TOKEN &&
  process.env.TWILIO_PHONE_NUMBER
);

// From phone number for sending SMS
export const FROM_PHONE = fromNumber;

// SMS types (mirrors email types)
export type SmsType =
  | 'vendor_intro'
  | 'landlord_intro'
  | 'follow_up'
  | 'vendor_welcome'
  | 'vendor_rejected'
  | 'request_received';
