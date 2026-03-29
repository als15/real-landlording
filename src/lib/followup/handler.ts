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

    const newStage: FollowupStage = 'awaiting_completion';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      vendor_response_token: null,
      landlord_response_token: null,
    });

    // Update match status
    await supabase
      .from('request_vendor_matches')
      .update({ status: 'in_progress', job_won: true, job_won_at: new Date().toISOString() })
      .eq('id', followup.match_id);

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'booked', null, adminUserId || null);
    return { success: true, newStage, message: 'Job marked as booked' };
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

    const newStage: FollowupStage = 'closed';
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
    return { success: true, newStage, message: 'No deal — admin notified for potential rematch' };
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

    const newStage: FollowupStage = 'closed';
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

    const newStage: FollowupStage = 'closed';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: null,
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

    // Note: Landlord feedback email is sent by the processor after this returns
    return { success: true, newStage, message: 'Job completed — feedback request will be sent to landlord' };
  }

  if (action === 'in_progress') {
    const validStages: FollowupStage[] = ['completion_check_sent', 'awaiting_completion'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark in_progress from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'awaiting_completion';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      vendor_response_token: null,
    });

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'in_progress', null, adminUserId || null);
    return { success: true, newStage, message: 'Still in progress — will check back in a week' };
  }

  if (action === 'cancelled') {
    const validStages: FollowupStage[] = ['completion_check_sent', 'awaiting_completion'];
    if (!validStages.includes(currentStage) && actorType !== 'admin') {
      return { success: false, newStage: null, message: `Cannot mark cancelled from stage: ${currentStage}` };
    }

    const newStage: FollowupStage = 'closed';
    await transitionStage(supabase, followupId, newStage, {
      next_action_at: null,
      vendor_response_token: null,
    });

    await supabase
      .from('request_vendor_matches')
      .update({ status: 'cancelled' })
      .eq('id', followup.match_id);

    await logEvent(supabase, followupId, 'response_received', currentStage, newStage, channel, 'cancelled', null, adminUserId || null);
    return { success: true, newStage, message: 'Job cancelled' };
  }

  return { success: false, newStage: null, message: `Unknown action: ${action}` };
}
