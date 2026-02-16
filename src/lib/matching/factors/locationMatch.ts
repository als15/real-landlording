/**
 * Location Match Factor
 *
 * Calculates how well a vendor's service areas match the request location.
 */

import type { MatchFactor, LocationMatchInput } from '../types';
import { LOCATION_MATCH_CONFIG, MATCH_SCORING_WEIGHTS } from '../config';

/**
 * Extract just the zip code digits from a location string
 */
function extractZipCode(location: string): string | null {
  // Match 5-digit zip code
  const match = location.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
}

/**
 * Check if a zip code matches a service area entry
 */
function matchesServiceArea(zipCode: string, serviceArea: string): {
  matches: boolean;
  matchType: 'exact' | 'prefix4' | 'prefix3' | 'state' | 'none';
} {
  const normalizedArea = serviceArea.toLowerCase().trim();

  // Exact zip match
  if (normalizedArea === zipCode) {
    return { matches: true, matchType: 'exact' };
  }

  // Prefix format: "prefix:191" or "prefix:1910"
  if (normalizedArea.startsWith('prefix:')) {
    const prefix = normalizedArea.replace('prefix:', '');
    if (zipCode.startsWith(prefix)) {
      return {
        matches: true,
        matchType: prefix.length === 4 ? 'prefix4' : 'prefix3',
      };
    }
  }

  // Raw prefix (just digits, shorter than 5)
  if (/^\d{3,4}$/.test(normalizedArea) && zipCode.startsWith(normalizedArea)) {
    return {
      matches: true,
      matchType: normalizedArea.length === 4 ? 'prefix4' : 'prefix3',
    };
  }

  // State format: "state:PA" or just "PA"
  if (normalizedArea.startsWith('state:')) {
    const state = normalizedArea.replace('state:', '').toUpperCase();
    if (isZipInState(zipCode, state)) {
      return { matches: true, matchType: 'state' };
    }
  }

  // Check if it's a state abbreviation (2 letters)
  if (/^[a-z]{2}$/i.test(normalizedArea)) {
    if (isZipInState(zipCode, normalizedArea.toUpperCase())) {
      return { matches: true, matchType: 'state' };
    }
  }

  return { matches: false, matchType: 'none' };
}

/**
 * Simple zip-to-state mapping for PA/NJ/DE area
 * (Primary service area for Philadelphia landlords)
 */
function isZipInState(zipCode: string, state: string): boolean {
  const prefix = zipCode.substring(0, 3);

  const stateZipPrefixes: Record<string, string[]> = {
    PA: ['150', '151', '152', '153', '154', '155', '156', '157', '158', '159',
         '160', '161', '162', '163', '164', '165', '166', '167', '168', '169',
         '170', '171', '172', '173', '174', '175', '176', '177', '178', '179',
         '180', '181', '182', '183', '184', '185', '186', '187', '188', '189',
         '190', '191', '192', '193', '194', '195', '196'],
    NJ: ['070', '071', '072', '073', '074', '075', '076', '077', '078', '079',
         '080', '081', '082', '083', '084', '085', '086', '087', '088', '089'],
    DE: ['197', '198', '199'],
    MD: ['206', '207', '208', '209', '210', '211', '212', '214', '215', '216',
         '217', '218', '219'],
  };

  const prefixes = stateZipPrefixes[state];
  return prefixes ? prefixes.includes(prefix) : false;
}

/**
 * Calculate the location match factor score
 */
export function calculateLocationMatch(input: LocationMatchInput): MatchFactor {
  const { vendorServiceAreas, requestZipCode, requestLocation } = input;
  const weight = MATCH_SCORING_WEIGHTS.locationMatch;

  // Try to get a zip code
  const zipCode = requestZipCode || extractZipCode(requestLocation);

  if (!zipCode) {
    // Can't determine location - give neutral score
    return {
      name: 'Location',
      score: 50,
      weight,
      weighted: 50 * weight,
      reason: 'Location not specified',
      icon: 'info',
    };
  }

  if (!vendorServiceAreas || vendorServiceAreas.length === 0) {
    // Vendor has no service areas defined - assume they might serve anywhere
    return {
      name: 'Location',
      score: 40,
      weight,
      weighted: 40 * weight,
      reason: 'Service areas not specified',
      icon: 'info',
    };
  }

  // Find the best match type
  let bestMatchType: 'exact' | 'prefix4' | 'prefix3' | 'state' | 'none' = 'none';

  for (const area of vendorServiceAreas) {
    const { matches, matchType } = matchesServiceArea(zipCode, area);
    if (matches) {
      // Priority: exact > prefix4 > prefix3 > state
      if (matchType === 'exact') {
        bestMatchType = 'exact';
        break; // Best possible match, stop searching
      }
      if (matchType === 'prefix4' && (bestMatchType === 'none' || bestMatchType === 'state' || bestMatchType === 'prefix3')) {
        bestMatchType = 'prefix4';
      } else if (matchType === 'prefix3' && (bestMatchType === 'none' || bestMatchType === 'state')) {
        bestMatchType = 'prefix3';
      } else if (matchType === 'state' && bestMatchType === 'none') {
        bestMatchType = 'state';
      }
    }
  }

  // Score based on match type
  switch (bestMatchType) {
    case 'exact':
      return {
        name: 'Location',
        score: LOCATION_MATCH_CONFIG.exactZipScore,
        weight,
        weighted: LOCATION_MATCH_CONFIG.exactZipScore * weight,
        reason: `Serves zip ${zipCode}`,
        icon: 'check',
      };

    case 'prefix4':
      return {
        name: 'Location',
        score: LOCATION_MATCH_CONFIG.prefix4Score,
        weight,
        weighted: LOCATION_MATCH_CONFIG.prefix4Score * weight,
        reason: `Serves ${zipCode.substring(0, 4)}x area`,
        icon: 'check',
      };

    case 'prefix3':
      return {
        name: 'Location',
        score: LOCATION_MATCH_CONFIG.prefix3Score,
        weight,
        weighted: LOCATION_MATCH_CONFIG.prefix3Score * weight,
        reason: `Serves ${zipCode.substring(0, 3)}xx area`,
        icon: 'check',
      };

    case 'state':
      return {
        name: 'Location',
        score: LOCATION_MATCH_CONFIG.stateMatchScore,
        weight,
        weighted: LOCATION_MATCH_CONFIG.stateMatchScore * weight,
        reason: `Serves statewide (covers ${zipCode})`,
        icon: 'check',
      };

    default:
      return {
        name: 'Location',
        score: LOCATION_MATCH_CONFIG.noMatchScore,
        weight,
        weighted: LOCATION_MATCH_CONFIG.noMatchScore * weight,
        reason: `Does not serve ${zipCode}`,
        icon: 'warning',
      };
  }
}
