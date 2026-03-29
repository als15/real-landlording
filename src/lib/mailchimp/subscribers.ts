/**
 * Mailchimp Subscriber Management
 *
 * Higher-level functions for managing newsletter subscribers.
 * Designed for fire-and-forget usage — never throws, returns result object.
 */

import { isMailchimpConfigured, subscriberHash, mailchimpFetch } from './client';

interface AddSubscriberParams {
  email: string;
  firstName: string;
  lastName: string;
  tag: 'landlord' | 'vendor';
}

interface AddSubscriberResult {
  success: boolean;
  error?: string;
}

/**
 * Add or update a subscriber in Mailchimp and apply a tag.
 *
 * Uses PUT (upsert) to avoid duplicates — safe to call multiple times.
 * Skips silently if Mailchimp is not configured.
 */
export async function addSubscriber({
  email,
  firstName,
  lastName,
  tag,
}: AddSubscriberParams): Promise<AddSubscriberResult> {
  if (!isMailchimpConfigured()) {
    console.log('[Mailchimp] SKIPPED — not configured');
    return { success: true };
  }

  const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;
  const hash = subscriberHash(email);

  try {
    // Upsert subscriber via PUT
    const memberResponse = await mailchimpFetch(
      `/lists/${audienceId}/members/${hash}`,
      {
        method: 'PUT',
        body: JSON.stringify({
          email_address: email,
          status_if_new: 'subscribed',
          merge_fields: {
            FNAME: firstName,
            LNAME: lastName,
          },
        }),
      }
    );

    if (!memberResponse.ok) {
      const errorBody = await memberResponse.text();
      console.error(`[Mailchimp] Failed to upsert subscriber: ${memberResponse.status}`, errorBody);
      return { success: false, error: `Upsert failed: ${memberResponse.status}` };
    }

    // Apply tag
    const tagResponse = await mailchimpFetch(
      `/lists/${audienceId}/members/${hash}/tags`,
      {
        method: 'POST',
        body: JSON.stringify({
          tags: [{ name: tag, status: 'active' }],
        }),
      }
    );

    if (!tagResponse.ok) {
      const errorBody = await tagResponse.text();
      console.error(`[Mailchimp] Failed to apply tag "${tag}": ${tagResponse.status}`, errorBody);
      return { success: false, error: `Tag failed: ${tagResponse.status}` };
    }

    console.log(`[Mailchimp] Subscriber synced: ${email} (tag: ${tag})`);
    return { success: true };
  } catch (error) {
    console.error('[Mailchimp] Unexpected error:', error);
    return { success: false, error: String(error) };
  }
}
