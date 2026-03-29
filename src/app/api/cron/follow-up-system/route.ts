import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { processAllFollowups } from '@/lib/followup/processor';
import { isFollowUpSystemEnabled } from '@/lib/followup/config';

/**
 * Cron job: process all pending follow-ups.
 * Runs every 6 hours via Vercel Cron.
 * Gated behind FOLLOW_UP_SYSTEM_ENABLED feature flag.
 */
export async function GET(request: NextRequest) {
  // Auth: require CRON_SECRET
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  // Feature flag check
  if (!isFollowUpSystemEnabled()) {
    return NextResponse.json({
      message: 'Follow-up system is disabled (set FOLLOW_UP_SYSTEM_ENABLED=true to enable)',
      processed: 0,
      sent: 0,
      errors: 0,
    });
  }

  try {
    const adminClient = createAdminClient();
    const result = await processAllFollowups(adminClient);

    return NextResponse.json({
      message: 'Follow-up system processed',
      ...result,
    });
  } catch (error) {
    console.error('[FollowUp Cron] Error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
