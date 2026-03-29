/**
 * Serper.dev API Client
 *
 * Low-level client for Google Search via Serper.dev.
 * Follows the same pattern as src/lib/mailchimp/client.ts — thin fetch wrapper.
 */

const SERPER_API_URL = 'https://google.serper.dev/search';

// ============================================================================
// Types
// ============================================================================

export interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position?: number;
}

export interface SerperPlaceResult {
  title: string;
  address: string;
  rating?: number;
  ratingCount?: number;
  category?: string;
  phoneNumber?: string;
  website?: string;
  cid?: string;
}

export interface SerperKnowledgeGraph {
  title?: string;
  type?: string;
  website?: string;
  description?: string;
  rating?: number;
  ratingCount?: number;
  attributes?: Record<string, string>;
}

export interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  places?: SerperPlaceResult[];
  knowledgeGraph?: SerperKnowledgeGraph;
  searchParameters?: { q: string };
}

export interface SerperSearchParams {
  q: string;
  type?: 'search' | 'places';
  location?: string;
  gl?: string;
  num?: number;
}

// ============================================================================
// Client
// ============================================================================

/**
 * Check if Serper.dev is configured
 */
export function isSerperConfigured(): boolean {
  return !!process.env.SERPER_API_KEY;
}

/**
 * Make a search request to the Serper.dev API
 */
export async function serperFetch(params: SerperSearchParams): Promise<SerperSearchResponse> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    throw new Error('SERPER_API_KEY is not configured');
  }

  const url = params.type === 'places'
    ? 'https://google.serper.dev/places'
    : SERPER_API_URL;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: params.q,
      location: params.location,
      gl: params.gl || 'us',
      num: params.num || 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Serper API error ${response.status}: ${errorText}`);
  }

  return response.json();
}
