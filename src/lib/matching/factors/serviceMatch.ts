/**
 * Service Match Factor
 *
 * Calculates how well a vendor's services match the requested service.
 */

import type { MatchFactor, ServiceMatchInput } from '../types';
import { SERVICE_MATCH_CONFIG } from '../config';
import { MATCH_SCORING_WEIGHTS } from '../config';
import { SERVICE_TYPE_LABELS } from '@/types/database';

/**
 * Calculate the service match factor score
 */
export function calculateServiceMatch(input: ServiceMatchInput): MatchFactor {
  const { vendorServices, requestedService } = input;
  const weight = MATCH_SCORING_WEIGHTS.serviceMatch;

  // Check for exact match
  const hasExactMatch = vendorServices.includes(requestedService);

  if (hasExactMatch) {
    const serviceName = SERVICE_TYPE_LABELS[requestedService] || requestedService;
    return {
      name: 'Service Match',
      score: SERVICE_MATCH_CONFIG.exactMatchScore,
      weight,
      weighted: SERVICE_MATCH_CONFIG.exactMatchScore * weight,
      reason: `Offers ${serviceName}`,
      icon: 'check',
    };
  }

  // No match
  return {
    name: 'Service Match',
    score: SERVICE_MATCH_CONFIG.noMatchScore,
    weight,
    weighted: SERVICE_MATCH_CONFIG.noMatchScore * weight,
    reason: 'Does not offer this service',
    icon: 'warning',
  };
}
