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
  RESPONSE_TIME_CONFIG,
} from './config';

// ===========================================
// TYPES
// ===========================================

export interface VendorMetrics {
  vendorId: string;

  // Review data (multi-dimensional)
  reviews: Array<{
    rating: number;       // 1-5 (overall or calculated average)
    quality: number | null;
    price: number | null;
    timeline: number | null;
    treatment: number | null;
    createdAt: Date;
  }>;

  // Job data
  totalMatches: number;   // Total times vendor was matched
  acceptedJobs: number;   // Jobs vendor accepted
  completedJobs: number;  // Jobs marked as completed
  noShows: number;        // Accepted but not completed (no-show)
  declinesAfterAccept: number; // Accepted then declined

  // Response time data
  responseTimes: number[]; // Array of response times in seconds

  // Vetting data
  vettingScore: number | null; // Initial vetting score (0-45)

  // Activity
  lastActivityDate: Date | null;
}

export interface ScoreBreakdown {
  // Component scores (0-100 each)
  reviewScore: number;
  completionScore: number;
  acceptanceScore: number;
  responseTimeScore: number;
  vettingScore: number;
  volumeBonus: number;
  recencyBonus: number;

  // Penalties
  penalties: number;

  // Weighted components
  weightedReview: number;
  weightedCompletion: number;
  weightedAcceptance: number;
  weightedResponseTime: number;
  weightedVetting: number;
  weightedVolume: number;
  weightedRecency: number;

  // Final
  rawScore: number;
  confidenceAdjustedScore: number;
  finalScore: number;

  // Metadata
  reviewCount: number;
  confidence: number;
  avgResponseTimeHours: number | null;
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
 * Calculate the effective rating for a review (multi-dimensional average or overall)
 */
function getEffectiveRating(review: VendorMetrics['reviews'][0]): number {
  const dimensions = [
    review.quality,
    review.price,
    review.timeline,
    review.treatment,
  ].filter((d): d is number => d !== null);

  // If multi-dimensional ratings exist, use their average
  if (dimensions.length > 0) {
    return dimensions.reduce((a, b) => a + b, 0) / dimensions.length;
  }

  // Fall back to overall rating
  return review.rating;
}

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

    // Use effective rating (multi-dimensional average or overall)
    const effectiveRating = getEffectiveRating(review);
    const reviewScore = REVIEW_CONFIG.ratingToScore(effectiveRating);
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
 * Calculate response time score
 */
function calculateResponseTimeScore(responseTimes: number[]): { score: number; avgHours: number | null } {
  if (responseTimes.length < RESPONSE_TIME_CONFIG.minResponsesForScore) {
    return { score: SCORE_BOUNDS.defaultScore, avgHours: null }; // Not enough data
  }

  const avgSeconds = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
  const avgHours = avgSeconds / 3600;
  const score = RESPONSE_TIME_CONFIG.hoursToScore(avgHours);

  return { score, avgHours };
}

/**
 * Calculate vetting score component
 */
function calculateVettingScoreComponent(vettingScore: number | null): number {
  if (vettingScore === null) {
    return SCORE_BOUNDS.defaultScore; // No vetting data
  }

  // Vetting score is 0-45, normalize to 0-100
  return Math.min(100, (vettingScore / 45) * 100);
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

  // Decline-after-accept penalties
  const declinePenalty = Math.min(
    metrics.declinesAfterAccept * PENALTY_CONFIG.declineAfterAcceptPenalty,
    PENALTY_CONFIG.maxDeclineAfterAcceptPenalty
  );
  totalPenalty += declinePenalty;

  // 1-star review penalties (use effective rating for multi-dimensional)
  const oneStarCount = metrics.reviews.filter(r => {
    const effectiveRating = getEffectiveRating(r);
    return effectiveRating <= 1.5; // Treat anything <= 1.5 as a 1-star equivalent
  }).length;
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
  const { score: responseTimeScore, avgHours: avgResponseTimeHours } = calculateResponseTimeScore(metrics.responseTimes);
  const vettingScoreNormalized = calculateVettingScoreComponent(metrics.vettingScore);
  const volumeBonus = calculateVolumeBonus(metrics);
  const recencyBonus = calculateRecencyBonus(metrics);
  const penalties = calculatePenalties(metrics);

  // Apply weights
  const weightedReview = reviewScore * SCORING_WEIGHTS.reviewScore;
  const weightedCompletion = completionScore * SCORING_WEIGHTS.completionRate;
  const weightedAcceptance = acceptanceScore * SCORING_WEIGHTS.acceptanceRate;
  const weightedResponseTime = responseTimeScore * SCORING_WEIGHTS.responseTime;
  const weightedVetting = vettingScoreNormalized * SCORING_WEIGHTS.vettingScore;
  const weightedVolume = volumeBonus * SCORING_WEIGHTS.volumeBonus;
  const weightedRecency = recencyBonus * SCORING_WEIGHTS.recencyBonus;

  // Calculate raw score
  const rawScore = weightedReview + weightedCompletion + weightedAcceptance +
                   weightedResponseTime + weightedVetting +
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
      responseTimeScore,
      vettingScore: vettingScoreNormalized,
      volumeBonus,
      recencyBonus,
      penalties,
      weightedReview,
      weightedCompletion,
      weightedAcceptance,
      weightedResponseTime,
      weightedVetting,
      weightedVolume,
      weightedRecency,
      rawScore,
      confidenceAdjustedScore,
      finalScore,
      reviewCount,
      confidence,
      avgResponseTimeHours,
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
