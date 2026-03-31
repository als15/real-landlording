import { NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * GET /api/landlord/dashboard
 * Returns dashboard stats for the current landlord
 */
export async function GET() {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, userEmail } = result.context;

    // Run queries in parallel
    const [requestsRes, matchesRes] = await Promise.all([
      // All requests by this landlord
      adminClient
        .from('service_requests')
        .select('id, status, service_type, property_location, created_at, urgency')
        .eq('landlord_email', userEmail)
        .order('created_at', { ascending: false }),

      // All matches for this landlord's requests (with review data)
      adminClient
        .from('request_vendor_matches')
        .select(`
          id,
          request_id,
          intro_sent,
          review_rating,
          review_quality,
          review_price,
          review_timeline,
          review_treatment,
          status,
          service_requests!inner(landlord_email)
        `)
        .eq('service_requests.landlord_email', userEmail),
    ]);

    const requests = requestsRes.data || [];
    const matches = matchesRes.data || [];

    // Status counts
    const statusCounts: Record<string, number> = {};
    for (const r of requests) {
      statusCounts[r.status] = (statusCounts[r.status] || 0) + 1;
    }

    const activeStatuses = ['new', 'matching', 'matched'];
    const activeRequests = requests.filter((r) => activeStatuses.includes(r.status)).length;
    const completedRequests = statusCounts['completed'] || 0;
    const totalRequests = requests.length;

    // Pending reviews: matches with intro sent but no review rating
    const pendingReviews = matches.filter(
      (m) => m.intro_sent && m.review_rating === null && !['cancelled', 'no_show', 'vendor_declined', 'no_response'].includes(m.status)
    ).length;

    // Average vendor rating
    const ratings = matches
      .filter((m) => m.review_rating !== null)
      .map((m) => m.review_rating as number);
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
      : null;

    // Recent requests (last 5) with match counts
    const recentRequests = requests.slice(0, 5).map((r) => ({
      ...r,
      match_count: matches.filter((m) => m.request_id === r.id).length,
    }));

    // Status breakdown for chart
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    return NextResponse.json({
      activeRequests,
      completedRequests,
      totalRequests,
      pendingReviews,
      avgRating,
      recentRequests,
      statusBreakdown,
    });
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
