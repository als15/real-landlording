/**
 * Response Time Factor
 *
 * Calculates score based on vendor's historical response time.
 */

import type { MatchFactor } from '../types';
import { RESPONSE_TIME_MATCH_CONFIG, MATCH_SCORING_WEIGHTS } from '../config';

interface ResponseTimeInput {
  avgResponseTimeHours: number | null;
}

/**
 * Calculate the response time factor score
 */
export function calculateResponseTime(input: ResponseTimeInput): MatchFactor {
  const { avgResponseTimeHours } = input;
  const weight = MATCH_SCORING_WEIGHTS.responseTime;

  // No data available
  if (avgResponseTimeHours === null) {
    return {
      name: 'Response Time',
      score: RESPONSE_TIME_MATCH_CONFIG.noDataScore,
      weight,
      weighted: RESPONSE_TIME_MATCH_CONFIG.noDataScore * weight,
      reason: 'No response data yet',
      icon: 'info',
    };
  }

  // Calculate score based on thresholds
  let score: number;
  let reason: string;
  let icon: MatchFactor['icon'];

  if (avgResponseTimeHours <= RESPONSE_TIME_MATCH_CONFIG.excellentThresholdHours) {
    score = RESPONSE_TIME_MATCH_CONFIG.excellentScore;
    reason = `Fast responder (<${RESPONSE_TIME_MATCH_CONFIG.excellentThresholdHours}h avg)`;
    icon = 'star';
  } else if (avgResponseTimeHours <= RESPONSE_TIME_MATCH_CONFIG.goodThresholdHours) {
    score = RESPONSE_TIME_MATCH_CONFIG.goodScore;
    reason = `Good response time (~${Math.round(avgResponseTimeHours)}h avg)`;
    icon = 'check';
  } else if (avgResponseTimeHours <= RESPONSE_TIME_MATCH_CONFIG.averageThresholdHours) {
    score = RESPONSE_TIME_MATCH_CONFIG.averageScore;
    reason = `Average response time (~${Math.round(avgResponseTimeHours)}h avg)`;
    icon = 'info';
  } else if (avgResponseTimeHours <= RESPONSE_TIME_MATCH_CONFIG.poorThresholdHours) {
    score = RESPONSE_TIME_MATCH_CONFIG.poorScore;
    reason = `Slow response time (~${Math.round(avgResponseTimeHours)}h avg)`;
    icon = 'warning';
  } else {
    score = 0;
    reason = `Very slow response time (>48h avg)`;
    icon = 'warning';
  }

  return {
    name: 'Response Time',
    score,
    weight,
    weighted: score * weight,
    reason,
    icon,
  };
}
