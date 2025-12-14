/**
 * Vendor Performance Scoring Configuration
 *
 * This file contains all scoring weights, thresholds, and formulas.
 * Modify this file to adjust how vendor scores are calculated.
 *
 * SCORING PHILOSOPHY:
 * - Base score starts at 50 (neutral)
 * - Reviews are the primary factor (weighted heavily)
 * - Engagement metrics (acceptance rate, response time) are secondary
 * - Recency matters - recent performance weighted more than old
 * - Penalties for bad behavior (no-shows, rejections)
 */

// ===========================================
// WEIGHT CONFIGURATION
// ===========================================

export const SCORING_WEIGHTS = {
  /**
   * How much each factor contributes to the final score (should sum to 1.0)
   */
  reviewScore: 0.50,      // 50% - Average rating from landlord reviews
  completionRate: 0.20,   // 20% - Job completion rate
  acceptanceRate: 0.15,   // 15% - How often vendor accepts matched jobs
  volumeBonus: 0.10,      // 10% - Bonus for handling more jobs
  recencyBonus: 0.05,     // 5%  - Bonus for recent activity
};

// ===========================================
// REVIEW SCORING
// ===========================================

export const REVIEW_CONFIG = {
  /**
   * Minimum reviews needed for full confidence in score
   * Below this, score is dampened toward neutral (50)
   */
  minReviewsForFullWeight: 5,

  /**
   * How much to weight recent reviews vs older ones
   * Higher = recent reviews matter more
   */
  recencyDecayDays: 180, // Reviews older than this are weighted less
  recencyMinWeight: 0.3, // Oldest reviews still count this much (30%)

  /**
   * Convert 1-5 star rating to 0-100 score
   */
  ratingToScore: (rating: number): number => {
    // 1 star = 0, 3 stars = 50, 5 stars = 100
    return Math.max(0, Math.min(100, (rating - 1) * 25));
  },
};

// ===========================================
// COMPLETION RATE SCORING
// ===========================================

export const COMPLETION_CONFIG = {
  /**
   * Target completion rate (100% = perfect)
   */
  targetRate: 1.0,

  /**
   * Minimum jobs to consider completion rate
   */
  minJobsForRate: 3,

  /**
   * Convert completion rate (0-1) to score (0-100)
   */
  rateToScore: (rate: number): number => {
    // Linear: 0% = 0, 100% = 100
    return rate * 100;
  },
};

// ===========================================
// ACCEPTANCE RATE SCORING
// ===========================================

export const ACCEPTANCE_CONFIG = {
  /**
   * Expected acceptance rate
   * We don't penalize for some rejections (vendors may be busy)
   */
  targetRate: 0.7, // 70% acceptance is considered good

  /**
   * Minimum matches to consider acceptance rate
   */
  minMatchesForRate: 3,

  /**
   * Convert acceptance rate to score
   * Vendors above target get full points, below get proportional
   */
  rateToScore: (rate: number, targetRate: number): number => {
    if (rate >= targetRate) return 100;
    return (rate / targetRate) * 100;
  },
};

// ===========================================
// VOLUME BONUS
// ===========================================

export const VOLUME_CONFIG = {
  /**
   * Jobs needed for maximum volume bonus
   */
  maxBonusJobs: 20,

  /**
   * Calculate volume bonus (0-100)
   * More jobs = more proven track record
   */
  calculateBonus: (totalJobs: number): number => {
    const cappedJobs = Math.min(totalJobs, VOLUME_CONFIG.maxBonusJobs);
    return (cappedJobs / VOLUME_CONFIG.maxBonusJobs) * 100;
  },
};

// ===========================================
// RECENCY BONUS
// ===========================================

export const RECENCY_CONFIG = {
  /**
   * Days since last activity to get full recency bonus
   */
  fullBonusDays: 30,

  /**
   * Days after which recency bonus is zero
   */
  zeroBonusDays: 180,

  /**
   * Calculate recency bonus based on last activity
   */
  calculateBonus: (daysSinceLastActivity: number): number => {
    if (daysSinceLastActivity <= RECENCY_CONFIG.fullBonusDays) {
      return 100;
    }
    if (daysSinceLastActivity >= RECENCY_CONFIG.zeroBonusDays) {
      return 0;
    }
    // Linear decay between full and zero
    const range = RECENCY_CONFIG.zeroBonusDays - RECENCY_CONFIG.fullBonusDays;
    const elapsed = daysSinceLastActivity - RECENCY_CONFIG.fullBonusDays;
    return Math.max(0, 100 - (elapsed / range) * 100);
  },
};

// ===========================================
// PENALTIES
// ===========================================

export const PENALTY_CONFIG = {
  /**
   * Points deducted per no-show (vendor accepted but didn't complete)
   */
  noShowPenalty: 10,

  /**
   * Maximum penalty from no-shows
   */
  maxNoShowPenalty: 30,

  /**
   * Points deducted for each 1-star review
   */
  oneStarPenalty: 5,
};

// ===========================================
// SCORE BOUNDS
// ===========================================

export const SCORE_BOUNDS = {
  /**
   * Minimum possible score
   */
  min: 0,

  /**
   * Maximum possible score
   */
  max: 100,

  /**
   * Default score for new vendors with no data
   */
  defaultScore: 50,

  /**
   * Score dampening for vendors with few reviews
   * Formula: finalScore = defaultScore + (calculatedScore - defaultScore) * confidence
   * Where confidence = min(1, reviewCount / minReviewsForFullWeight)
   */
  applyConfidenceDampening: (
    calculatedScore: number,
    reviewCount: number,
    minReviews: number,
    defaultScore: number
  ): number => {
    const confidence = Math.min(1, reviewCount / minReviews);
    return defaultScore + (calculatedScore - defaultScore) * confidence;
  },
};

// ===========================================
// SCORE TIERS (for display purposes)
// ===========================================

export type ScoreTier = 'excellent' | 'good' | 'average' | 'below_average' | 'poor' | 'new';

export const SCORE_TIERS: Record<ScoreTier, { min: number; max: number; label: string; color: string }> = {
  excellent: { min: 85, max: 100, label: 'Excellent', color: '#52c41a' },
  good: { min: 70, max: 84, label: 'Good', color: '#73d13d' },
  average: { min: 50, max: 69, label: 'Average', color: '#faad14' },
  below_average: { min: 30, max: 49, label: 'Below Average', color: '#ff7a45' },
  poor: { min: 0, max: 29, label: 'Poor', color: '#ff4d4f' },
  new: { min: -1, max: -1, label: 'New Vendor', color: '#1890ff' },
};

export function getScoreTier(score: number, hasReviews: boolean): ScoreTier {
  if (!hasReviews) return 'new';

  for (const [tier, config] of Object.entries(SCORE_TIERS)) {
    if (tier === 'new') continue;
    if (score >= config.min && score <= config.max) {
      return tier as ScoreTier;
    }
  }
  return 'average';
}
