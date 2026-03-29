import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { verifyFollowupToken } from '@/lib/followup/tokens';
import { handleFollowupResponse } from '@/lib/followup/handler';
import { sendFeedbackRequest } from '@/lib/followup/processor';
import { isFollowUpSystemEnabled } from '@/lib/followup/config';

const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Public endpoint — no auth required (token-based).
 * Vendors/landlords click links in emails that hit this route.
 */
export async function GET(request: NextRequest) {
  if (!isFollowUpSystemEnabled()) {
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const action = searchParams.get('action');

  if (!token || !action) {
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  // Verify token
  const verification = verifyFollowupToken(token);

  if (verification.expired) {
    return NextResponse.redirect(`${appUrl}/follow-up/expired`);
  }

  if (!verification.valid) {
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  const supabase = createAdminClient();

  // Verify the token matches the stored token
  const { data: followup } = await supabase
    .from('match_followups')
    .select('vendor_response_token, landlord_response_token')
    .eq('id', verification.followupId)
    .single();

  if (!followup) {
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  // Check that the token matches the stored token for this actor type
  const storedToken =
    verification.type === 'vendor'
      ? followup.vendor_response_token
      : followup.landlord_response_token;

  if (storedToken !== token) {
    // Token was already used or replaced
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  // Process the response
  const result = await handleFollowupResponse(
    supabase,
    verification.followupId,
    action,
    verification.type
  );

  if (!result.success) {
    console.error(`[FollowUp] Response handling failed: ${result.message}`);
    return NextResponse.redirect(`${appUrl}/follow-up/invalid`);
  }

  // If job was completed, send feedback request to landlord
  if (action === 'completed') {
    await sendFeedbackRequest(supabase, verification.followupId);
  }

  return NextResponse.redirect(`${appUrl}/follow-up/thanks?action=${encodeURIComponent(action)}`);
}
