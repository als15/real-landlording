/**
 * Performance Score Factor
 *
 * Uses the vendor's overall performance score as a matching factor.
 */

import type { MatchFactor } from '../types';
import { MATCH_SCORING_WEIGHTS } from '../config';
import { getScoreTier, SCORE_TIERS } from '@/lib/scoring/config';

interface PerformanceInput {
  performanceScore: number;
  totalReviews: number;
}

/**
 * Calculate the performance score factor
 */
export function calculatePerformanceScore(input: PerformanceInput): MatchFactor {
  const { performanceScore, totalReviews } = input;
  const weight = MATCH_SCORING_WEIGHTS.performanceScore;

  // Use the vendor's performance score directly (already 0-100)
  const score = Math.max(0, Math.min(100, performanceScore));
  const hasReviews = totalReviews > 0;

  // Get tier for display
  const tier = getScoreTier(score, hasReviews);
  const tierConfig = SCORE_TIERS[tier];

  let reason: string;
  let icon: MatchFactor['icon'];

  if (!hasReviews) {
    reason = 'New vendor (no reviews yet)';
    icon = 'info';
  } else if (tier === 'excellent' || tier === 'good') {
    reason = `${tierConfig.label} rating (${score.toFixed(0)}/100)`;
    icon = 'star';
  } else if (tier === 'average') {
    reason = `${tierConfig.label} rating (${score.toFixed(0)}/100)`;
    icon = 'info';
  } else {
    reason = `${tierConfig.label} rating (${score.toFixed(0)}/100)`;
    icon = 'warning';
  }

  return {
    name: 'Performance',
    score,
    weight,
    weighted: score * weight,
    reason,
    icon,
  };
}
