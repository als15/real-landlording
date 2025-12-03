import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    const now = new Date();

    // Calculate date ranges
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Fetch data in parallel
    const [
      weeklyRequestsResult,
      monthlyRequestsResult,
      completedRequestsResult,
      totalMatchedResult,
      serviceTypeResult,
      vendorStatsResult,
    ] = await Promise.all([
      // Requests this week
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfWeek.toISOString()),

      // Requests this month
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString()),

      // Completed requests (for success rate)
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),

      // Total matched requests
      supabase
        .from('service_requests')
        .select('*', { count: 'exact', head: true })
        .in('status', ['matched', 'completed']),

      // Requests by service type
      supabase
        .from('service_requests')
        .select('service_type'),

      // Vendor match counts
      supabase
        .from('vendors')
        .select('id, business_name, performance_score')
        .eq('status', 'active')
        .order('performance_score', { ascending: false })
        .limit(10),
    ]);

    // Calculate requests by service type
    const serviceTypeCounts: Record<string, number> = {};
    if (serviceTypeResult.data) {
      for (const request of serviceTypeResult.data) {
        const type = request.service_type;
        serviceTypeCounts[type] = (serviceTypeCounts[type] || 0) + 1;
      }
    }
    const requestsByServiceType = Object.entries(serviceTypeCounts)
      .map(([service_type, count]) => ({ service_type, count }))
      .sort((a, b) => b.count - a.count);

    // Calculate match success rate
    const totalMatched = totalMatchedResult.count || 0;
    const completed = completedRequestsResult.count || 0;
    const matchSuccessRate = totalMatched > 0
      ? Math.round((completed / totalMatched) * 100)
      : 0;

    // Format vendor leaderboard
    const vendorLeaderboard = (vendorStatsResult.data || []).map((vendor) => ({
      id: vendor.id,
      business_name: vendor.business_name,
      matches: 0, // Would need to count from request_matches table
      rating: vendor.performance_score || 0,
    }));

    return NextResponse.json({
      requestsThisWeek: weeklyRequestsResult.count || 0,
      requestsThisMonth: monthlyRequestsResult.count || 0,
      matchSuccessRate,
      avgTimeToMatch: 24, // Placeholder - would calculate from actual match times
      requestsByServiceType,
      vendorLeaderboard,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
