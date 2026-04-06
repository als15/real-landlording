import { SupabaseClient } from '@supabase/supabase-js';
import { FollowupStage, ServiceRequest, Vendor } from '@/types/database';
import { generateFollowupToken } from './tokens';
import {
  landlordDay0ExpectationEmail,
  vendorDay3CheckEmail,
  vendorDay7RecheckEmail,
  landlordContactCheckEmail,
  vendorCompletionCheckEmail,
  vendorTimelineRequestEmail,
  vendorInvoiceRequestEmail,
  vendorCancellationReasonEmail,
  landlordFeedbackRequestEmail,
} from '@/lib/email/followup-templates';
import {
  landlordDay0ExpectationSms,
  vendorDay3CheckSms,
  vendorDay7RecheckSms,
  landlordContactCheckSms,
  vendorCompletionCheckSms,
  landlordFeedbackRequestSms,
} from '@/lib/sms/followup-templates';

// Helpers for email/SMS sending — import from existing modules
import { resend, FROM_EMAIL, NOTIFICATION_BCC_EMAIL, isEmailEnabled } from '@/lib/email/resend';
import { isSmsEnabled, sendSmsMessage } from '@/lib/sms/telnyx';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isEmailEnabled) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject,
      html,
      bcc: NOTIFICATION_BCC_EMAIL,
    });
    if (error) {
      console.error(`[FollowUp] Email error to ${to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[FollowUp] Email exception to ${to}:`, err);
    return false;
  }
}

function formatPhoneNumber(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 10) return `+${digits}`;
  return null;
}

async function sendSms(to: string, message: string): Promise<boolean> {
  if (!isSmsEnabled) return false;
  const formatted = formatPhoneNumber(to);
  if (!formatted) return false;
  try {
    await sendSmsMessage(formatted, message);
    return true;
  } catch (err) {
    console.error(`[FollowUp] SMS error to ${to}:`, err);
    return false;
  }
}

async function logEvent(
  supabase: SupabaseClient,
  followupId: string,
  eventType: string,
  fromStage: FollowupStage,
  toStage: FollowupStage,
  channel: string
): Promise<void> {
  await supabase.from('followup_events').insert({
    followup_id: followupId,
    event_type: eventType,
    from_stage: fromStage,
    to_stage: toStage,
    channel,
  });
}

export interface ProcessResult {
  processed: number;
  sent: number;
  errors: number;
}

/**
 * Process all pending follow-ups whose next_action_at has passed.
 * Called by the cron route.
 */
export async function processAllFollowups(supabase: SupabaseClient): Promise<ProcessResult> {
  const result: ProcessResult = { processed: 0, sent: 0, errors: 0 };

  // Query follow-ups ready for processing
  const { data: followups, error } = await supabase
    .from('match_followups')
    .select('*')
    .lte('next_action_at', new Date().toISOString())
    .not('stage', 'in', '("closed","needs_rematch")');

  if (error) {
    console.error('[FollowUp] Error fetching followups:', error);
    return result;
  }

  if (!followups || followups.length === 0) {
    return result;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  for (const followup of followups) {
    result.processed++;

    try {
      // Fetch related data
      const { data: match } = await supabase
        .from('request_vendor_matches')
        .select('*, vendor:vendors(*), request:service_requests(*)')
        .eq('id', followup.match_id)
        .single();

      if (!match?.vendor || !match?.request) {
        console.error(`[FollowUp] Missing match data for followup ${followup.id}`);
        result.errors++;
        continue;
      }

      const vendor = match.vendor as Vendor;
      const request = match.request as ServiceRequest;
      const stage: FollowupStage = followup.stage;

      switch (stage) {
        // Step 0: Send Day 0 landlord expectation email, then schedule Day 3 vendor check
        case 'pending': {
          const { subject, html } = landlordDay0ExpectationEmail(request, vendor.business_name);
          const emailSent = await sendEmail(request.landlord_email, subject, html);

          if (request.landlord_phone) {
            const sms = landlordDay0ExpectationSms(request, vendor.business_name);
            await sendSms(request.landlord_phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              stage: 'intro_sent',
              next_action_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, 'intro_sent', 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Step 1: Day 3 vendor check email
        case 'intro_sent': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorDay3CheckEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          if (vendor.phone) {
            const sms = vendorDay3CheckSms(request);
            await sendSms(vendor.phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              stage: 'vendor_check_sent',
              vendor_response_token: token,
              next_action_at: null, // Wait for response
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, 'vendor_check_sent', 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Step 1.1 / 5B: Send vendor timeline request email
        case 'timeline_requested': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorTimelineRequestEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          await supabase
            .from('match_followups')
            .update({
              vendor_response_token: token,
              next_action_at: null, // Wait for response
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, stage, 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Day 7 recheck: vendor_discussing or landlord_contact_ok → send recheck
        case 'vendor_discussing':
        case 'landlord_contact_ok': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorDay7RecheckEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          if (vendor.phone) {
            const sms = vendorDay7RecheckSms(request);
            await sendSms(vendor.phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              stage: 'day7_recheck_sent',
              vendor_response_token: token,
              next_action_at: null,
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, 'day7_recheck_sent', 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Landlord check: vendor can't reach → send landlord email
        case 'landlord_check_sent': {
          // Only send if we haven't already (check if landlord_response_token is already set)
          if (followup.landlord_response_token) {
            // Already sent, just clear next_action_at
            await supabase
              .from('match_followups')
              .update({ next_action_at: null })
              .eq('id', followup.id);
            break;
          }

          const token = generateFollowupToken(followup.id, 'landlord');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = landlordContactCheckEmail(request, vendor.business_name, responseBaseUrl);
          const emailSent = await sendEmail(request.landlord_email, subject, html);

          if (request.landlord_phone) {
            const sms = landlordContactCheckSms(request, vendor.business_name);
            await sendSms(request.landlord_phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              landlord_response_token: token,
              next_action_at: null,
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, stage, 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Completion check: awaiting_completion → send vendor completion email
        case 'awaiting_completion': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorCompletionCheckEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          if (vendor.phone) {
            const sms = vendorCompletionCheckSms(request);
            await sendSms(vendor.phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              stage: 'completion_check_sent',
              vendor_response_token: token,
              next_action_at: null,
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, 'completion_check_sent', 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Step 5A: Send vendor invoice collection email
        case 'invoice_requested': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorInvoiceRequestEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          await supabase
            .from('match_followups')
            .update({
              vendor_response_token: token,
              next_action_at: null, // Wait for response
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, stage, 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Step 5C: Send vendor cancellation reason email
        case 'cancellation_reason_requested': {
          const token = generateFollowupToken(followup.id, 'vendor');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = vendorCancellationReasonEmail(request, vendor, responseBaseUrl);
          const emailSent = await sendEmail(vendor.email, subject, html);

          await supabase
            .from('match_followups')
            .update({
              vendor_response_token: token,
              next_action_at: null, // Wait for response
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, stage, 'email');
          if (emailSent) result.sent++;
          break;
        }

        // Step 6: Send landlord feedback request email
        case 'feedback_requested': {
          const token = generateFollowupToken(followup.id, 'landlord');
          const responseBaseUrl = `${appUrl}/api/follow-up/respond?token=${encodeURIComponent(token)}`;

          const { subject, html } = landlordFeedbackRequestEmail(request, vendor.business_name, responseBaseUrl);
          const emailSent = await sendEmail(request.landlord_email, subject, html);

          if (request.landlord_phone) {
            const sms = landlordFeedbackRequestSms(request, vendor.business_name);
            await sendSms(request.landlord_phone, sms);
          }

          await supabase
            .from('match_followups')
            .update({
              landlord_response_token: token,
              next_action_at: null, // Wait for response
            })
            .eq('id', followup.id);

          await logEvent(supabase, followup.id, 'email_sent', stage, stage, 'email');
          if (emailSent) result.sent++;
          break;
        }

        default:
          console.log(`[FollowUp] No action for stage: ${stage} (followup ${followup.id})`);
          break;
      }

      // Rate limit delay between sends
      await delay(600);
    } catch (err) {
      console.error(`[FollowUp] Error processing followup ${followup.id}:`, err);
      result.errors++;
    }
  }

  return result;
}

// sendFeedbackRequest removed — feedback is now handled by the processor
// via the 'feedback_requested' stage (Step 6 of the enhanced flow)
