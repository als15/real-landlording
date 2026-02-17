import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendFollowUpEmail } from '@/lib/email/send';
import { sendFollowUpSms } from '@/lib/sms/send';
import { ServiceRequest } from '@/types/database';

// This endpoint should be called by a cron job (e.g., Vercel Cron, GitHub Actions)
// It sends follow-up emails 3-5 days after intro was sent

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended for security)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const adminClient = createAdminClient();

    // Find requests that:
    // 1. Status is 'matched'
    // 2. Intro was sent 3-5 days ago
    // 3. Follow-up hasn't been sent yet
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

    const { data: requests, error } = await adminClient
      .from('service_requests')
      .select(`
        *,
        matches:request_vendor_matches(
          vendor:vendors(business_name)
        )
      `)
      .eq('status', 'matched')
      .is('followup_sent_at', null)
      .not('intro_sent_at', 'is', null)
      .lte('intro_sent_at', threeDaysAgo.toISOString())
      .gte('intro_sent_at', fiveDaysAgo.toISOString());

    if (error) {
      console.error('Error fetching requests for follow-up:', error);
      return NextResponse.json(
        { message: 'Failed to fetch requests' },
        { status: 500 }
      );
    }

    if (!requests || requests.length === 0) {
      return NextResponse.json({
        message: 'No follow-ups needed',
        count: 0,
      });
    }

    let sentCount = 0;

    for (const request of requests) {
      // Get vendor names
      const vendorNames = request.matches
        ?.map((m: { vendor: { business_name: string } }) => m.vendor?.business_name)
        .filter(Boolean) || [];

      if (vendorNames.length === 0) continue;

      // Send follow-up email and SMS
      const emailSent = await sendFollowUpEmail(request as ServiceRequest, vendorNames);

      // Send SMS (don't wait for it, fire and forget)
      sendFollowUpSms(request as ServiceRequest, vendorNames)
        .then(smsSent => console.log(`Follow-up SMS for request ${request.id}: ${smsSent}`))
        .catch(console.error);

      if (emailSent) {
        // Mark follow-up as sent
        await adminClient
          .from('service_requests')
          .update({ followup_sent_at: new Date().toISOString() })
          .eq('id', request.id);

        sentCount++;
      }
    }

    return NextResponse.json({
      message: `Follow-up emails sent`,
      count: sentCount,
      total: requests.length,
    });
  } catch (error) {
    console.error('Cron error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
