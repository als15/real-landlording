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
 * Step 0 Day 0: Landlord expectation message sent immediately after intro.
 * Informational only — no response buttons.
 */
export function landlordDay0ExpectationEmail(
  request: ServiceRequest,
  vendorName: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);

  return {
    subject: `We matched you with a vendor for your ${serviceLabel.toLowerCase()} project`,
    html: emailWrapper(`
      <h2>You've Been Matched!</h2>
      <p>Hi ${e(request.landlord_name) || 'there'},</p>
      <p>We've connected you with <strong>${e(vendorName)}</strong> for your <strong>${e(serviceLabel.toLowerCase())}</strong> project at ${e(request.property_address || request.property_location)}.</p>
      <p>They should reach out to you shortly. If you haven't heard from them in a few days, don't worry — we'll follow up and make sure you're taken care of.</p>
      <p>Thanks for using Real Landlording!</p>
    `),
  };
}

/**
 * Step 1.1: Vendor completion timeline request after booking.
 * 4 buttons: 1–2 days, 3–5 days, 1–2 weeks, Longer
 */
export function vendorTimelineRequestEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Timeline: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>Great — Job Booked!</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>Thanks for confirming the <strong>${e(serviceLabel)}</strong> project with <strong>${e(landlordName)}</strong>. When do you expect the job to be completed?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('1–2 Days', `${responseBaseUrl}&action=timeline_1_2_days`, '#52c41a')}
        ${responseButton('3–5 Days', `${responseBaseUrl}&action=timeline_3_5_days`, '#1890ff')}
        ${responseButton('1–2 Weeks', `${responseBaseUrl}&action=timeline_1_2_weeks`, '#722ed1')}
        ${responseButton('Longer', `${responseBaseUrl}&action=timeline_longer`, '#faad14')}
      </div>

      <p style="color:#888;font-size:13px;">This helps us check in at the right time without bothering you.</p>
    `),
  };
}

/**
 * Step 5A: Vendor invoice value collection after job completion.
 * Links to a form page instead of buttons.
 */
export function vendorInvoiceRequestEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Invoice details: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>Job Completed — Nice Work!</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>Glad to hear the <strong>${e(serviceLabel)}</strong> project with <strong>${e(landlordName)}</strong> is done. What was the total invoice value?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Under $500', `${responseBaseUrl}&action=invoice_under_500`, '#52c41a')}
        ${responseButton('$500–$1,000', `${responseBaseUrl}&action=invoice_500_1000`, '#1890ff')}
        ${responseButton('$1,000–$2,500', `${responseBaseUrl}&action=invoice_1000_2500`, '#722ed1')}
        ${responseButton('$2,500–$5,000', `${responseBaseUrl}&action=invoice_2500_5000`, '#faad14')}
        ${responseButton('$5,000+', `${responseBaseUrl}&action=invoice_5000_plus`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">This helps us track the value we're bringing to your business.</p>
    `),
  };
}

/**
 * Step 5C: Vendor cancellation reason collection.
 * 4 buttons: Price, Scope, Chose Another Vendor, Other
 */
export function vendorCancellationReasonEmail(
  request: ServiceRequest,
  vendor: Vendor,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  const landlordName = request.landlord_name || 'the landlord';

  return {
    subject: `Cancelled: ${serviceLabel} project with ${landlordName}`,
    html: emailWrapper(`
      <h2>Sorry to Hear That</h2>
      <p>Hi ${e(vendor.contact_name)},</p>
      <p>We understand the <strong>${e(serviceLabel)}</strong> project with <strong>${e(landlordName)}</strong> didn't work out. Can you let us know what happened?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Price', `${responseBaseUrl}&action=cancel_reason_price`, '#faad14')}
        ${responseButton('Scope', `${responseBaseUrl}&action=cancel_reason_scope`, '#1890ff')}
        ${responseButton('Chose Another Vendor', `${responseBaseUrl}&action=cancel_reason_other_vendor`, '#722ed1')}
        ${responseButton('Other', `${responseBaseUrl}&action=cancel_reason_other`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">Your feedback helps us improve our matching and send you better referrals.</p>
    `),
  };
}

/**
 * Step 6: Landlord feedback request with 3 simple options.
 * 3 buttons: Great, OK, Not Good
 */
export function landlordFeedbackRequestEmail(
  request: ServiceRequest,
  vendorName: string,
  responseBaseUrl: string
): { subject: string; html: string } {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);

  return {
    subject: `How was your experience with ${vendorName}?`,
    html: emailWrapper(`
      <h2>How Did It Go?</h2>
      <p>Hi ${e(request.landlord_name) || 'there'},</p>
      <p>We heard that <strong>${e(vendorName)}</strong> completed your <strong>${e(serviceLabel.toLowerCase())}</strong> project. How was the experience?</p>

      <div style="text-align:center;margin:24px 0;">
        ${responseButton('Great', `${responseBaseUrl}&action=feedback_great`, '#52c41a')}
        ${responseButton('OK', `${responseBaseUrl}&action=feedback_ok`, '#1890ff')}
        ${responseButton('Not Good', `${responseBaseUrl}&action=feedback_not_good`, '#ff4d4f')}
      </div>

      <p style="color:#888;font-size:13px;">Your feedback helps other landlords find great vendors.</p>
    `),
  };
}
