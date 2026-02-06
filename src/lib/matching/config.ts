/**
 * Smart Matching Configuration
 *
 * Weights, thresholds, and scoring parameters for vendor-request matching.
 */

import type { MatchScoringWeights, MatchScoringThresholds } from './types';

// ===========================================
// SCORING WEIGHTS
// ===========================================

/**
 * How much each factor contributes to the match score.
 * Weights must sum to 1.0
 */
export const MATCH_SCORING_WEIGHTS: MatchScoringWeights = {
  serviceMatch: 0.25,      // 25% - Does vendor offer the service?
  locationMatch: 0.20,     // 20% - Is vendor in the right area?
  performanceScore: 0.15,  // 15% - Vendor's overall quality rating
  responseTime: 0.10,      // 10% - How fast does vendor respond?
  availability: 0.10,      // 10% - Can vendor handle urgency level?
  specialtyMatch: 0.10,    // 10% - Does vendor have required specialties?
  capacity: 0.05,          // 5%  - Is vendor available (not overloaded)?
  priceFit: 0.05,          // 5%  - Does vendor's pricing match budget?
};

// Validate weights sum to 1.0
const totalWeight = Object.values(MATCH_SCORING_WEIGHTS).reduce((a, b) => a + b, 0);
if (Math.abs(totalWeight - 1.0) > 0.001) {
  console.warn(`Match scoring weights sum to ${totalWeight}, expected 1.0`);
}

// ===========================================
// SCORING THRESHOLDS
// ===========================================

export const MATCH_SCORING_THRESHOLDS: MatchScoringThresholds = {
  /** Minimum score to be marked as "recommended" */
  recommendedThreshold: 65,

  /** Score >= this is "high" confidence */
  highConfidenceThreshold: 75,

  /** Score >= this (but < high) is "medium" confidence */
  mediumConfidenceThreshold: 50,

  /** Maximum vendors to mark as recommended */
  maxRecommendations: 3,
};

// ===========================================
// SERVICE MATCH CONFIG
// ===========================================

export const SERVICE_MATCH_CONFIG = {
  /** Score for exact service match */
  exactMatchScore: 100,

  /** Score for related/parent category match (future use) */
  relatedMatchScore: 50,

  /** Score for no match */
  noMatchScore: 0,
};

// ===========================================
// LOCATION MATCH CONFIG
// ===========================================

export const LOCATION_MATCH_CONFIG = {
  /** Exact zip code in service_areas */
  exactZipScore: 100,

  /** 4-digit prefix match (e.g., 1910x) */
  prefix4Score: 85,

  /** 3-digit prefix match (e.g., 191xx) */
  prefix3Score: 70,

  /** State-level match (e.g., PA, NJ) */
  stateMatchScore: 40,

  /** No location match at all */
  noMatchScore: 0,
};

// ===========================================
// RESPONSE TIME CONFIG
// ===========================================

export const RESPONSE_TIME_MATCH_CONFIG = {
  /** Score for avg response <= 4 hours */
  excellentScore: 100,
  excellentThresholdHours: 4,

  /** Score for avg response <= 12 hours */
  goodScore: 75,
  goodThresholdHours: 12,

  /** Score for avg response <= 24 hours */
  averageScore: 50,
  averageThresholdHours: 24,

  /** Score for avg response <= 48 hours */
  poorScore: 25,
  poorThresholdHours: 48,

  /** Score for no data (neutral) */
  noDataScore: 50,
};

// ===========================================
// AVAILABILITY/URGENCY CONFIG
// ===========================================

export const AVAILABILITY_MATCH_CONFIG = {
  /** Emergency request + vendor offers emergency services */
  emergencyMatchScore: 100,

  /** Emergency request but vendor doesn't offer emergency services */
  emergencyNoMatchScore: 20,

  /** Non-emergency request (neutral) */
  standardScore: 60,

  /** Bonus for 24/7 availability */
  fullAvailabilityBonus: 20,

  /** Bonus for weekend availability when needed */
  weekendBonus: 15,
};

// ===========================================
// SPECIALTY MATCH CONFIG
// ===========================================

export const SPECIALTY_MATCH_CONFIG = {
  /** Vendor has the required specialty/equipment */
  hasSpecialtyScore: 100,

  /** No specialty required for this request (neutral) */
  noSpecialtyRequiredScore: 60,

  /** Specialty required but vendor doesn't have it */
  missingSpecialtyScore: 30,
};

// ===========================================
// CAPACITY CONFIG
// ===========================================

export const CAPACITY_CONFIG = {
  /** Score tiers based on pending jobs */
  tiers: [
    { maxJobs: 2, score: 100 },   // 0-2 pending jobs: full capacity
    { maxJobs: 4, score: 70 },    // 3-4 pending jobs: good capacity
    { maxJobs: 6, score: 40 },    // 5-6 pending jobs: limited capacity
    { maxJobs: Infinity, score: 20 }, // 7+ pending jobs: overloaded
  ],

  /** Score when we don't have capacity data (neutral) */
  noDataScore: 60,
};

// ===========================================
// PRICE FIT CONFIG
// ===========================================

/**
 * Budget range mapping to numeric values for comparison
 */
export const BUDGET_RANGE_VALUES: Record<string, { min: number; max: number }> = {
  under_500: { min: 0, max: 500 },
  '500_1000': { min: 500, max: 1000 },
  '1000_2500': { min: 1000, max: 2500 },
  '2500_5000': { min: 2500, max: 5000 },
  '5000_10000': { min: 5000, max: 10000 },
  '10000_25000': { min: 10000, max: 25000 },
  '25000_50000': { min: 25000, max: 50000 },
  '50000_100000': { min: 50000, max: 100000 },
  over_100000: { min: 100000, max: Infinity },
  not_sure: { min: 0, max: Infinity },
};

/**
 * Vendor job size range mapping
 */
export const JOB_SIZE_VALUES: Record<string, { min: number; max: number }> = {
  under_500: { min: 0, max: 500 },
  '500_1k': { min: 500, max: 1000 },
  '1k_5k': { min: 1000, max: 5000 },
  '5k_10k': { min: 5000, max: 10000 },
  '10k_25k': { min: 10000, max: 25000 },
  '25k_plus': { min: 25000, max: Infinity },
};

export const PRICE_FIT_CONFIG = {
  /** Budget overlaps with vendor's job size range */
  goodFitScore: 100,

  /** Budget partially overlaps */
  partialFitScore: 60,

  /** No budget data provided (neutral) */
  noDataScore: 60,

  /** Budget doesn't match vendor's typical range */
  poorFitScore: 30,
};

// ===========================================
// SCORING VERSION
// ===========================================

/**
 * Version string for the scoring algorithm.
 * Increment when making changes that affect scores.
 */
export const SCORING_VERSION = '1.0.0';
