/**
 * Database integration for vendor scoring
 *
 * This module handles fetching vendor metrics from the database
 * and updating vendor scores.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { VendorMetrics, calculateVendorScore, ScoreResult } from './calculate';
import { AUTO_SUSPEND_CONFIG } from './config';

// ===========================================
// FETCH METRICS FROM DATABASE
// ===========================================

/**
 * Fetch all metrics needed to calculate a vendor's score
 */
export async function getVendorMetricsFromDb(
  supabase: SupabaseClient,
  vendorId: string
): Promise<VendorMetrics | null> {
  // Get vendor record for vetting score
  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select('vetting_score')
    .eq('id', vendorId)
    .single();

  if (vendorError && vendorError.code !== 'PGRST116') {
    console.error('Error fetching vendor:', vendorError);
    return null;
  }

  // Get all matches for this vendor with their reviews
  const { data: matches, error: matchError } = await supabase
    .from('request_vendor_matches')
    .select(`
      id,
      vendor_accepted,
      job_completed,
      review_rating,
      review_quality,
      review_price,
      review_timeline,
      review_treatment,
      review_submitted_at,
      response_time_seconds,
      declined_after_accept,
      created_at
    `)
    .eq('vendor_id', vendorId);

  if (matchError) {
    console.error('Error fetching vendor matches:', matchError);
    return null;
  }

  if (!matches || matches.length === 0) {
    // Vendor has no matches yet
    return {
      vendorId,
      reviews: [],
      totalMatches: 0,
      acceptedJobs: 0,
      completedJobs: 0,
      noShows: 0,
      declinesAfterAccept: 0,
      responseTimes: [],
      vettingScore: vendor?.vetting_score ?? null,
      lastActivityDate: null,
    };
  }

  // Process matches into metrics
  const reviews: VendorMetrics['reviews'] = [];
  const responseTimes: number[] = [];
  let acceptedJobs = 0;
  let completedJobs = 0;
  let noShows = 0;
  let declinesAfterAccept = 0;
  let lastActivityDate: Date | null = null;

  for (const match of matches) {
    // Track accepted jobs
    if (match.vendor_accepted === true) {
      acceptedJobs++;

      // Track completed jobs
      if (match.job_completed === true) {
        completedJobs++;
      } else if (match.job_completed === false) {
        // Explicitly marked as not completed = no-show
        noShows++;
      }
    }

    // Track decline-after-accept
    if (match.declined_after_accept === true) {
      declinesAfterAccept++;
    }

    // Collect response times
    if (match.response_time_seconds !== null && match.response_time_seconds > 0) {
      responseTimes.push(match.response_time_seconds);
    }

    // Collect reviews (with multi-dimensional data)
    if (match.review_rating !== null && match.review_submitted_at) {
      reviews.push({
        rating: match.review_rating,
        quality: match.review_quality,
        price: match.review_price,
        timeline: match.review_timeline,
        treatment: match.review_treatment,
        createdAt: new Date(match.review_submitted_at),
      });
    }

    // Track last activity
    const matchDate = new Date(match.created_at);
    if (!lastActivityDate || matchDate > lastActivityDate) {
      lastActivityDate = matchDate;
    }
  }

  return {
    vendorId,
    reviews,
    totalMatches: matches.length,
    acceptedJobs,
    completedJobs,
    noShows,
    declinesAfterAccept,
    responseTimes,
    vettingScore: vendor?.vetting_score ?? null,
    lastActivityDate,
  };
}

/**
 * Fetch metrics for all active vendors
 */
export async function getAllVendorMetricsFromDb(
  supabase: SupabaseClient
): Promise<VendorMetrics[]> {
  // Get all active vendors
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('status', 'active');

  if (vendorError || !vendors) {
    console.error('Error fetching vendors:', vendorError);
    return [];
  }

  // Fetch metrics for each vendor
  const metricsPromises = vendors.map(v => getVendorMetricsFromDb(supabase, v.id));
  const metricsResults = await Promise.all(metricsPromises);

  // Filter out nulls
  return metricsResults.filter((m): m is VendorMetrics => m !== null);
}

// ===========================================
// UPDATE SCORES IN DATABASE
// ===========================================

/**
 * Check if vendor should be auto-suspended based on score
 */
async function checkAndAutoSuspend(
  supabase: SupabaseClient,
  vendorId: string,
  score: number,
  reviewCount: number
): Promise<boolean> {
  // Don't suspend if score is above threshold
  if (score >= AUTO_SUSPEND_CONFIG.threshold) {
    return false;
  }

  // Don't suspend vendors with insufficient data
  if (reviewCount < AUTO_SUSPEND_CONFIG.minReviewsBeforeSuspend) {
    return false;
  }

  // Suspend the vendor
  const { error } = await supabase
    .from('vendors')
    .update({
      status: 'inactive',
      suspended_at: new Date().toISOString(),
      suspension_reason: `Auto-suspended: Performance score dropped to ${score} (below threshold of ${AUTO_SUSPEND_CONFIG.threshold})`,
    })
    .eq('id', vendorId)
    .eq('status', 'active'); // Only suspend if currently active

  if (error) {
    console.error('Error auto-suspending vendor:', error);
    return false;
  }

  console.log(`Vendor ${vendorId} auto-suspended with score ${score}`);
  return true;
}

/**
 * Calculate and update a single vendor's score
 */
export async function updateVendorScore(
  supabase: SupabaseClient,
  vendorId: string
): Promise<ScoreResult | null> {
  // Fetch metrics
  const metrics = await getVendorMetricsFromDb(supabase, vendorId);
  if (!metrics) {
    return null;
  }

  // Calculate score
  const result = calculateVendorScore(metrics);

  // Update vendor record
  const { error: updateError } = await supabase
    .from('vendors')
    .update({
      performance_score: result.score,
      total_reviews: metrics.reviews.length,
    })
    .eq('id', vendorId);

  if (updateError) {
    console.error('Error updating vendor score:', updateError);
    return null;
  }

  // Check for auto-suspension
  await checkAndAutoSuspend(supabase, vendorId, result.score, metrics.reviews.length);

  return result;
}

/**
 * Calculate and update scores for all active vendors
 */
export async function updateAllVendorScores(
  supabase: SupabaseClient
): Promise<{ updated: number; failed: number; results: ScoreResult[] }> {
  // Get all active vendors
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('id')
    .eq('status', 'active');

  if (vendorError || !vendors) {
    console.error('Error fetching vendors:', vendorError);
    return { updated: 0, failed: 0, results: [] };
  }

  let updated = 0;
  let failed = 0;
  const results: ScoreResult[] = [];

  // Process each vendor
  for (const vendor of vendors) {
    const result = await updateVendorScore(supabase, vendor.id);
    if (result) {
      updated++;
      results.push(result);
    } else {
      failed++;
    }
  }

  return { updated, failed, results };
}
