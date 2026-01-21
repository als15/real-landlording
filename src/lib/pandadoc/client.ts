/**
 * PandaDoc API Client
 *
 * Simple API key authentication - much simpler than DocuSign's JWT flow.
 */

const PANDADOC_API_KEY = process.env.PANDADOC_API_KEY;
const PANDADOC_BASE_URL = 'https://api.pandadoc.com/public/v1';

export type SlaStatus = 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'signed' | 'declined' | 'voided';

/**
 * Check if PandaDoc is configured
 */
export function isPandaDocConfigured(): boolean {
  return !!(
    process.env.PANDADOC_API_KEY &&
    process.env.PANDADOC_SLA_TEMPLATE_ID
  );
}

/**
 * Map PandaDoc document status to our SLA status
 */
export function mapDocumentStatusToSlaStatus(pandadocStatus: string): SlaStatus {
  const statusMap: Record<string, SlaStatus> = {
    'document.uploaded': 'not_sent',
    'document.draft': 'not_sent',
    'document.sent': 'sent',
    'document.viewed': 'viewed',
    'document.waiting_approval': 'sent',
    'document.approved': 'sent',
    'document.waiting_pay': 'sent',
    'document.completed': 'signed',
    'document.voided': 'voided',
    'document.declined': 'declined',
    'document.expired': 'voided',
  };

  return statusMap[pandadocStatus] || 'not_sent';
}

/**
 * Make authenticated requests to PandaDoc API
 */
export async function pandadocFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  if (!PANDADOC_API_KEY) {
    throw new Error('PANDADOC_API_KEY is not configured');
  }

  const url = endpoint.startsWith('http') ? endpoint : `${PANDADOC_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `API-Key ${PANDADOC_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  return response;
}

/**
 * Wait for document to be in draft status (ready to send)
 * PandaDoc documents need a few seconds after creation before they can be sent
 */
export async function waitForDraftStatus(
  documentId: string,
  maxAttempts: number = 10,
  delayMs: number = 1000
): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await pandadocFetch(`/documents/${documentId}`);

    if (!response.ok) {
      console.error('[PandaDoc] Failed to get document status:', await response.text());
      return false;
    }

    const doc = await response.json();
    console.log(`[PandaDoc] Document status check ${attempt + 1}/${maxAttempts}: ${doc.status}`);

    if (doc.status === 'document.draft') {
      return true;
    }

    // If already sent or completed, that's fine too
    if (['document.sent', 'document.completed', 'document.viewed'].includes(doc.status)) {
      return true;
    }

    // Wait before next attempt
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }

  console.error('[PandaDoc] Document did not reach draft status in time');
  return false;
}
