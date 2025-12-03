import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get vendor profile
    const { data: vendor } = await adminClient
      .from('vendors')
      .select('id, performance_score, total_reviews')
      .eq('email', user.email)
      .single();

    if (!vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Get job stats
    const { data: jobs } = await adminClient
      .from('request_vendor_matches')
      .select('id, job_completed, vendor_accepted')
      .eq('vendor_id', vendor.id);

    const totalJobs = jobs?.length || 0;
    const completedJobs = jobs?.filter((j) => j.job_completed).length || 0;
    const pendingJobs = jobs?.filter((j) => !j.vendor_accepted && !j.job_completed).length || 0;

    return NextResponse.json({
      totalJobs,
      pendingJobs,
      completedJobs,
      averageRating: vendor.performance_score || 0,
      totalReviews: vendor.total_reviews || 0,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
