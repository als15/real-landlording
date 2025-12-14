import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAllVendorScores, updateVendorScore, getScoreTier } from '@/lib/scoring';

/**
 * GET /api/admin/scores
 * Get scoring summary for all vendors
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    // Get all vendors with their scores
    const { data: vendors, error } = await supabase
      .from('vendors')
      .select('id, business_name, contact_name, performance_score, total_reviews, status')
      .eq('status', 'active')
      .order('performance_score', { ascending: false });

    if (error) {
      return NextResponse.json({ message: 'Failed to fetch vendors' }, { status: 500 });
    }

    // Add tier information
    const vendorsWithTiers = vendors?.map(v => ({
      ...v,
      tier: getScoreTier(v.performance_score || 50, (v.total_reviews || 0) > 0),
    }));

    return NextResponse.json({
      vendors: vendorsWithTiers,
      summary: {
        total: vendors?.length || 0,
        withReviews: vendors?.filter(v => (v.total_reviews || 0) > 0).length || 0,
        averageScore: vendors?.length
          ? Math.round(vendors.reduce((sum, v) => sum + (v.performance_score || 50), 0) / vendors.length)
          : 50,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/scores
 * Recalculate scores for all vendors or a specific vendor
 *
 * Body: { vendorId?: string } - if provided, only recalculate that vendor
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ message: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { vendorId } = body;

    if (vendorId) {
      // Recalculate single vendor
      const result = await updateVendorScore(supabase, vendorId);
      if (!result) {
        return NextResponse.json({ message: 'Failed to update vendor score' }, { status: 500 });
      }
      return NextResponse.json({
        message: 'Vendor score updated',
        result,
      });
    }

    // Recalculate all vendors
    const { updated, failed, results } = await updateAllVendorScores(supabase);

    return NextResponse.json({
      message: `Updated ${updated} vendor scores${failed > 0 ? `, ${failed} failed` : ''}`,
      updated,
      failed,
      results: results.map(r => ({
        vendorId: r.vendorId,
        score: r.score,
        reviewCount: r.breakdown.reviewCount,
        tier: getScoreTier(r.score, r.breakdown.reviewCount > 0),
      })),
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
