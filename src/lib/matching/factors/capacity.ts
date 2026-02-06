/**
 * Capacity Factor
 *
 * Calculates vendor availability based on current workload.
 */

import type { MatchFactor, CapacityInput } from '../types';
import { CAPACITY_CONFIG, MATCH_SCORING_WEIGHTS } from '../config';

/**
 * Calculate the capacity factor score
 */
export function calculateCapacity(input: CapacityInput): MatchFactor {
  const { pendingJobsCount } = input;
  const weight = MATCH_SCORING_WEIGHTS.capacity;

  // If we don't have data, use neutral score
  if (pendingJobsCount === undefined || pendingJobsCount === null) {
    return {
      name: 'Capacity',
      score: CAPACITY_CONFIG.noDataScore,
      weight,
      weighted: CAPACITY_CONFIG.noDataScore * weight,
      reason: 'Availability unknown',
      icon: 'info',
    };
  }

  // Find the appropriate tier
  let score = CAPACITY_CONFIG.noDataScore;
  let reason = 'Unknown capacity';
  let icon: MatchFactor['icon'] = 'info';

  for (const tier of CAPACITY_CONFIG.tiers) {
    if (pendingJobsCount <= tier.maxJobs) {
      score = tier.score;

      if (tier.maxJobs <= 2) {
        reason = pendingJobsCount === 0
          ? 'Fully available'
          : `${pendingJobsCount} pending job${pendingJobsCount > 1 ? 's' : ''}`;
        icon = 'check';
      } else if (tier.maxJobs <= 4) {
        reason = `${pendingJobsCount} pending jobs`;
        icon = 'check';
      } else if (tier.maxJobs <= 6) {
        reason = `${pendingJobsCount} pending jobs (limited)`;
        icon = 'info';
      } else {
        reason = `${pendingJobsCount}+ pending jobs (busy)`;
        icon = 'warning';
      }

      break;
    }
  }

  return {
    name: 'Capacity',
    score,
    weight,
    weighted: score * weight,
    reason,
    icon,
  };
}
