import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { SERVICE_TYPE_LABELS } from '@/types/database';

// GET /api/admin/crm/conversions - Get conversion analytics
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Get all requests with their matches
    let requestsQuery = adminClient
      .from('service_requests')
      .select(`
        id,
        service_type,
        status,
        created_at,
        matches:request_vendor_matches(
          id, status, job_won, job_completed, vendor_accepted,
          job_won_at, created_at
        )
      `);

    if (startDate) {
      requestsQuery = requestsQuery.gte('created_at', startDate);
    }
    if (endDate) {
      requestsQuery = requestsQuery.lte('created_at', endDate);
    }

    const { data: requests, error: requestsError } = await requestsQuery;

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
      return NextResponse.json(
        { message: 'Failed to fetch conversion data', error: requestsError.message },
        { status: 500 }
      );
    }

    // Calculate conversion by service type
    const serviceTypeStats: Record<string, {
      total_requests: number;
      matched: number;
      won: number;
      completed: number;
      time_to_win_hours: number[];
    }> = {};

    for (const request of requests || []) {
      const serviceType = request.service_type;
      if (!serviceTypeStats[serviceType]) {
        serviceTypeStats[serviceType] = {
          total_requests: 0,
          matched: 0,
          won: 0,
          completed: 0,
          time_to_win_hours: [],
        };
      }

      serviceTypeStats[serviceType].total_requests++;

      const matches = request.matches || [];
      if (matches.length > 0) {
        serviceTypeStats[serviceType].matched++;
      }

      // Check if any match was won
      const wonMatch = matches.find((m: { job_won: boolean }) => m.job_won === true);
      if (wonMatch) {
        serviceTypeStats[serviceType].won++;

        // Calculate time to win (from match created to job_won_at)
        if (wonMatch.job_won_at && wonMatch.created_at) {
          const createdAt = new Date(wonMatch.created_at).getTime();
          const wonAt = new Date(wonMatch.job_won_at).getTime();
          const hoursToWin = (wonAt - createdAt) / (1000 * 60 * 60);
          serviceTypeStats[serviceType].time_to_win_hours.push(hoursToWin);
        }
      }

      // Check if any match was completed
      const completedMatch = matches.find((m: { job_completed: boolean }) => m.job_completed === true);
      if (completedMatch) {
        serviceTypeStats[serviceType].completed++;
      }
    }

    // Format service type conversions
    const serviceTypeConversions = Object.entries(serviceTypeStats)
      .map(([service_type, stats]) => ({
        service_type,
        service_type_label: SERVICE_TYPE_LABELS[service_type as keyof typeof SERVICE_TYPE_LABELS] || service_type,
        total_requests: stats.total_requests,
        matched: stats.matched,
        won: stats.won,
        completed: stats.completed,
        match_rate: stats.total_requests > 0
          ? Math.round((stats.matched / stats.total_requests) * 100)
          : 0,
        conversion_rate: stats.matched > 0
          ? Math.round((stats.won / stats.matched) * 100)
          : 0,
        completion_rate: stats.won > 0
          ? Math.round((stats.completed / stats.won) * 100)
          : 0,
        avg_time_to_win_hours: stats.time_to_win_hours.length > 0
          ? Math.round(stats.time_to_win_hours.reduce((a, b) => a + b, 0) / stats.time_to_win_hours.length)
          : null,
      }))
      .sort((a, b) => b.total_requests - a.total_requests);

    // Get vendor conversion stats
    let vendorMatchesQuery = adminClient
      .from('request_vendor_matches')
      .select(`
        id, vendor_id, status, job_won, job_completed, review_rating, created_at,
        vendor:vendors(id, business_name, contact_name)
      `);

    if (startDate) {
      vendorMatchesQuery = vendorMatchesQuery.gte('created_at', startDate);
    }
    if (endDate) {
      vendorMatchesQuery = vendorMatchesQuery.lte('created_at', endDate);
    }

    const { data: vendorMatches, error: vendorMatchesError } = await vendorMatchesQuery;

    if (vendorMatchesError) {
      console.error('Error fetching vendor matches:', vendorMatchesError);
    }

    // Calculate vendor stats
    const vendorStats: Record<string, {
      vendor_id: string;
      vendor_name: string;
      business_name: string;
      total_matches: number;
      jobs_won: number;
      jobs_completed: number;
      ratings: number[];
    }> = {};

    for (const match of vendorMatches || []) {
      const vendorId = match.vendor_id;
      // Handle both single object and array cases from Supabase join
      const vendorData = match.vendor;
      const vendor = Array.isArray(vendorData) ? vendorData[0] : vendorData;

      if (!vendorStats[vendorId]) {
        vendorStats[vendorId] = {
          vendor_id: vendorId,
          vendor_name: (vendor as { contact_name?: string })?.contact_name || 'Unknown',
          business_name: (vendor as { business_name?: string })?.business_name || 'Unknown',
          total_matches: 0,
          jobs_won: 0,
          jobs_completed: 0,
          ratings: [],
        };
      }

      vendorStats[vendorId].total_matches++;

      if (match.job_won === true) {
        vendorStats[vendorId].jobs_won++;
      }

      if (match.job_completed === true) {
        vendorStats[vendorId].jobs_completed++;
      }

      if (match.review_rating) {
        vendorStats[vendorId].ratings.push(match.review_rating);
      }
    }

    // Get revenue per vendor
    const { data: payments } = await adminClient
      .from('referral_payments')
      .select('vendor_id, amount, status')
      .eq('status', 'paid');

    const vendorRevenue: Record<string, number> = {};
    for (const payment of payments || []) {
      if (payment.vendor_id) {
        vendorRevenue[payment.vendor_id] = (vendorRevenue[payment.vendor_id] || 0) + (Number(payment.amount) || 0);
      }
    }

    // Format vendor conversions
    const vendorConversions = Object.values(vendorStats)
      .map((stats) => ({
        vendor_id: stats.vendor_id,
        vendor_name: stats.vendor_name,
        business_name: stats.business_name,
        total_matches: stats.total_matches,
        jobs_won: stats.jobs_won,
        jobs_completed: stats.jobs_completed,
        conversion_rate: stats.total_matches > 0
          ? Math.round((stats.jobs_won / stats.total_matches) * 100)
          : 0,
        completion_rate: stats.jobs_won > 0
          ? Math.round((stats.jobs_completed / stats.jobs_won) * 100)
          : 0,
        total_revenue: vendorRevenue[stats.vendor_id] || 0,
        avg_rating: stats.ratings.length > 0
          ? Math.round((stats.ratings.reduce((a, b) => a + b, 0) / stats.ratings.length) * 10) / 10
          : null,
      }))
      .sort((a, b) => b.jobs_won - a.jobs_won);

    // Calculate overall funnel stats
    const totalRequests = requests?.length || 0;
    const matchedRequests = requests?.filter((r) => (r.matches || []).length > 0).length || 0;
    const wonRequests = requests?.filter((r) =>
      (r.matches || []).some((m: { job_won: boolean }) => m.job_won === true)
    ).length || 0;
    const completedRequests = requests?.filter((r) =>
      (r.matches || []).some((m: { job_completed: boolean }) => m.job_completed === true)
    ).length || 0;

    const funnel = {
      total_requests: totalRequests,
      matched: matchedRequests,
      matched_rate: totalRequests > 0 ? Math.round((matchedRequests / totalRequests) * 100) : 0,
      won: wonRequests,
      won_rate: matchedRequests > 0 ? Math.round((wonRequests / matchedRequests) * 100) : 0,
      completed: completedRequests,
      completed_rate: wonRequests > 0 ? Math.round((completedRequests / wonRequests) * 100) : 0,
    };

    // Get loss reason breakdown
    const { data: lostMatches } = await adminClient
      .from('request_vendor_matches')
      .select('job_outcome_reason')
      .not('job_outcome_reason', 'is', null)
      .neq('job_outcome_reason', 'completed_successfully');

    const lossReasons: Record<string, number> = {};
    for (const match of lostMatches || []) {
      const reason = match.job_outcome_reason || 'other';
      lossReasons[reason] = (lossReasons[reason] || 0) + 1;
    }

    return NextResponse.json({
      funnel,
      serviceTypeConversions,
      vendorConversions: vendorConversions.slice(0, 20), // Top 20 vendors
      lossReasons,
    });
  } catch (error) {
    console.error('Conversions API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
