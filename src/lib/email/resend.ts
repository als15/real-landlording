import { Resend } from 'resend';

// Use a placeholder key if not set - actual sends will be skipped
const apiKey = process.env.RESEND_API_KEY || 're_placeholder_key';

if (!process.env.RESEND_API_KEY) {
  console.warn('RESEND_API_KEY is not set - emails will not be sent');
}

export const resend = new Resend(apiKey);

// Check if we should actually send emails
export const isEmailEnabled = !!process.env.RESEND_API_KEY;

// Default from email - update this to your verified domain
export const FROM_EMAIL = process.env.FROM_EMAIL || 'Real Landlording <onboarding@resend.dev>';

// Vendor welcome emails come from Sheryl
export const VENDOR_WELCOME_FROM_EMAIL = 'Sheryl @ Real Landlording <sheryl@reallandlording.com>';

// Admin notification email address
export const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@reallandlording.com';

// Email types
export type EmailType =
  | 'vendor_intro'
  | 'landlord_intro'
  | 'follow_up'
  | 'vendor_welcome'
  | 'vendor_rejected'
  | 'request_received';
