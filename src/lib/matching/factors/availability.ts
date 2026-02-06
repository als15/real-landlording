/**
 * Availability/Urgency Match Factor
 *
 * Calculates how well vendor availability matches request urgency.
 */

import type { MatchFactor, AvailabilityMatchInput, MatchWarning } from '../types';
import { AVAILABILITY_MATCH_CONFIG, MATCH_SCORING_WEIGHTS } from '../config';

interface AvailabilityResult {
  factor: MatchFactor;
  warning?: MatchWarning;
}

/**
 * Calculate the availability match factor score
 */
export function calculateAvailability(input: AvailabilityMatchInput): AvailabilityResult {
  const { vendorEmergencyServices, vendorServiceHours, requestUrgency, isWeekend } = input;
  const weight = MATCH_SCORING_WEIGHTS.availability;

  const isEmergency = requestUrgency === 'emergency';
  let score = AVAILABILITY_MATCH_CONFIG.standardScore;
  let reason: string;
  let icon: MatchFactor['icon'] = 'info';
  let warning: MatchWarning | undefined;

  if (isEmergency) {
    if (vendorEmergencyServices) {
      score = AVAILABILITY_MATCH_CONFIG.emergencyMatchScore;
      reason = 'Emergency services available';
      icon = 'check';
    } else {
      score = AVAILABILITY_MATCH_CONFIG.emergencyNoMatchScore;
      reason = 'No emergency services';
      icon = 'warning';
      warning = {
        severity: 'high',
        message: 'Vendor does not offer emergency services',
        factor: 'Availability',
      };
    }
  } else {
    // Non-emergency - base score
    reason = 'Standard availability';

    // Apply bonuses
    if (vendorServiceHours.is24_7) {
      score += AVAILABILITY_MATCH_CONFIG.fullAvailabilityBonus;
      reason = '24/7 availability';
      icon = 'star';
    } else if (isWeekend && vendorServiceHours.weekends) {
      score += AVAILABILITY_MATCH_CONFIG.weekendBonus;
      reason = 'Weekend availability';
      icon = 'check';
    } else if (vendorServiceHours.weekdays) {
      reason = 'Weekday availability';
      icon = 'check';
    }
  }

  // Cap at 100
  score = Math.min(100, score);

  return {
    factor: {
      name: 'Availability',
      score,
      weight,
      weighted: score * weight,
      reason,
      icon,
    },
    warning,
  };
}
