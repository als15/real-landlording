import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

// GET /api/admin/crm/pipeline - Get pipeline stage counts and summary
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    // Get all matches with their statuses
    const { data: matches, error: matchesError } = await adminClient
      .from('request_vendor_matches')
      .select('id, status, job_won, job_completed, vendor_accepted');

    if (matchesError) {
      console.error('Error fetching matches:', matchesError);
      return NextResponse.json(
        { message: 'Failed to fetch pipeline data', error: matchesError.message },
        { status: 500 }
      );
    }

    // Get pending payments
    const { data: pendingPayments, error: paymentsError } = await adminClient
      .from('referral_payments')
      .select('amount')
      .in('status', ['pending', 'invoiced']);

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
    }

    // Calculate pipeline counts
    const pipeline = {
      intro_sent: 0,
      estimate_sent: 0,
      vendor_accepted: 0,
      job_won: 0,
      in_progress: 0,
      completed: 0,
      // Additional useful counts
      vendor_declined: 0,
      no_response: 0,
      no_show: 0,
    };

    for (const match of matches || []) {
      switch (match.status) {
        case 'intro_sent':
          pipeline.intro_sent++;
          break;
        case 'estimate_sent':
          pipeline.estimate_sent++;
          break;
        case 'vendor_accepted':
          if (match.job_won === true) {
            pipeline.job_won++;
          } else if (match.job_won === null) {
            pipeline.vendor_accepted++;
          }
          break;
        case 'in_progress':
          pipeline.in_progress++;
          break;
        case 'completed':
          pipeline.completed++;
          break;
        case 'vendor_declined':
          pipeline.vendor_declined++;
          break;
        case 'no_response':
          pipeline.no_response++;
          break;
        case 'no_show':
          pipeline.no_show++;
          break;
      }
    }

    // Calculate payment summary
    const pendingPaymentCount = pendingPayments?.length || 0;
    const pendingPaymentAmount = pendingPayments?.reduce(
      (sum, p) => sum + (Number(p.amount) || 0),
      0
    ) || 0;

    // Get paid count
    const { count: paidCount } = await adminClient
      .from('referral_payments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'paid');

    return NextResponse.json({
      pipeline,
      payments: {
        pending_count: pendingPaymentCount,
        pending_amount: pendingPaymentAmount,
        paid_count: paidCount || 0,
      },
    });
  } catch (error) {
    console.error('Pipeline API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
