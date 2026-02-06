/**
 * Smart Matching System
 *
 * Export all matching-related functionality.
 */

// Types
export type {
  MatchFactor,
  MatchWarning,
  MatchConfidence,
  MatchScoreResult,
  VendorWithMatchScore,
  MatchScoringWeights,
  MatchScoringThresholds,
  MatchingContext,
  VendorMatchData,
  SuggestionsResponse,
} from './types';

// Configuration
export {
  MATCH_SCORING_WEIGHTS,
  MATCH_SCORING_THRESHOLDS,
  SCORING_VERSION,
} from './config';

// Main calculation functions
export {
  calculateMatchScore,
  calculateMatchScores,
  createMatchingContext,
  enrichVendorWithMatchData,
  getScoringMeta,
} from './calculateMatchScore';

// Individual factors (for testing/debugging)
export {
  calculateServiceMatch,
  calculateLocationMatch,
  calculatePerformanceScore,
  calculateResponseTime,
  calculateAvailability,
  calculateSpecialtyMatch,
  calculateCapacity,
  calculatePriceFit,
} from './factors';
