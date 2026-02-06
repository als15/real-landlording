import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';

export async function GET() {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }

    const supabase = createAdminClient();
    const now = new Date();

    // Calculate date ranges
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate dates for trend data (last 12 weeks)
    const trendStartDate = new Date(now);
    trendStartDate.setDate(now.getDate() - 84); // 12 weeks ago

    // Fetch data in parallel
    const [
      weeklyRequestsResult,
      monthlyRequestsResult,
      completedRequestsResult,
      totalMatchedResult,
      serviceTypeResult,
      vendorMatchCountsResult,
      allRequestsResult,
      matchedRequestsWithTimesResult,
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

      // Vendor match counts from request_vendor_matches (with timestamps for trends)
      supabase
        .from('request_vendor_matches')
        .select('vendor_id, created_at, status, vendors(id, business_name, performance_score)')
        .in('status', ['vendor_accepted', 'in_progress', 'completed']),

      // All requests for trend data (last 12 weeks)
      supabase
        .from('service_requests')
        .select('id, created_at, status, urgency')
        .gte('created_at', trendStartDate.toISOString())
        .order('created_at', { ascending: true }),

      // Matched requests with intro_sent_at for time-to-match calculation
      supabase
        .from('service_requests')
        .select('id, created_at, matched_at')
        .in('status', ['matched', 'completed'])
        .not('matched_at', 'is', null)
        .limit(100),
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

    // Calculate actual vendor match counts with time-based trends
    const fourWeeksAgo = new Date(now);
    fourWeeksAgo.setDate(now.getDate() - 28);

    const vendorMatchCounts: Record<string, {
      business_name: string;
      performance_score: number;
      count: number;
      recentCount: number; // Matches in last 4 weeks
      completedCount: number; // Completed matches
    }> = {};

    if (vendorMatchCountsResult.data) {
      for (const match of vendorMatchCountsResult.data) {
        const vendorId = match.vendor_id;
        // vendors is returned as an object (single record) due to the join
        const vendor = match.vendors as unknown as { id: string; business_name: string; performance_score: number } | null;
        if (vendor) {
          if (!vendorMatchCounts[vendorId]) {
            vendorMatchCounts[vendorId] = {
              business_name: vendor.business_name,
              performance_score: vendor.performance_score || 0,
              count: 0,
              recentCount: 0,
              completedCount: 0,
            };
          }
          vendorMatchCounts[vendorId].count++;

          // Count recent matches
          const matchDate = new Date(match.created_at);
          if (matchDate >= fourWeeksAgo) {
            vendorMatchCounts[vendorId].recentCount++;
          }

          // Count completed matches
          if (match.status === 'completed') {
            vendorMatchCounts[vendorId].completedCount++;
          }
        }
      }
    }

    // Format vendor leaderboard with trend data
    const vendorLeaderboard = Object.entries(vendorMatchCounts)
      .map(([id, data]) => {
        // Calculate trend: compare recent 4 weeks to previous period
        const oldCount = data.count - data.recentCount;
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (data.recentCount > oldCount * 1.2) trend = 'up';
        else if (data.recentCount < oldCount * 0.8) trend = 'down';

        return {
          id,
          business_name: data.business_name,
          matches: data.count,
          recentMatches: data.recentCount,
          completedMatches: data.completedCount,
          successRate: data.count > 0 ? Math.round((data.completedCount / data.count) * 100) : 0,
          rating: data.performance_score,
          trend,
        };
      })
      .sort((a, b) => b.matches - a.matches || b.rating - a.rating)
      .slice(0, 10);

    // Calculate weekly trend data
    const weeklyTrend: { week: string; requests: number; matched: number; emergency: number }[] = [];
    if (allRequestsResult.data) {
      // Group by week
      const weekBuckets: Record<string, { requests: number; matched: number; emergency: number }> = {};

      for (const request of allRequestsResult.data) {
        const date = new Date(request.created_at);
        // Get the Monday of the week
        const dayOfWeek = date.getDay();
        const monday = new Date(date);
        monday.setDate(date.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        const weekKey = monday.toISOString().split('T')[0];

        if (!weekBuckets[weekKey]) {
          weekBuckets[weekKey] = { requests: 0, matched: 0, emergency: 0 };
        }
        weekBuckets[weekKey].requests++;
        if (request.status === 'matched' || request.status === 'completed') {
          weekBuckets[weekKey].matched++;
        }
        if (request.urgency === 'emergency') {
          weekBuckets[weekKey].emergency++;
        }
      }

      // Convert to array and format week labels
      const sortedWeeks = Object.keys(weekBuckets).sort();
      for (const weekKey of sortedWeeks) {
        const date = new Date(weekKey);
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        const day = date.getDate();
        weeklyTrend.push({
          week: `${month} ${day}`,
          ...weekBuckets[weekKey],
        });
      }
    }

    // Calculate average time to match (in hours)
    let avgTimeToMatch = 0;
    if (matchedRequestsWithTimesResult.data && matchedRequestsWithTimesResult.data.length > 0) {
      const matchTimes = matchedRequestsWithTimesResult.data
        .filter(r => r.matched_at && r.created_at)
        .map(r => {
          const created = new Date(r.created_at).getTime();
          const matched = new Date(r.matched_at).getTime();
          return (matched - created) / (1000 * 60 * 60); // Convert to hours
        })
        .filter(hours => hours > 0 && hours < 720); // Filter out outliers (> 30 days)

      if (matchTimes.length > 0) {
        avgTimeToMatch = Math.round(matchTimes.reduce((a, b) => a + b, 0) / matchTimes.length);
      }
    }

    // Calculate status distribution
    const statusCounts: Record<string, number> = {
      new: 0,
      matching: 0,
      matched: 0,
      completed: 0,
      cancelled: 0,
    };
    if (allRequestsResult.data) {
      for (const request of allRequestsResult.data) {
        if (statusCounts[request.status] !== undefined) {
          statusCounts[request.status]++;
        }
      }
    }
    const statusDistribution = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Calculate urgency distribution
    const urgencyCounts: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      emergency: 0,
    };
    if (allRequestsResult.data) {
      for (const request of allRequestsResult.data) {
        if (urgencyCounts[request.urgency] !== undefined) {
          urgencyCounts[request.urgency]++;
        }
      }
    }
    const urgencyDistribution = Object.entries(urgencyCounts).map(([urgency, count]) => ({
      urgency,
      count,
    }));

    return NextResponse.json({
      requestsThisWeek: weeklyRequestsResult.count || 0,
      requestsThisMonth: monthlyRequestsResult.count || 0,
      matchSuccessRate,
      avgTimeToMatch: avgTimeToMatch || 24, // Fallback to 24 if no data
      requestsByServiceType,
      vendorLeaderboard,
      weeklyTrend,
      statusDistribution,
      urgencyDistribution,
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
