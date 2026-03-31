import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

export async function GET() {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    // Get vendor performance data
    const { data: vendor } = await adminClient
      .from('vendors')
      .select('performance_score, total_reviews')
      .eq('id', vendorId)
      .single();

    // Get all matches with request data for stats
    const { data: jobs } = await adminClient
      .from('request_vendor_matches')
      .select(`
        id, status, vendor_accepted, job_completed, created_at,
        request:service_requests(service_type, property_location)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    const allJobs = jobs || [];
    const totalJobs = allJobs.length;
    const pendingJobs = allJobs.filter((j) => ['pending', 'intro_sent', 'estimate_sent'].includes(j.status)).length;
    const acceptedJobs = allJobs.filter((j) => j.status === 'vendor_accepted').length;
    const inProgressJobs = allJobs.filter((j) => j.status === 'in_progress').length;
    const completedJobs = allJobs.filter((j) => j.status === 'completed' || j.job_completed).length;

    // Status breakdown for chart
    const statusCounts: Record<string, number> = {};
    for (const job of allJobs) {
      statusCounts[job.status] = (statusCounts[job.status] || 0) + 1;
    }
    const statusBreakdown = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count,
    }));

    // Recent jobs (last 5)
    const recentJobs = allJobs.slice(0, 5).map((j) => {
      const req = j.request as unknown as { service_type: string; property_location: string } | null;
      return {
        id: j.id,
        status: j.status,
        service_type: req?.service_type || '',
        property_location: req?.property_location || '',
        created_at: j.created_at,
      };
    });

    return NextResponse.json({
      totalJobs,
      pendingJobs,
      acceptedJobs,
      inProgressJobs,
      completedJobs,
      averageRating: vendor?.performance_score || 0,
      totalReviews: vendor?.total_reviews || 0,
      statusBreakdown,
      recentJobs,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
