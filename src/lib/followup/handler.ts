import { SupabaseClient } from '@supabase/supabase-js';
import { FollowupStage } from '@/types/database';

export interface FollowupResponse {
  success: boolean;
  newStage: FollowupStage | null;
  message: string;
}

type ActorType = 'vendor' | 'landlord' | 'admin';

/**
 * Log a follow-up event to the audit trail.
 */
async function logEvent(
  supabase: SupabaseClient,
  followupId: string,
  eventType: string,
  fromStage: FollowupStage | null,
  toStage: FollowupStage | null,
  channel: string,
  responseValue: string | null = null,
  notes: string | null = null,
  createdBy: string | null = null
): Promise<void> {
  await supabase.from('followup_events').insert({
    followup_id: followupId,
    event_type: eventType,
    from_stage: fromStage,
    to_stage: toStage,
    channel,
    response_value: responseValue,
    notes,
    created_by: createdBy,
  });
}

/**
 * Update follow-up stage and clear used tokens.
 */
async function transitionStage(
  supabase: SupabaseClient,
  followupId: string,
  newStage: FollowupStage,
  updates: Record<string, unknown> = {}
): Promise<void> {
  await supabase
    .from('match_followups')
    .update({ stage: newStage, ...updates })
    .eq('id', followupId);
}

/**
 * Create an admin notification for rematch needs.
 */
async function createRematchNotification(
  supabase: SupabaseClient,
  requestId: string,
  matchId: string,
  reason: string
): Promise<void> {
  await supabase.from('notifications').insert({
    user_type: 'admin',
    type: 'follow_up_rematch',
    title: 'Follow-Up: Rematch Needed',
    message: reason,
    request_id: requestId,
    match_id: matchId,
    priority: 'high',
    metadata: { reason },
  });
}

/**
 * Core state machine handler for follow-up responses.
 * Processes a vendor or landlord response and transitions the follow-up stage.
 */
export async function handleFollowupResponse(
  supabase: SupabaseClient,
  followupId: string,
  action: string,
  actorType: ActorType,
  adminUserId?: string
): Promise<FollowupResponse> {
  // Fetch current followup state
  const { data: followup, error } = await supabase
    .from('match_followups')
    .select('*')
    .eq('id', followupId)
    .single();

  if (error || !followup) {
    return { success: false, newStage: null, message: 'Follow-up record not found' };
  }

  const currentStage: FollowupStage = followup.stage;
  const channel = actorType === 'admin' ? 'admin' : 'email';

  // ---- VENDOR RESPONSES ----

  if (action === 'booked') {
    // Valid from: vendor_check_sent, day7_recheck_sent, vendor_discussing, landlord_contact_ok
    const validStages: FollowupStage[] = [
      'vendor_check_sent', 'day7_recheck_sent', 'vendor_discussing', 'landlord_contact_ok',
    ];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark as booked from stage: ${currentStage}` };
    }

    // Step 1.1: Transition to timeline_requested instead of awaiting_completion
    // The processor will send the timeline question email
    const newStage: FollowupStage = 'timeline_requested';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date().toISOString(), // Immediate — processor sends timeline email
      vendor_response_token: null,
      landlord_response_token: null,
    });

    // Update match status
    await supabase
      .from('request_vendor_matches')
      .update({ status: 'in_progress', job_won: true, job_won_at: new Date().toISOString() })
      .eq('id', followup.match_id);

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'booked', null, adminUserId || null);
    return { success: true, newStage, message: 'Job marked as booked — timeline request will be sent' };
  }

  // ---- TIMELINE RESPONSES (Step 1.1 / 5B) ----

  if (action.startsWith('timeline_')) {
    const validStages: FollowupStage[] = ['timeline_requested', 'completion_check_sent'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot set timeline from stage: ${currentStage}` };
    }

    const daysMap: Record<string, number> = {
      timeline_1_2_days: 2,
      timeline_3_5_days: 5,
      timeline_1_2_weeks: 14,
      timeline_longer: 30,
    };
    const days = daysMap[action];
    if (days === undefined) {
      return { success: false, newStage: null, message: `Unknown timeline action: ${action}` };
    }

    // Set expected_completion_date and wait until 7 days after that
    const completionDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const checkDate = new Date(completionDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const newStage: FollowupStage = 'awaiting_completion';
    await transitionStage(supabase, followupId, newStage, {
      expected_completion_date: completionDate.toISOString().split('T')[0],
      next_action_at: checkDate.toISOString(),
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, action, null, adminUserId || null);
    return { success: true, newStage, message: `Timeline set — will check ${days + 7} days from now` };
  }

  if (action === 'discussing') {
    const validStages: FollowupStage[] = ['vendor_check_sent'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark as discussing from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'vendor_discussing';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'discussing', null, adminUserId || null);
    return { success: true, newStage, message: 'Marked as still discussing' };
  }

  if (action === 'cant_reach') {
    const validStages: FollowupStage[] = ['vendor_check_sent'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark as can't reach from stage: ${currentStage}` };
    }

    // Transition to landlord_check_sent — the processor will handle sending the landlord email
    const newStage: FollowupStage = 'landlord_check_sent';
    await transitionStage(supabase, followupId, newStage, {
      // Set next_action_at to now so the processor picks it up immediately
      next_action_at: new Date().toISOString(),
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'cant_reach', null, adminUserId || null);
    return { success: true, newStage, message: "Vendor can't reach landlord — landlord check will be sent" };
  }

  if (action === 'no_deal') {
    const validStages: FollowupStage[] = [
      'vendor_check_sent', 'day7_recheck_sent', 'vendor_discussing', 'landlord_contact_ok',
    ];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark as no deal from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'needs_rematch';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: null,
      vendor_response_token: null,
      landlord_response_token: null,
    });

    // Update match status
    await supabase
      .from('request_vendor_matches')
      .update({ status: 'vendor_declined' })
      .eq('id', followup.match_id);

    await createRematchNotification(
      supabase,
      followup.request_id,
      followup.match_id,
      'Vendor indicated no deal — landlord may need a rematch'
    );

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'no_deal', null, adminUserId || null);
    return { success: true, newStage, message: 'No deal — admin notified for rematch' };
  }

  // ---- LANDLORD RESPONSES ----

  if (action === 'contact_ok') {
    const validStages: FollowupStage[] = ['landlord_check_sent'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark contact_ok from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'landlord_contact_ok';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      landlord_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'contact_ok', null, adminUserId || null);
    return { success: true, newStage, message: 'Landlord confirmed contact — will recheck in a few days' };
  }

  if (action === 'no_contact') {
    const validStages: FollowupStage[] = ['landlord_check_sent'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark no_contact from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'needs_rematch';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: null,
      landlord_response_token: null,
      vendor_response_token: null,
    });

    await createRematchNotification(
      supabase,
      followup.request_id,
      followup.match_id,
      'Landlord reports no contact from vendor — high priority rematch needed'
    );

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'no_contact', null, adminUserId || null);
    return { success: true, newStage, message: 'No contact reported — admin notified for rematch' };
  }

  // ---- COMPLETION RESPONSES ----

  if (action === 'completed') {
    const validStages: FollowupStage[] = ['completion_check_sent', 'awaiting_completion'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark completed from stage: ${currentStage}` };
    }

    // Step 5A: Transition to invoice_requested instead of closed
    // The processor will send the invoice collection email
    const newStage: FollowupStage = 'invoice_requested';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date().toISOString(), // Immediate — processor sends invoice email
      vendor_response_token: null,
    });

    // Update match status
    await supabase
      .from('request_vendor_matches')
      .update({
        job_completed: true,
        job_completed_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('id', followup.match_id);

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'completed', null, adminUserId || null);

    return { success: true, newStage, message: 'Job completed — invoice request will be sent' };
  }

  if (action === 'in_progress') {
    const validStages: FollowupStage[] = ['completion_check_sent', 'awaiting_completion'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark in_progress from stage: ${currentStage}` };
    }

    // Step 5B: Ask for new timeline instead of fixed 7-day wait
    // The processor will send the timeline question email
    const newStage: FollowupStage = 'timeline_requested';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date().toISOString(), // Immediate — processor sends timeline email
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'in_progress', null, adminUserId || null);
    return { success: true, newStage, message: 'Still in progress — timeline request will be sent' };
  }

  if (action === 'cancelled') {
    const validStages: FollowupStage[] = ['completion_check_sent', 'awaiting_completion'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark cancelled from stage: ${currentStage}` };
    }

    // Step 5C: Ask for cancellation reason instead of closing immediately
    // The processor will send the cancellation reason email
    const newStage: FollowupStage = 'cancellation_reason_requested';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date().toISOString(), // Immediate — processor sends reason email
      vendor_response_token: null,
    });

    await supabase
      .from('request_vendor_matches')
      .update({ status: 'cancelled' })
      .eq('id', followup.match_id);

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'cancelled', null, adminUserId || null);
    return { success: true, newStage, message: 'Job cancelled — reason request will be sent' };
  }

  // ---- INVOICE RESPONSES (Step 5A) ----

  if (action.startsWith('invoice_')) {
    const validStages: FollowupStage[] = ['invoice_requested'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot submit invoice from stage: ${currentStage}` };
    }

    const invoiceMap: Record<string, number> = {
      invoice_under_500: 250,
      invoice_500_1000: 750,
      invoice_1000_2500: 1750,
      invoice_2500_5000: 3750,
      invoice_5000_plus: 7500,
    };
    const invoiceValue = invoiceMap[action];
    if (invoiceValue === undefined) {
      return { success: false, newStage: null, message: `Unknown invoice action: ${action}` };
    }

    // Transition to feedback_requested — processor will send landlord feedback email
    const newStage: FollowupStage = 'feedback_requested';
    await transitionStage(supabase, followupId, newStage, {
      invoice_value: invoiceValue,
      next_action_at: new Date().toISOString(), // Immediate — processor sends feedback email
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, action, null, adminUserId || null);
    return { success: true, newStage, message: 'Invoice recorded — feedback request will be sent to landlord' };
  }

  // ---- CANCELLATION REASON RESPONSES (Step 5C) ----

  if (action.startsWith('cancel_reason_')) {
    const validStages: FollowupStage[] = ['cancellation_reason_requested'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot submit cancellation reason from stage: ${currentStage}` };
    }

    const reasonMap: Record<string, string> = {
      cancel_reason_price: 'price',
      cancel_reason_scope: 'scope',
      cancel_reason_other_vendor: 'chose_another_vendor',
      cancel_reason_other: 'other',
    };
    const reason = reasonMap[action];
    if (!reason) {
      return { success: false, newStage: null, message: `Unknown cancellation reason: ${action}` };
    }

    const newStage: FollowupStage = 'needs_rematch';
    await transitionStage(supabase, followupId, newStage, {
      cancellation_reason: reason,
      next_action_at: null,
      vendor_response_token: null,
    });

    await createRematchNotification(
      supabase,
      followup.request_id,
      followup.match_id,
      `Job cancelled (reason: ${reason}) — landlord may need a rematch`
    );

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, action, null, adminUserId || null);
    return { success: true, newStage, message: 'Cancellation reason recorded — admin notified for rematch' };
  }

  // ---- FEEDBACK RESPONSES (Step 6) ----

  if (action.startsWith('feedback_')) {
    const validStages: FollowupStage[] = ['feedback_requested'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot submit feedback from stage: ${currentStage}` };
    }

    const feedbackMap: Record<string, string> = {
      feedback_great: 'great',
      feedback_ok: 'ok',
      feedback_not_good: 'not_good',
    };
    const feedback = feedbackMap[action];
    if (!feedback) {
      return { success: false, newStage: null, message: `Unknown feedback action: ${action}` };
    }

    const newStage: FollowupStage = 'closed';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: null,
      landlord_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, action, null, adminUserId || null);
    return { success: true, newStage, message: 'Feedback recorded — follow-up complete' };
  }

  return { success: false, newStage: null, message: `Unknown action: ${action}` };
}
