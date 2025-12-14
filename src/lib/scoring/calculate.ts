/**
 * Vendor Performance Score Calculator
 *
 * This module calculates vendor scores based on the configuration in config.ts.
 * It's designed to be called whenever a vendor's score needs to be recalculated.
 */

import {
  SCORING_WEIGHTS,
  REVIEW_CONFIG,
  COMPLETION_CONFIG,
  ACCEPTANCE_CONFIG,
  VOLUME_CONFIG,
  RECENCY_CONFIG,
  PENALTY_CONFIG,
  SCORE_BOUNDS,
} from './config';

// ===========================================
// TYPES
// ===========================================

export interface VendorMetrics {
  vendorId: string;

  // Review data
  reviews: Array<{
    rating: number;       // 1-5
    createdAt: Date;
  }>;

  // Job data
  totalMatches: number;   // Total times vendor was matched
  acceptedJobs: number;   // Jobs vendor accepted
  completedJobs: number;  // Jobs marked as completed
  noShows: number;        // Accepted but not completed (no-show)

  // Activity
  lastActivityDate: Date | null;
}

export interface ScoreBreakdown {
  // Component scores (0-100 each)
  reviewScore: number;
  completionScore: number;
  acceptanceScore: number;
  volumeBonus: number;
  recencyBonus: number;

  // Penalties
  penalties: number;

  // Weighted components
  weightedReview: number;
  weightedCompletion: number;
  weightedAcceptance: number;
  weightedVolume: number;
  weightedRecency: number;

  // Final
  rawScore: number;
  confidenceAdjustedScore: number;
  finalScore: number;

  // Metadata
  reviewCount: number;
  confidence: number;
}

export interface ScoreResult {
  vendorId: string;
  score: number;
  breakdown: ScoreBreakdown;
  calculatedAt: Date;
}

// ===========================================
// CALCULATION FUNCTIONS
// ===========================================

/**
 * Calculate the review component score
 */
function calculateReviewScore(reviews: VendorMetrics['reviews']): number {
  if (reviews.length === 0) {
    return SCORE_BOUNDS.defaultScore;
  }

  const now = new Date();

  // Calculate weighted average based on recency
  let weightedSum = 0;
  let totalWeight = 0;

  for (const review of reviews) {
    const daysSinceReview = Math.floor(
      (now.getTime() - review.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Calculate recency weight for this review
    let recencyWeight = 1;
    if (daysSinceReview > REVIEW_CONFIG.recencyDecayDays) {
      recencyWeight = REVIEW_CONFIG.recencyMinWeight;
    } else if (daysSinceReview > 0) {
      const decay = daysSinceReview / REVIEW_CONFIG.recencyDecayDays;
      recencyWeight = 1 - (decay * (1 - REVIEW_CONFIG.recencyMinWeight));
    }

    const reviewScore = REVIEW_CONFIG.ratingToScore(review.rating);
    weightedSum += reviewScore * recencyWeight;
    totalWeight += recencyWeight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : SCORE_BOUNDS.defaultScore;
}

/**
 * Calculate the completion rate component score
 */
function calculateCompletionScore(metrics: VendorMetrics): number {
  const totalStartedJobs = metrics.acceptedJobs;

  if (totalStartedJobs < COMPLETION_CONFIG.minJobsForRate) {
    return SCORE_BOUNDS.defaultScore; // Not enough data
  }

  const completionRate = metrics.completedJobs / totalStartedJobs;
  return COMPLETION_CONFIG.rateToScore(completionRate);
}

/**
 * Calculate the acceptance rate component score
 */
function calculateAcceptanceScore(metrics: VendorMetrics): number {
  if (metrics.totalMatches < ACCEPTANCE_CONFIG.minMatchesForRate) {
    return SCORE_BOUNDS.defaultScore; // Not enough data
  }

  const acceptanceRate = metrics.acceptedJobs / metrics.totalMatches;
  return ACCEPTANCE_CONFIG.rateToScore(acceptanceRate, ACCEPTANCE_CONFIG.targetRate);
}

/**
 * Calculate volume bonus
 */
function calculateVolumeBonus(metrics: VendorMetrics): number {
  return VOLUME_CONFIG.calculateBonus(metrics.completedJobs);
}

/**
 * Calculate recency bonus
 */
function calculateRecencyBonus(metrics: VendorMetrics): number {
  if (!metrics.lastActivityDate) {
    return 0; // No activity
  }

  const daysSinceActivity = Math.floor(
    (new Date().getTime() - metrics.lastActivityDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return RECENCY_CONFIG.calculateBonus(daysSinceActivity);
}

/**
 * Calculate penalties
 */
function calculatePenalties(metrics: VendorMetrics): number {
  let totalPenalty = 0;

  // No-show penalties
  const noShowPenalty = Math.min(
    metrics.noShows * PENALTY_CONFIG.noShowPenalty,
    PENALTY_CONFIG.maxNoShowPenalty
  );
  totalPenalty += noShowPenalty;

  // 1-star review penalties
  const oneStarCount = metrics.reviews.filter(r => r.rating === 1).length;
  totalPenalty += oneStarCount * PENALTY_CONFIG.oneStarPenalty;

  return totalPenalty;
}

// ===========================================
// MAIN CALCULATION
// ===========================================

/**
 * Calculate vendor performance score with full breakdown
 */
export function calculateVendorScore(metrics: VendorMetrics): ScoreResult {
  // Calculate individual components
  const reviewScore = calculateReviewScore(metrics.reviews);
  const completionScore = calculateCompletionScore(metrics);
  const acceptanceScore = calculateAcceptanceScore(metrics);
  const volumeBonus = calculateVolumeBonus(metrics);
  const recencyBonus = calculateRecencyBonus(metrics);
  const penalties = calculatePenalties(metrics);

  // Apply weights
  const weightedReview = reviewScore * SCORING_WEIGHTS.reviewScore;
  const weightedCompletion = completionScore * SCORING_WEIGHTS.completionRate;
  const weightedAcceptance = acceptanceScore * SCORING_WEIGHTS.acceptanceRate;
  const weightedVolume = volumeBonus * SCORING_WEIGHTS.volumeBonus;
  const weightedRecency = recencyBonus * SCORING_WEIGHTS.recencyBonus;

  // Calculate raw score
  const rawScore = weightedReview + weightedCompletion + weightedAcceptance +
                   weightedVolume + weightedRecency - penalties;

  // Apply confidence dampening based on review count
  const reviewCount = metrics.reviews.length;
  const confidence = Math.min(1, reviewCount / REVIEW_CONFIG.minReviewsForFullWeight);
  const confidenceAdjustedScore = SCORE_BOUNDS.applyConfidenceDampening(
    rawScore,
    reviewCount,
    REVIEW_CONFIG.minReviewsForFullWeight,
    SCORE_BOUNDS.defaultScore
  );

  // Clamp to bounds
  const finalScore = Math.max(
    SCORE_BOUNDS.min,
    Math.min(SCORE_BOUNDS.max, Math.round(confidenceAdjustedScore))
  );

  return {
    vendorId: metrics.vendorId,
    score: finalScore,
    breakdown: {
      reviewScore,
      completionScore,
      acceptanceScore,
      volumeBonus,
      recencyBonus,
      penalties,
      weightedReview,
      weightedCompletion,
      weightedAcceptance,
      weightedVolume,
      weightedRecency,
      rawScore,
      confidenceAdjustedScore,
      finalScore,
      reviewCount,
      confidence,
    },
    calculatedAt: new Date(),
  };
}

/**
 * Calculate scores for multiple vendors
 */
export function calculateMultipleVendorScores(
  metricsArray: VendorMetrics[]
): ScoreResult[] {
  return metricsArray.map(calculateVendorScore);
}
