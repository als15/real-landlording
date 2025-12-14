/**
 * Database integration for vendor scoring
 *
 * This module handles fetching vendor metrics from the database
 * and updating vendor scores.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { VendorMetrics, calculateVendorScore, ScoreResult } from './calculate';

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
  // Get all matches for this vendor with their reviews
  const { data: matches, error: matchError } = await supabase
    .from('request_vendor_matches')
    .select(`
      id,
      vendor_accepted,
      job_completed,
      review_rating,
      review_submitted_at,
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
      lastActivityDate: null,
    };
  }

  // Process matches into metrics
  const reviews: VendorMetrics['reviews'] = [];
  let acceptedJobs = 0;
  let completedJobs = 0;
  let noShows = 0;
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

    // Collect reviews
    if (match.review_rating !== null && match.review_submitted_at) {
      reviews.push({
        rating: match.review_rating,
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
