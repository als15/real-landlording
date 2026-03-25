import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';

export async function GET() {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }

    const supabase = createAdminClient();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQ1 = new Date(now.getFullYear(), 0, 1); // Jan 1
    // Months elapsed in Q1 (at least 1 to avoid division by zero)
    const monthsElapsed = Math.max(1, now.getMonth() + (now.getDate() > 1 ? 1 : 0));

    const [
      q1RequestsResult,
      activeVendorsResult,
      completedRequestsResult,
      matchedOrCompletedResult,
      matchedWithTimesResult,
      paidPaymentsResult,
      totalPaymentsResult,
      totalLandlordsResult,
      landlordsWithAuthResult,
      repeatLandlordsResult,
    ] = await Promise.all([
      // 1. Requests in Q1 (Jan 1 – now)
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfQ1.toISOString()),

      // 2. Active vendors
      supabase
        .from('vendors')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),

      // 3. Completed requests (for match success rate)
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // 3. Matched + completed requests (denominator for success rate)
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['matched', 'completed']),

      // 4. Matched requests with timestamps for avg time to match
      supabase
        .from('service_requests')
        .select('created_at, intro_sent_at')
        .in('status', ['matched', 'completed'])
        .not('intro_sent_at', 'is', null)
        .limit(200),

      // 5. Paid payments in Q1 (revenue)
      supabase
        .from('referral_payments')
        .select('amount')
        .eq('status', 'paid')
        .gte('paid_date', startOfQ1.toISOString()),

      // 6. Total payments (for collection rate)
      supabase
        .from('referral_payments')
        .select('status'),

      // 7. Total landlords
      supabase
        .from('landlords')
        .select('*', { count: 'exact', head: true }),

      // 7. Landlords with auth_user_id (signup conversion)
      supabase
        .from('landlords')
        .select('*', { count: 'exact', head: true })
        .not('auth_user_id', 'is', null),

      // 8. Landlords with request_count > 1 (repeat usage)
      supabase
        .from('landlords')
        .select('*', { count: 'exact', head: true })
        .gt('request_count', 1),
    ]);

    // 1. Requests per month (Q1 average)
    const q1Total = q1RequestsResult.count || 0;
    const requestsPerMonth = Math.round(q1Total / monthsElapsed);

    // 2. Active vendors
    const activeVendors = activeVendorsResult.count || 0;

    // 3. Match success rate
    const completed = completedRequestsResult.count || 0;
    const matchedOrCompleted = matchedOrCompletedResult.count || 0;
    const matchSuccessRate = matchedOrCompleted > 0
      ? Math.round((completed / matchedOrCompleted) * 100)
      : 0;

    // 4. Avg time to match (hours)
    let avgTimeToMatch = 0;
    if (matchedWithTimesResult.data && matchedWithTimesResult.data.length > 0) {
      const times = matchedWithTimesResult.data
        .filter((r) => r.intro_sent_at && r.created_at)
        .map((r) => {
          const created = new Date(r.created_at).getTime();
          const matched = new Date(r.intro_sent_at).getTime();
          return (matched - created) / (1000 * 60 * 60);
        })
        .filter((h) => h > 0 && h < 720);

      if (times.length > 0) {
        avgTimeToMatch = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      }
    }

    // 5. Revenue per month (Q1 average)
    let revenuePerMonth = 0;
    if (paidPaymentsResult.data) {
      const q1Revenue = paidPaymentsResult.data.reduce(
        (sum, p) => sum + (Number(p.amount) || 0),
        0
      );
      revenuePerMonth = Math.round(q1Revenue / monthsElapsed);
    }

    // 6. Payment collection rate
    let paymentCollectionRate = 0;
    if (totalPaymentsResult.data && totalPaymentsResult.data.length > 0) {
      const paidCount = totalPaymentsResult.data.filter((p) => p.status === 'paid').length;
      paymentCollectionRate = Math.round((paidCount / totalPaymentsResult.data.length) * 100);
    }

    // 7. Signup conversion
    const totalLandlords = totalLandlordsResult.count || 0;
    const landlordsWithAuth = landlordsWithAuthResult.count || 0;
    const signupConversion = totalLandlords > 0
      ? Math.round((landlordsWithAuth / totalLandlords) * 100)
      : 0;

    // 8. Repeat usage
    const repeatLandlords = repeatLandlordsResult.count || 0;
    const repeatUsage = totalLandlords > 0
      ? Math.round((repeatLandlords / totalLandlords) * 100)
      : 0;

    return NextResponse.json({
      requestsPerMonth: requestsPerMonth,
      activeVendors,
      matchSuccessRate,
      avgTimeToMatch,
      revenuePerMonth,
      paymentCollectionRate,
      signupConversion,
      repeatUsage,
    });
  } catch (error) {
    console.error('KPI analytics API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch KPI data' },
      { status: 500 }
    );
  }
}
