/**
 * Vendor Performance Scoring Configuration
 *
 * This file contains all scoring weights, thresholds, and formulas.
 * Modify this file to adjust how vendor scores are calculated.
 *
 * SCORING PHILOSOPHY:
 * - Base score starts at 50 (neutral)
 * - Reviews are the primary factor (weighted heavily)
 * - Response time rewards fast-responding vendors
 * - Vetting score provides initial baseline for new vendors
 * - Recency matters - recent performance weighted more than old
 * - Penalties for bad behavior (no-shows, rejections, decline-after-accept)
 */

// ===========================================
// WEIGHT CONFIGURATION
// ===========================================

export const SCORING_WEIGHTS = {
  /**
   * How much each factor contributes to the final score (should sum to 1.0)
   */
  reviewScore: 0.35,      // 35% - Average rating from landlord reviews (multi-dimensional)
  completionRate: 0.20,   // 20% - Job completion rate
  responseTime: 0.15,     // 15% - How quickly vendor responds to intros
  vettingScore: 0.10,     // 10% - Initial vetting assessment
  acceptanceRate: 0.10,   // 10% - How often vendor accepts matched jobs
  volumeBonus: 0.05,      // 5%  - Bonus for handling more jobs
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

  /**
   * Points deducted when vendor accepts then declines
   */
  declineAfterAcceptPenalty: 15,

  /**
   * Maximum penalty from decline-after-accept incidents
   */
  maxDeclineAfterAcceptPenalty: 30,
};

// ===========================================
// RESPONSE TIME SCORING
// ===========================================

export const RESPONSE_TIME_CONFIG = {
  /**
   * Response time thresholds (in hours) and their scores
   */
  excellentHours: 4,    // <= 4 hours = 100 points
  goodHours: 12,        // <= 12 hours = 75 points
  averageHours: 24,     // <= 24 hours = 50 points
  poorHours: 48,        // <= 48 hours = 25 points
  // > 48 hours = 0 points

  /**
   * Minimum responses needed to calculate response time score
   */
  minResponsesForScore: 3,

  /**
   * Convert average response time to score (0-100)
   */
  hoursToScore: (avgHours: number): number => {
    if (avgHours <= RESPONSE_TIME_CONFIG.excellentHours) return 100;
    if (avgHours <= RESPONSE_TIME_CONFIG.goodHours) return 75;
    if (avgHours <= RESPONSE_TIME_CONFIG.averageHours) return 50;
    if (avgHours <= RESPONSE_TIME_CONFIG.poorHours) return 25;
    return 0;
  },
};

// ===========================================
// VETTING SCORE CONFIGURATION
// ===========================================

export const VETTING_CONFIG = {
  /**
   * Points awarded for having valid license
   */
  licensedPoints: 15,

  /**
   * Points awarded for having insurance
   */
  insuredPoints: 10,

  /**
   * Maximum points for years in business
   */
  yearsInBusinessMax: 10,

  /**
   * Years needed for maximum points (5+ years = full 10 points)
   */
  yearsForMaxPoints: 5,

  /**
   * Admin can adjust vetting score by ±10 points
   */
  adminAdjustmentRange: 10,

  /**
   * Maximum possible vetting score (before admin adjustment)
   */
  maxVettingScore: 35,

  /**
   * Maximum total vetting score (with admin adjustment)
   */
  maxTotalVettingScore: 45,
};

// ===========================================
// AUTO-SUSPEND CONFIGURATION
// ===========================================

export const AUTO_SUSPEND_CONFIG = {
  /**
   * Score threshold below which vendors are auto-suspended
   */
  threshold: 30,

  /**
   * Minimum reviews before auto-suspend can trigger
   * (prevents suspending new vendors with limited data)
   */
  minReviewsBeforeSuspend: 3,
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
