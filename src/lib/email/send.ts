import { resend, FROM_EMAIL, VENDOR_WELCOME_FROM_EMAIL, isEmailEnabled } from './resend';
import {
  requestReceivedEmail,
  landlordIntroEmail,
  vendorIntroEmail,
  followUpEmail,
  vendorWelcomeEmail,
  vendorRejectedEmail,
  noVendorMatchedEmail,
  vendorApplicationReceivedEmail,
} from './templates';
import { ServiceRequest, Vendor } from '@/types/database';

// Send email with error handling
async function sendEmail(to: string, subject: string, html: string, from: string = FROM_EMAIL): Promise<boolean> {
  console.log(`[Email] ========== EMAIL ATTEMPT ==========`);
  console.log(`[Email] To: ${to}`);
  console.log(`[Email] Subject: ${subject}`);
  console.log(`[Email] From: ${from}`);
  console.log(`[Email] isEmailEnabled: ${isEmailEnabled}`);
  console.log(`[Email] RESEND_API_KEY exists: ${!!process.env.RESEND_API_KEY}`);
  console.log(`[Email] RESEND_API_KEY prefix: ${process.env.RESEND_API_KEY?.substring(0, 10)}...`);

  if (!isEmailEnabled) {
    console.log(`[Email] SKIPPED - RESEND_API_KEY not configured in environment`);
    return false;
  }

  try {
    console.log(`[Email] Calling Resend API...`);
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
    });

    if (error) {
      console.error(`[Email] ERROR from Resend API:`, JSON.stringify(error, null, 2));
      return false;
    }

    console.log(`[Email] SUCCESS - Email ID: ${data?.id}`);
    console.log(`[Email] ====================================`);
    return true;
  } catch (error) {
    console.error(`[Email] EXCEPTION caught:`, error instanceof Error ? error.message : String(error));
    console.error(`[Email] Full error:`, error);
    return false;
  }
}

// Send confirmation when landlord submits request
export async function sendRequestReceivedEmail(request: ServiceRequest): Promise<boolean> {
  const { subject, html } = requestReceivedEmail(request);
  return sendEmail(request.landlord_email, subject, html);
}

// Send intro emails when vendors are matched
export async function sendIntroEmails(
  request: ServiceRequest,
  vendors: Vendor[]
): Promise<{ landlordSent: boolean; vendorsSent: number }> {
  // Send to landlord
  const { subject: landlordSubject, html: landlordHtml } = landlordIntroEmail(request, vendors);
  const landlordSent = await sendEmail(request.landlord_email, landlordSubject, landlordHtml);

  // Send to each vendor
  let vendorsSent = 0;
  for (const vendor of vendors) {
    const { subject: vendorSubject, html: vendorHtml } = vendorIntroEmail(request, vendor);
    const sent = await sendEmail(vendor.email, vendorSubject, vendorHtml);
    if (sent) vendorsSent++;
  }

  return { landlordSent, vendorsSent };
}

// Send follow-up email to landlord
export async function sendFollowUpEmail(
  request: ServiceRequest,
  vendorNames: string[]
): Promise<boolean> {
  const { subject, html } = followUpEmail(request, vendorNames);
  return sendEmail(request.landlord_email, subject, html);
}

// Send welcome email to approved vendor
export async function sendVendorWelcomeEmail(
  vendor: Vendor,
  tempPassword?: string
): Promise<boolean> {
  const { subject, html } = vendorWelcomeEmail(vendor, tempPassword);
  return sendEmail(vendor.email, subject, html, VENDOR_WELCOME_FROM_EMAIL);
}

// Send rejection email to vendor
export async function sendVendorRejectedEmail(vendor: Vendor): Promise<boolean> {
  const { subject, html } = vendorRejectedEmail(vendor);
  return sendEmail(vendor.email, subject, html);
}

// Send email when no vendors matched for a request
export async function sendNoVendorMatchedEmail(request: ServiceRequest): Promise<boolean> {
  const { subject, html } = noVendorMatchedEmail(request);
  return sendEmail(request.landlord_email, subject, html);
}

// Send confirmation email when vendor submits an application
export async function sendVendorApplicationReceivedEmail(vendor: {
  contact_name: string;
  business_name: string;
  email: string;
}): Promise<boolean> {
  const { subject, html } = vendorApplicationReceivedEmail(vendor);
  return sendEmail(vendor.email, subject, html, VENDOR_WELCOME_FROM_EMAIL);
}
