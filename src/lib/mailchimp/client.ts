/**
 * Mailchimp API Client
 *
 * Low-level client for Mailchimp Marketing API.
 * Uses Basic auth with API key and server prefix from env vars.
 */

import { createHash } from 'crypto';

/**
 * Check if Mailchimp is configured (all 3 env vars present)
 */
export function isMailchimpConfigured(): boolean {
  return !!(
    process.env.MAILCHIMP_API_KEY &&
    process.env.MAILCHIMP_SERVER_PREFIX &&
    process.env.MAILCHIMP_AUDIENCE_ID
  );
}

/**
 * Generate subscriber hash (MD5 of lowercased email) — Mailchimp requirement
 */
export function subscriberHash(email: string): string {
  return createHash('md5').update(email.toLowerCase().trim()).digest('hex');
}

/**
 * Make authenticated requests to the Mailchimp Marketing API
 */
export async function mailchimpFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX;

  if (!apiKey || !serverPrefix) {
    throw new Error('Mailchimp API key or server prefix not configured');
  }

  const baseUrl = `https://${serverPrefix}.api.mailchimp.com/3.0`;
  const url = `${baseUrl}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${Buffer.from(`anystring:${apiKey}`).toString('base64')}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}
