import { twilioClient, FROM_PHONE, isSmsEnabled } from './twilio';
import {
  requestReceivedSms,
  landlordIntroSms,
  vendorIntroSms,
  followUpSms,
  vendorWelcomeSms,
  vendorRejectedSms,
  noVendorMatchedSms,
  vendorApplicationReceivedSms,
} from './templates';
import { ServiceRequest, Vendor } from '@/types/database';

// Helper to add delay between API calls to avoid rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Format phone number to E.164 format for Twilio
function formatPhoneNumber(phone: string): string | null {
  if (!phone) return null;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Handle US numbers
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  // If already has country code or is international
  if (digits.length > 10) {
    return `+${digits}`;
  }

  // Invalid number
  console.warn(`[SMS] Invalid phone number format: ${phone}`);
  return null;
}

// Send SMS with error handling
async function sendSms(to: string, message: string): Promise<boolean> {
  console.log(`[SMS] ========== SMS ATTEMPT ==========`);
  console.log(`[SMS] To: ${to}`);
  console.log(`[SMS] Message length: ${message.length} chars`);
  console.log(`[SMS] isSmsEnabled: ${isSmsEnabled}`);

  if (!isSmsEnabled) {
    console.log(`[SMS] SKIPPED - Twilio credentials not configured in environment`);
    return false;
  }

  const formattedPhone = formatPhoneNumber(to);
  if (!formattedPhone) {
    console.log(`[SMS] SKIPPED - Invalid phone number: ${to}`);
    return false;
  }

  try {
    console.log(`[SMS] Calling Twilio API...`);
    const result = await twilioClient.messages.create({
      body: message,
      from: FROM_PHONE,
      to: formattedPhone,
    });

    console.log(`[SMS] SUCCESS - Message SID: ${result.sid}`);
    console.log(`[SMS] Status: ${result.status}`);
    console.log(`[SMS] ====================================`);
    return true;
  } catch (error) {
    console.error(`[SMS] ERROR:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

// Send confirmation when landlord submits request
export async function sendRequestReceivedSms(request: ServiceRequest): Promise<boolean> {
  if (!request.landlord_phone) {
    console.log(`[SMS] SKIPPED - No phone number for landlord`);
    return false;
  }
  const message = requestReceivedSms(request);
  return sendSms(request.landlord_phone, message);
}

// Send intro SMS when vendors are matched
export async function sendIntroSms(
  request: ServiceRequest,
  vendors: Vendor[]
): Promise<{ landlordSent: boolean; vendorsSent: number }> {
  // Send to landlord
  let landlordSent = false;
  if (request.landlord_phone) {
    const landlordMessage = landlordIntroSms(request, vendors);
    landlordSent = await sendSms(request.landlord_phone, landlordMessage);
  } else {
    console.log(`[SMS] SKIPPED landlord intro - No phone number`);
  }

  // Send to each vendor with delay to avoid rate limiting
  let vendorsSent = 0;
  for (const vendor of vendors) {
    if (vendor.phone) {
      await delay(600); // 600ms delay between SMS
      const vendorMessage = vendorIntroSms(request, vendor);
      const sent = await sendSms(vendor.phone, vendorMessage);
      if (sent) vendorsSent++;
    } else {
      console.log(`[SMS] SKIPPED vendor ${vendor.business_name} - No phone number`);
    }
  }

  return { landlordSent, vendorsSent };
}

// Send follow-up SMS to landlord
export async function sendFollowUpSms(
  request: ServiceRequest,
  vendorNames: string[]
): Promise<boolean> {
  if (!request.landlord_phone) {
    console.log(`[SMS] SKIPPED - No phone number for landlord`);
    return false;
  }
  const message = followUpSms(request, vendorNames);
  return sendSms(request.landlord_phone, message);
}

// Send welcome SMS to approved vendor
export async function sendVendorWelcomeSms(vendor: Vendor): Promise<boolean> {
  if (!vendor.phone) {
    console.log(`[SMS] SKIPPED - No phone number for vendor`);
    return false;
  }
  const message = vendorWelcomeSms(vendor);
  return sendSms(vendor.phone, message);
}

// Send rejection SMS to vendor
export async function sendVendorRejectedSms(vendor: Vendor): Promise<boolean> {
  if (!vendor.phone) {
    console.log(`[SMS] SKIPPED - No phone number for vendor`);
    return false;
  }
  const message = vendorRejectedSms(vendor);
  return sendSms(vendor.phone, message);
}

// Send SMS when no vendors matched for a request
export async function sendNoVendorMatchedSms(request: ServiceRequest): Promise<boolean> {
  if (!request.landlord_phone) {
    console.log(`[SMS] SKIPPED - No phone number for landlord`);
    return false;
  }
  const message = noVendorMatchedSms(request);
  return sendSms(request.landlord_phone, message);
}

// Send confirmation SMS when vendor submits an application
export async function sendVendorApplicationReceivedSms(vendor: {
  contact_name: string;
  phone?: string;
}): Promise<boolean> {
  if (!vendor.phone) {
    console.log(`[SMS] SKIPPED - No phone number for vendor`);
    return false;
  }
  const message = vendorApplicationReceivedSms(vendor);
  return sendSms(vendor.phone, message);
}
