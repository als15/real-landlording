/**
 * OpenAI API Client
 *
 * Thin fetch wrapper for the OpenAI Responses API.
 * Follows the same pattern as src/lib/pandadoc/client.ts — no npm package, just fetch.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 2000;

/**
 * Check if OpenAI is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Sleep helper for retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Create a response using the OpenAI Responses API.
 * Retries up to 3 times on 429 (rate limit) with exponential backoff,
 * respecting the Retry-After header when provided.
 */
export async function openaiResponsesCreate(params: {
  model: string;
  input: string;
  tools?: Array<{ type: string; [key: string]: unknown }>;
  text?: { format: { type: string; name?: string; schema?: unknown; strict?: boolean } };
}): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (response.status !== 429 || attempt === MAX_RETRIES) {
      return response;
    }

    lastResponse = response;

    // Use Retry-After header if provided, otherwise exponential backoff
    const retryAfter = response.headers.get('retry-after');
    const waitMs = retryAfter
      ? parseInt(retryAfter, 10) * 1000
      : INITIAL_BACKOFF_MS * Math.pow(2, attempt);

    console.warn(
      `[OpenAI] Rate limited (429), retrying in ${waitMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})`
    );

    await sleep(waitMs);
  }

  // Should not reach here, but return last response as fallback
  return lastResponse!;
}
