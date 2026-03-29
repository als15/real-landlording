/**
 * Serper Vendor Search
 *
 * Runs 8 targeted searches in parallel to gather vendor reputation data.
 * Results are fed to OpenAI for analysis instead of using web_search_preview.
 */

import { serperFetch, SerperSearchResponse } from './client';

// ============================================================================
// Types
// ============================================================================

export interface SearchResult {
  query: string;
  label: string;
  response: SerperSearchResponse | null;
  error: string | null;
}

export interface VendorSearchData {
  businessName: string;
  location: string;
  searches: SearchResult[];
  googlePlaces: {
    rating: number | null;
    ratingCount: number | null;
    address: string | null;
  } | null;
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
}

// ============================================================================
// Search Orchestrator
// ============================================================================

/**
 * Run 8 parallel searches to gather vendor data from multiple sources.
 * Uses Promise.allSettled so individual failures don't block others.
 */
export async function gatherVendorSearchData(params: {
  businessName: string;
  location: string;
}): Promise<VendorSearchData> {
  const { businessName, location } = params;
  const quotedName = `"${businessName}"`;

  const searchDefinitions: Array<{ label: string; query: string; type?: 'search' | 'places' }> = [
    {
      label: 'google_places',
      query: `${businessName} ${location}`,
      type: 'places',
    },
    {
      label: 'yelp',
      query: `${quotedName} site:yelp.com`,
    },
    {
      label: 'bbb',
      query: `${quotedName} site:bbb.org`,
    },
    {
      label: 'facebook',
      query: `${quotedName} site:facebook.com`,
    },
    {
      label: 'angi_homeadvisor',
      query: `${quotedName} site:angi.com OR site:homeadvisor.com`,
    },
    {
      label: 'general_reviews',
      query: `${quotedName} ${location} reviews`,
    },
    {
      label: 'legal_complaints',
      query: `${quotedName} complaints OR lawsuit`,
    },
    {
      label: 'community',
      query: `${quotedName} site:reddit.com OR site:nextdoor.com`,
    },
  ];

  const promises = searchDefinitions.map(async (def) => {
    const response = await serperFetch({
      q: def.query,
      type: def.type || 'search',
      location: def.type === 'places' ? params.location : undefined,
      num: 10,
    });
    return { label: def.label, query: def.query, response };
  });

  const settled = await Promise.allSettled(promises);

  const searches: SearchResult[] = settled.map((result, index) => {
    if (result.status === 'fulfilled') {
      return {
        query: searchDefinitions[index].query,
        label: result.value.label,
        response: result.value.response,
        error: null,
      };
    }
    return {
      query: searchDefinitions[index].query,
      label: searchDefinitions[index].label,
      response: null,
      error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
    };
  });

  // Extract Google Places data from the places search
  let googlePlaces: VendorSearchData['googlePlaces'] = null;
  const placesSearch = searches.find((s) => s.label === 'google_places');
  if (placesSearch?.response?.places?.[0]) {
    const place = placesSearch.response.places[0];
    googlePlaces = {
      rating: place.rating ?? null,
      ratingCount: place.ratingCount ?? null,
      address: place.address ?? null,
    };
  }

  const successfulSearches = searches.filter((s) => s.response !== null).length;

  return {
    businessName,
    location,
    searches,
    googlePlaces,
    totalSearches: searches.length,
    successfulSearches,
    failedSearches: searches.length - successfulSearches,
  };
}
