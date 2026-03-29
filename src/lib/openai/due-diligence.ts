/**
 * Vendor Due Diligence Analysis
 *
 * Hybrid approach:
 * - Primary: Serper.dev (8 parallel searches) → OpenAI text analysis (no web_search_preview)
 * - Fallback: OpenAI web_search_preview (if SERPER_API_KEY is not configured)
 *
 * Both paths return the same DueDiligenceResults type — no frontend changes needed.
 */

import { openaiResponsesCreate } from './client';
import { isSerperConfigured, gatherVendorSearchData } from '@/lib/serper';
import type { VendorSearchData, SearchResult } from '@/lib/serper';
import { Vendor } from '@/types/database';

// ============================================================================
// Types
// ============================================================================

export interface ReviewRating {
  rating: number | null;
  review_count: number | null;
  url: string | null;
  summary: string | null;
}

export interface BbbRating {
  rating: string | null;
  accredited: boolean | null;
  url: string | null;
  summary: string | null;
}

export interface OtherReview {
  platform: string;
  rating: number | null;
  url: string | null;
  summary: string | null;
}

export interface OnlinePresenceEntry {
  exists: boolean | null;
  url: string | null;
  followers: number | null;
  notes: string | null;
}

export interface DueDiligenceResults {
  summary: string;
  confidence_level: 'high' | 'medium' | 'low';
  risk_flags: string[];
  positive_signals: string[];
  reviews_ratings: {
    google: ReviewRating | null;
    yelp: ReviewRating | null;
    facebook: ReviewRating | null;
    angi: ReviewRating | null;
    bbb: BbbRating | null;
    other: OtherReview[];
  };
  online_presence: {
    website: OnlinePresenceEntry | null;
    facebook: OnlinePresenceEntry | null;
    instagram: OnlinePresenceEntry | null;
    linkedin: OnlinePresenceEntry | null;
    portfolio: OnlinePresenceEntry | null;
  };
  community_signals: {
    reddit_mentions: string | null;
    facebook_group_mentions: string | null;
    local_forum_mentions: string | null;
    overall_sentiment: string | null;
  };
  business_legal: {
    bbb_complaints: string | null;
    lawsuits_liens: string | null;
    code_violations: string | null;
    licensing_status: string | null;
    years_in_business_estimate: string | null;
  };
  sources: Array<{ title: string; url: string }>;
}

export interface DueDiligenceAnalysisResult {
  success: boolean;
  results?: DueDiligenceResults;
  rawResponse?: string;
  model?: string;
  tokensUsed?: number;
  searchQueriesUsed?: number;
  error?: string;
}

// ============================================================================
// JSON Schema for OpenAI Structured Output
// ============================================================================

const DUE_DILIGENCE_JSON_SCHEMA = {
  type: 'json_schema' as const,
  name: 'due_diligence_report',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: '2-3 sentence overall assessment of the vendor' },
      confidence_level: { type: 'string', enum: ['high', 'medium', 'low'] },
      risk_flags: { type: 'array', items: { type: 'string' } },
      positive_signals: { type: 'array', items: { type: 'string' } },
      reviews_ratings: {
        type: 'object',
        properties: {
          google: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  rating: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  review_count: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['rating', 'review_count', 'url', 'summary'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          yelp: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  rating: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  review_count: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['rating', 'review_count', 'url', 'summary'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          facebook: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  rating: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  review_count: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['rating', 'review_count', 'url', 'summary'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          angi: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  rating: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                  review_count: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['rating', 'review_count', 'url', 'summary'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          bbb: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  rating: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  accredited: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['rating', 'accredited', 'url', 'summary'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          other: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                platform: { type: 'string' },
                rating: { anyOf: [{ type: 'number' }, { type: 'null' }] },
                url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                summary: { anyOf: [{ type: 'string' }, { type: 'null' }] },
              },
              required: ['platform', 'rating', 'url', 'summary'],
              additionalProperties: false,
            },
          },
        },
        required: ['google', 'yelp', 'facebook', 'angi', 'bbb', 'other'],
        additionalProperties: false,
      },
      online_presence: {
        type: 'object',
        properties: {
          website: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  exists: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  followers: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['exists', 'url', 'followers', 'notes'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          facebook: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  exists: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  followers: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['exists', 'url', 'followers', 'notes'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          instagram: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  exists: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  followers: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['exists', 'url', 'followers', 'notes'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          linkedin: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  exists: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  followers: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['exists', 'url', 'followers', 'notes'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
          portfolio: {
            anyOf: [
              {
                type: 'object',
                properties: {
                  exists: { anyOf: [{ type: 'boolean' }, { type: 'null' }] },
                  url: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                  followers: { anyOf: [{ type: 'integer' }, { type: 'null' }] },
                  notes: { anyOf: [{ type: 'string' }, { type: 'null' }] },
                },
                required: ['exists', 'url', 'followers', 'notes'],
                additionalProperties: false,
              },
              { type: 'null' },
            ],
          },
        },
        required: ['website', 'facebook', 'instagram', 'linkedin', 'portfolio'],
        additionalProperties: false,
      },
      community_signals: {
        type: 'object',
        properties: {
          reddit_mentions: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          facebook_group_mentions: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          local_forum_mentions: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          overall_sentiment: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['reddit_mentions', 'facebook_group_mentions', 'local_forum_mentions', 'overall_sentiment'],
        additionalProperties: false,
      },
      business_legal: {
        type: 'object',
        properties: {
          bbb_complaints: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          lawsuits_liens: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          code_violations: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          licensing_status: { anyOf: [{ type: 'string' }, { type: 'null' }] },
          years_in_business_estimate: { anyOf: [{ type: 'string' }, { type: 'null' }] },
        },
        required: ['bbb_complaints', 'lawsuits_liens', 'code_violations', 'licensing_status', 'years_in_business_estimate'],
        additionalProperties: false,
      },
      sources: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            url: { type: 'string' },
          },
          required: ['title', 'url'],
          additionalProperties: false,
        },
      },
    },
    required: [
      'summary', 'confidence_level', 'risk_flags', 'positive_signals',
      'reviews_ratings', 'online_presence', 'community_signals',
      'business_legal', 'sources',
    ],
    additionalProperties: false,
  },
};

// ============================================================================
// Shared: Vendor Info Block
// ============================================================================

function vendorInfoBlock(vendor: Vendor): string {
  const services = (vendor.services || []).join(', ');
  const serviceAreas = (vendor.service_areas || []).join(', ');
  const location = vendor.location || 'Philadelphia, PA area';

  return `VENDOR TO RESEARCH:
- Business Name: ${vendor.business_name}
- Contact Name: ${vendor.contact_name}
- Email: ${vendor.email}
- Phone: ${vendor.phone || 'Not provided'}
- Website: ${vendor.website || 'Not provided'}
- Location: ${location}
- Services: ${services || 'Not specified'}
- Service Areas: ${serviceAreas || 'Not specified'}
- Instagram: ${vendor.social_instagram || 'Not provided'}
- Facebook: ${vendor.social_facebook || 'Not provided'}
- LinkedIn: ${vendor.social_linkedin || 'Not provided'}`;
}

// ============================================================================
// Shared: OpenAI Response Parser
// ============================================================================

function parseOpenAIResponse(data: Record<string, unknown>): {
  results: DueDiligenceResults | null;
  rawResponse: string;
  tokensUsed: number | undefined;
  searchQueriesUsed: number;
  error: string | null;
} {
  const rawResponse = JSON.stringify(data);

  const output = data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }> | undefined;
  const outputItem = output?.find((item) => item.type === 'message');
  const textContent = outputItem?.content?.find((c) => c.type === 'output_text');

  if (!textContent?.text) {
    return {
      results: null,
      rawResponse,
      tokensUsed: undefined,
      searchQueriesUsed: 0,
      error: 'No text output in OpenAI response',
    };
  }

  const searchQueriesUsed = output?.filter((item) => item.type === 'web_search_call').length || 0;
  const usage = data.usage as { total_tokens?: number } | undefined;

  return {
    results: JSON.parse(textContent.text),
    rawResponse,
    tokensUsed: usage?.total_tokens ?? undefined,
    searchQueriesUsed,
    error: null,
  };
}

// ============================================================================
// Path A: Serper-Enhanced Analysis (Primary)
// ============================================================================

/**
 * Format raw Serper search data into readable text for OpenAI analysis.
 */
function formatSearchDataForPrompt(searchData: VendorSearchData): string {
  const sections: string[] = [];

  // Google Places data
  if (searchData.googlePlaces) {
    const gp = searchData.googlePlaces;
    sections.push(`== GOOGLE BUSINESS PROFILE ==
Rating: ${gp.rating ?? 'Not found'}
Review Count: ${gp.ratingCount ?? 'Not found'}
Address: ${gp.address ?? 'Not found'}`);
  }

  // Format each search result
  for (const search of searchData.searches) {
    if (search.label === 'google_places') continue; // Already handled above
    sections.push(formatSearchResult(search));
  }

  // Summary stats
  sections.push(`\n== SEARCH METADATA ==
Total searches: ${searchData.totalSearches}
Successful: ${searchData.successfulSearches}
Failed: ${searchData.failedSearches}`);

  return sections.join('\n\n');
}

function formatSearchResult(search: SearchResult): string {
  const labelMap: Record<string, string> = {
    yelp: 'YELP SEARCH',
    bbb: 'BBB (BETTER BUSINESS BUREAU) SEARCH',
    facebook: 'FACEBOOK SEARCH',
    angi_homeadvisor: 'ANGI / HOMEADVISOR SEARCH',
    general_reviews: 'GENERAL REVIEWS SEARCH',
    legal_complaints: 'LEGAL / COMPLAINTS SEARCH',
    community: 'COMMUNITY (REDDIT / NEXTDOOR) SEARCH',
  };

  const header = `== ${labelMap[search.label] || search.label.toUpperCase()} ==`;

  if (search.error) {
    return `${header}\nSearch failed: ${search.error}`;
  }

  if (!search.response) {
    return `${header}\nNo results`;
  }

  const lines: string[] = [header];
  lines.push(`Query: ${search.query}`);

  // Knowledge graph
  if (search.response.knowledgeGraph) {
    const kg = search.response.knowledgeGraph;
    lines.push(`Knowledge Graph: ${kg.title || 'N/A'} — ${kg.description || 'No description'}`);
    if (kg.rating) lines.push(`  Rating: ${kg.rating}${kg.ratingCount ? ` (${kg.ratingCount} reviews)` : ''}`);
    if (kg.website) lines.push(`  Website: ${kg.website}`);
    if (kg.attributes) {
      for (const [key, value] of Object.entries(kg.attributes)) {
        lines.push(`  ${key}: ${value}`);
      }
    }
  }

  // Organic results
  if (search.response.organic?.length) {
    lines.push(`Top results (${search.response.organic.length}):`);
    for (const result of search.response.organic.slice(0, 5)) {
      lines.push(`  - ${result.title}`);
      lines.push(`    URL: ${result.link}`);
      lines.push(`    ${result.snippet}`);
    }
  } else {
    lines.push('No organic results found.');
  }

  // Places results (for non-google_places searches that happen to have them)
  if (search.response.places?.length) {
    lines.push(`Places results:`);
    for (const place of search.response.places.slice(0, 3)) {
      lines.push(`  - ${place.title} (${place.address})`);
      if (place.rating) lines.push(`    Rating: ${place.rating}${place.ratingCount ? ` (${place.ratingCount} reviews)` : ''}`);
    }
  }

  return lines.join('\n');
}

/**
 * Build prompt for OpenAI to ANALYZE pre-gathered search data (no web_search_preview).
 */
function buildSerperEnhancedPrompt(vendor: Vendor, searchData: VendorSearchData): string {
  const formattedData = formatSearchDataForPrompt(searchData);

  return `You are a due diligence analyst for a home service vendor marketplace based in Philadelphia, PA. Your job is to analyze search data we've already gathered about a vendor applicant and compile a structured report.

${vendorInfoBlock(vendor)}

SEARCH DATA (gathered via Google Search API):
${formattedData}

ANALYSIS INSTRUCTIONS:
You have been provided with raw search results from 8 different Google searches. Your job is to ANALYZE this data — do NOT attempt to search the web yourself.

1. Extract review ratings and counts from the search results. Google Places data is provided directly above. For Yelp, BBB, Facebook, and Angi, look at the organic search result snippets for rating/review information.
2. Identify the business website and social media presence from the search results.
3. Look for any red flags in the legal/complaints search results.
4. Assess community sentiment from Reddit/Nextdoor mentions.
5. Cross-reference information across sources for consistency.

IMPORTANT RULES:
- Return null for any field where the search data doesn't contain relevant information. NEVER fabricate or guess.
- Be specific with review counts and ratings — only report what's actually in the search data.
- Include direct URLs from the search results whenever possible.
- Risk flags should be specific and actionable.
- Positive signals should cite actual evidence from the data.
- The summary should be 2-3 sentences giving an honest overall assessment.
- Set confidence_level based on data quality: "high" if Google Places + multiple review sources found, "medium" if some data, "low" if very little found.
- Include all source URLs in the sources array.`;
}

/**
 * Run due diligence using Serper for data gathering + OpenAI for analysis.
 */
async function runSerperEnhancedAnalysis(vendor: Vendor): Promise<DueDiligenceAnalysisResult> {
  const location = vendor.location || 'Philadelphia, PA';

  // Step 1: Gather search data with Serper (8 parallel searches)
  console.log('[DueDiligence] Using Serper-enhanced analysis for:', vendor.business_name);
  const searchData = await gatherVendorSearchData({
    businessName: vendor.business_name,
    location,
  });
  console.log(
    `[DueDiligence] Serper searches complete: ${searchData.successfulSearches}/${searchData.totalSearches} succeeded`
  );

  // Step 2: Send search data to OpenAI for analysis (no web_search_preview tool)
  console.log('[DueDiligence] Sending search data to OpenAI for analysis...');
  const prompt = buildSerperEnhancedPrompt(vendor, searchData);

  const response = await openaiResponsesCreate({
    model: MODEL,
    input: prompt,
    // No tools — OpenAI analyzes the data we provide, no web searching
    text: { format: DUE_DILIGENCE_JSON_SCHEMA },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DueDiligence] OpenAI API error:', response.status, errorText);
    return {
      success: false,
      error: `OpenAI API error: ${response.status}`,
    };
  }

  const data = await response.json();
  const parsed = parseOpenAIResponse(data);

  if (parsed.error || !parsed.results) {
    console.error('[DueDiligence] Parse error:', parsed.error, parsed.rawResponse);
    return {
      success: false,
      rawResponse: parsed.rawResponse,
      error: parsed.error || 'Failed to parse OpenAI response',
    };
  }

  console.log(
    `[DueDiligence] OpenAI analysis complete — tokens: ${parsed.tokensUsed ?? 'unknown'}, confidence: ${parsed.results.confidence_level}`
  );

  return {
    success: true,
    results: parsed.results,
    rawResponse: parsed.rawResponse,
    model: MODEL,
    tokensUsed: parsed.tokensUsed,
    searchQueriesUsed: searchData.successfulSearches,
  };
}

// ============================================================================
// Path B: Web Search Fallback (when Serper is not configured)
// ============================================================================

/**
 * Build prompt for OpenAI with web_search_preview (original approach).
 */
function buildWebSearchPrompt(vendor: Vendor): string {
  const location = vendor.location || 'Philadelphia, PA area';

  return `You are a due diligence analyst for a home service vendor marketplace based in Philadelphia, PA. Your job is to research a vendor applicant and compile a structured report about their reputation, online presence, and any red flags.

${vendorInfoBlock(vendor)}

SEARCH STRATEGY — Follow these steps IN ORDER. Perform SEPARATE web searches for each:
1. Search: "${vendor.business_name} reviews" — look for Google Business Profile, Yelp, and other review platforms.
2. Search: "${vendor.business_name} ${location}" — find local business listings and reviews with location context.
3. Search: "${vendor.business_name} BBB" — check Better Business Bureau listing.
4. Search: "${vendor.business_name} Yelp" — check Yelp listing specifically.
5. Search: "${vendor.business_name} Angi" OR "${vendor.business_name} HomeAdvisor" — check Angi/HomeAdvisor.
6. If a website URL is provided, visit it directly. If not, search for the business website.
7. Search social media: check Facebook, Instagram, and LinkedIn for the business.
8. Search: "${vendor.business_name} complaints" OR "${vendor.business_name} lawsuit" — check for negative signals.
9. Search Reddit and local Philadelphia forums for any mentions.

IMPORTANT: You MUST perform multiple separate web searches. Do NOT try to answer everything from a single search. Each platform check should be its own search query.

IMPORTANT RULES:
- Return null for any field where you genuinely cannot find data after searching. NEVER fabricate or guess information.
- Be specific with review counts and ratings — only report what you actually find.
- Include direct URLs to sources whenever possible.
- When Google shows a business with ratings/reviews in search results, extract that data even if you can't access the full Google Maps page.
- Risk flags should be specific and actionable (e.g., "No Google Reviews found despite claiming 5 years in business").
- Positive signals should highlight real evidence (e.g., "4.8 stars on Google with 127 reviews").
- The summary should be 2-3 sentences giving an honest overall assessment.
- Set confidence_level based on how much data you found: "high" if multiple review sources + verified web presence, "medium" if some data found, "low" if very little found.`;
}

/**
 * Run due diligence using OpenAI's web_search_preview (fallback).
 */
async function runWebSearchAnalysis(vendor: Vendor): Promise<DueDiligenceAnalysisResult> {
  console.log('[DueDiligence] Using web_search_preview fallback for:', vendor.business_name);

  const prompt = buildWebSearchPrompt(vendor);

  const response = await openaiResponsesCreate({
    model: MODEL,
    input: prompt,
    tools: [{
      type: 'web_search_preview',
      search_context_size: 'high',
      user_location: {
        type: 'approximate',
        city: 'Philadelphia',
        region: 'Pennsylvania',
        country: 'US',
      },
    }],
    text: { format: DUE_DILIGENCE_JSON_SCHEMA },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[DueDiligence] OpenAI API error:', response.status, errorText);
    return {
      success: false,
      error: `OpenAI API error: ${response.status}`,
    };
  }

  const data = await response.json();
  const parsed = parseOpenAIResponse(data);

  if (parsed.error || !parsed.results) {
    console.error('[DueDiligence] Parse error:', parsed.error, parsed.rawResponse);
    return {
      success: false,
      rawResponse: parsed.rawResponse,
      error: parsed.error || 'Failed to parse OpenAI response',
    };
  }

  return {
    success: true,
    results: parsed.results,
    rawResponse: parsed.rawResponse,
    model: MODEL,
    tokensUsed: parsed.tokensUsed,
    searchQueriesUsed: parsed.searchQueriesUsed,
  };
}

// ============================================================================
// Public API — Routes to the best available path
// ============================================================================

const MODEL = 'gpt-4.1';

/**
 * Run vendor due diligence analysis.
 *
 * Routes automatically:
 * - Serper configured → parallel search + OpenAI analysis (~7-17s)
 * - Serper not configured → OpenAI web_search_preview fallback (~40-80s)
 */
export async function runDueDiligenceAnalysis(vendor: Vendor): Promise<DueDiligenceAnalysisResult> {
  try {
    if (isSerperConfigured()) {
      return await runSerperEnhancedAnalysis(vendor);
    }
    return await runWebSearchAnalysis(vendor);
  } catch (error) {
    console.error('[DueDiligence] Analysis failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during analysis',
    };
  }
}
