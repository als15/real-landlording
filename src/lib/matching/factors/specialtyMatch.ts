/**
 * Specialty Match Factor
 *
 * Calculates how well vendor specialties match request requirements.
 */

import type { MatchFactor, SpecialtyMatchInput } from '../types';
import { SPECIALTY_MATCH_CONFIG, MATCH_SCORING_WEIGHTS } from '../config';
import type { ServiceCategory } from '@/types/database';

/**
 * Extract requested specialties from service details
 */
function extractRequestedSpecialties(
  serviceDetails: Record<string, string> | null
): string[] {
  if (!serviceDetails) return [];

  const specialties: string[] = [];

  // Common fields that indicate specialties
  const specialtyFields = [
    'Equipment Type',
    'Appliance Type',
    'Roof Type',
    'Service Needed',
    'Pest Type',
    'Issue Type',
  ];

  for (const field of specialtyFields) {
    const value = serviceDetails[field];
    if (value && value !== 'Other') {
      specialties.push(value.toLowerCase());
    }
  }

  return specialties;
}

/**
 * Check if vendor has the required specialty
 */
function vendorHasSpecialty(
  vendorSpecialties: Record<ServiceCategory, string[]> | null,
  serviceType: ServiceCategory,
  requestedSpecialties: string[]
): { hasMatch: boolean; matchedSpecialty?: string } {
  if (!vendorSpecialties) {
    return { hasMatch: false };
  }

  const vendorServiceSpecialties = vendorSpecialties[serviceType];
  if (!vendorServiceSpecialties || vendorServiceSpecialties.length === 0) {
    return { hasMatch: false };
  }

  // Normalize vendor specialties for comparison
  const normalizedVendorSpecialties = vendorServiceSpecialties.map(s => s.toLowerCase());

  // Check if any requested specialty matches
  for (const requested of requestedSpecialties) {
    for (const vendorSpec of normalizedVendorSpecialties) {
      // Fuzzy match - check if one contains the other
      if (
        vendorSpec.includes(requested) ||
        requested.includes(vendorSpec) ||
        vendorSpec === requested
      ) {
        return { hasMatch: true, matchedSpecialty: vendorSpec };
      }
    }
  }

  return { hasMatch: false };
}

/**
 * Calculate the specialty match factor score
 */
export function calculateSpecialtyMatch(input: SpecialtyMatchInput): MatchFactor {
  const { vendorSpecialties, requestedService, requestServiceDetails } = input;
  const weight = MATCH_SCORING_WEIGHTS.specialtyMatch;

  // Extract what specialties are requested
  const requestedSpecialties = extractRequestedSpecialties(requestServiceDetails);

  // If no specialties requested, neutral score
  if (requestedSpecialties.length === 0) {
    return {
      name: 'Specialty',
      score: SPECIALTY_MATCH_CONFIG.noSpecialtyRequiredScore,
      weight,
      weighted: SPECIALTY_MATCH_CONFIG.noSpecialtyRequiredScore * weight,
      reason: 'No specific specialty required',
      icon: 'info',
    };
  }

  // Check if vendor has the specialty
  const { hasMatch, matchedSpecialty } = vendorHasSpecialty(
    vendorSpecialties,
    requestedService,
    requestedSpecialties
  );

  if (hasMatch) {
    return {
      name: 'Specialty',
      score: SPECIALTY_MATCH_CONFIG.hasSpecialtyScore,
      weight,
      weighted: SPECIALTY_MATCH_CONFIG.hasSpecialtyScore * weight,
      reason: matchedSpecialty
        ? `Has ${matchedSpecialty} expertise`
        : 'Has required specialty',
      icon: 'check',
    };
  }

  // Vendor doesn't have the specialty
  return {
    name: 'Specialty',
    score: SPECIALTY_MATCH_CONFIG.missingSpecialtyScore,
    weight,
    weighted: SPECIALTY_MATCH_CONFIG.missingSpecialtyScore * weight,
    reason: `May not specialize in ${requestedSpecialties[0]}`,
    icon: 'info',
  };
}
