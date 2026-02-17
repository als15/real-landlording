import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { updateAllVendorScores, getScoreTier } from '@/lib/scoring';

/**
 * POST /api/cron/update-scores
 *
 * Cron job to recalculate all vendor performance scores.
 * Should be run periodically (daily recommended) to:
 * - Update recency bonuses/penalties
 * - Catch any missed score updates
 * - Ensure consistency across all vendor scores
 *
 * Can be triggered by:
 * - Vercel Cron: Add to vercel.json
 * - GitHub Actions: Schedule a workflow
 * - Manual: Admin can trigger via dashboard
 *
 * Requires: CRON_SECRET environment variable for authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate cron job
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createAdminClient();
    const startTime = Date.now();

    // Update all vendor scores
    const { updated, failed, results } = await updateAllVendorScores(supabase);

    const duration = Date.now() - startTime;

    // Log summary
    console.log(`[Cron] Updated ${updated} vendor scores in ${duration}ms (${failed} failed)`);

    // Build summary by tier
    const tierSummary: Record<string, number> = {};
    for (const result of results) {
      const tier = getScoreTier(result.score, result.breakdown.reviewCount > 0);
      tierSummary[tier] = (tierSummary[tier] || 0) + 1;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updated} vendor scores`,
      stats: {
        updated,
        failed,
        durationMs: duration,
        tierDistribution: tierSummary,
        averageScore: results.length > 0
          ? Math.round(results.reduce((sum, r) => sum + r.score, 0) / results.length)
          : 0,
      },
    });
  } catch (error) {
    console.error('[Cron] Error updating vendor scores:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/update-scores
 * Health check for the cron endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/cron/update-scores',
    method: 'POST',
    description: 'Recalculates all vendor performance scores',
    authentication: 'Bearer token (CRON_SECRET)',
    schedule: 'Daily recommended',
  });
}
