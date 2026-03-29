import { ServiceRequest, Vendor, SERVICE_TYPE_LABELS } from '@/types/database';
import { escapeHtml } from '@/lib/security';
import { emailWrapper } from './templates';
import { getServiceDisplayLabel } from '@/lib/utils/serviceLabel';

const e = escapeHtml;

function responseButton(label: string, url: string, color: string = '#1890ff'): string {
  return `<a href="${e(url)}" style="display:inline-block;background:${color};color:white;padding:12px 20px;text-decoration:none;border-radius:4px;margin:6px 4px;font-weight:bold;">${e(label)}</a>`;
}

/**
 * Day 3 vendor check: "Quick check on your project with {landlord}."
 * 4 buttons: Booked / Discussing / Can't Reach / No Deal
 */
export function vendorDay3CheckEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Quick check: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>How's It Going?</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>A few days ago we connected you with <strong>${e(landlordName)}</strong> for a <strong>${e(serviceLabel)}</strong> project at ${e(request.property_address || request.property_location)}.</p>
      <p>We'd love a quick update so we can best support both you and the client. Where do things stand?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Booked the Job', `${responseBaseUrl}&action=booked`, '#52c41a')}
        ${responseButton('Still Discussing', `${responseBaseUrl}&action=discussing`, '#1890ff')}
        ${responseButton("Can't Reach Client", `${responseBaseUrl}&action=cant_reach`, '#faad14')}
        ${responseButton('Not Moving Forward', `${responseBaseUrl}&action=no_deal`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">Just click the button that best describes your situation. It takes 2 seconds and helps us improve your referrals.</p>
    `),
  };
}

/**
 * Day 7 recheck: "Following up on {landlord}'s project."
 * 2 buttons: Booked / Not Moving Forward
 */
export function vendorDay7RecheckEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Following up: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>Quick Follow-Up</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>Just checking back on the <strong>${e(serviceLabel)}</strong> project with <strong>${e(landlordName)}</strong>. Were you able to connect and move forward?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Booked the Job', `${responseBaseUrl}&action=booked`, '#52c41a')}
        ${responseButton('Not Moving Forward', `${responseBaseUrl}&action=no_deal`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">Your feedback helps us send you better-matched referrals in the future.</p>
    `),
  };
}

/**
 * Landlord contact check: "Did {vendor} reach out to you?"
 * 2 buttons: Yes / No Contact
 */
export function landlordContactCheckEmail(
  request: ServiceRequest,
  vendorName: string,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);

  return {
    subject: `Did ${vendorName} reach out about your ${serviceLabel.toLowerCase()} project?`,
    html: emailWrapper(`
      <h2>Quick Question</h2>
      <p>Hi ${e(request.landlord_name) || 'there'},</p>
      <p>We connected you with <strong>${e(vendorName)}</strong> for your <strong>${e(serviceLabel.toLowerCase())}</strong> project. We want to make sure they reached out to you.</p>
      <p>Did ${e(vendorName)} contact you?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Yes, They Contacted Me', `${responseBaseUrl}&action=contact_ok`, '#52c41a')}
        ${responseButton("No, Haven't Heard From Them", `${responseBaseUrl}&action=no_contact`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">Your response helps us hold vendors accountable and ensure you get great service.</p>
    `),
  };
}

/**
 * Vendor completion check: "Is the job finished?"
 * 3 buttons: Completed / In Progress / Cancelled
 */
export function vendorCompletionCheckEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Job update: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>Job Status Check</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>Checking in on the <strong>${e(serviceLabel)}</strong> project with <strong>${e(landlordName)}</strong> at ${e(request.property_address || request.property_location)}. How's the job going?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Job Completed', `${responseBaseUrl}&action=completed`, '#52c41a')}
        ${responseButton('Still In Progress', `${responseBaseUrl}&action=in_progress`, '#1890ff')}
        ${responseButton('Job Cancelled', `${responseBaseUrl}&action=cancelled`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">This helps us track successful connections and improve our referral process.</p>
    `),
  };
}

/**
 * Landlord feedback request: "How did it go? Leave a review."
 */
export function landlordFeedbackRequestEmail(
  request: ServiceRequest,
  vendorName: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    subject: `How was your experience with ${vendorName}?`,
    html: emailWrapper(`
      <h2>How Did It Go?</h2>
      <p>Hi ${e(request.landlord_name) || 'there'},</p>
      <p>We heard that <strong>${e(vendorName)}</strong> completed your <strong>${e(serviceLabel.toLowerCase())}</strong> project. We'd love to hear how it went!</p>
      <p>Your review helps other landlords find great vendors and helps us improve our matching.</p>

      <div style="text-align:center;margin:24px 0;">
        <a href="${appUrl}/dashboard" class="button" style="display:inline-block;background:#1890ff;color:white;padding:14px 28px;text-decoration:none;border-radius:4px;font-weight:bold;">
          Leave a Review
        </a>
      </div>

      <p>Thanks for being part of the Real Landlording community!</p>
    `),
  };
}
