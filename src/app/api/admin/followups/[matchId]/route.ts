import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { handleFollowupResponse } from '@/lib/followup/handler';
import { FollowupStage } from '@/types/database';

/**
 * GET /api/admin/followups/[matchId]
 * Fetch follow-up record + all events for a given match.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const adminResult = await verifyAdmin();
  if (!adminResult.success) return adminResult.response;

  const { adminClient } = adminResult.context;
  const { matchId } = await params;

  const { data: followup, error } = await adminClient
    .from('match_followups')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (error || !followup) {
    return NextResponse.json(
      { message: 'Follow-up not found for this match' },
      { status: 404 }
    );
  }

  // Fetch events
  const { data: events } = await adminClient
    .from('followup_events')
    .select('*')
    .eq('followup_id', followup.id)
    .order('created_at', { ascending: true });

  return NextResponse.json({ followup, events: events || [] });
}

/**
 * PATCH /api/admin/followups/[matchId]
 * Admin override — manually advance or set follow-up stage.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const adminResult = await verifyAdmin();
  if (!adminResult.success) return adminResult.response;

  const { adminClient, userId } = adminResult.context;
  const { matchId } = await params;

  const body = await request.json();
  const { stage, response, expected_completion_date, invoice_value, cancellation_reason, notes } = body as {
    stage?: FollowupStage;
    response?: string;
    expected_completion_date?: string;
    invoice_value?: number;
    cancellation_reason?: string;
    notes?: string;
  };

  // Look up the followup record
  const { data: followup, error } = await adminClient
    .from('match_followups')
    .select('*')
    .eq('match_id', matchId)
    .single();

  if (error || !followup) {
    return NextResponse.json(
      { message: 'Follow-up not found for this match' },
      { status: 404 }
    );
  }

  // If a response action is provided, use the handler state machine
  if (response) {
    const result = await handleFollowupResponse(
      adminClient,
      followup.id,
      response,
      'admin',
      userId
    );

    if (!result.success) {
      return NextResponse.json({ message: result.message }, { status: 400 });
    }

    return NextResponse.json({
      message: result.message,
      newStage: result.newStage,
    });
  }

  // Direct stage override
  const updates: Record<string, unknown> = {};

  if (stage) {
    updates.stage = stage;
  }

  if (expected_completion_date !== undefined) {
    updates.expected_completion_date = expected_completion_date;
  }

  if (invoice_value !== undefined) {
    updates.invoice_value = invoice_value;
  }

  if (cancellation_reason !== undefined) {
    updates.cancellation_reason = cancellation_reason;
  }

  if (Object.keys(updates).length > 0) {
    await adminClient
      .from('match_followups')
      .update(updates)
      .eq('id', followup.id);
  }

  // Log admin override event
  await adminClient.from('followup_events').insert({
    followup_id: followup.id,
    event_type: 'admin_override',
    from_stage: followup.stage,
    to_stage: stage || followup.stage,
    channel: 'admin',
    notes: notes || null,
    created_by: userId,
  });

  return NextResponse.json({ message: 'Follow-up updated', stage: stage || followup.stage });
}
