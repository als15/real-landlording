import * as jose from 'jose';
import * as crypto from 'crypto';

// DocuSign configuration from environment variables
const DOCUSIGN_INTEGRATION_KEY = process.env.DOCUSIGN_INTEGRATION_KEY!;
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID!;
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID!;
const DOCUSIGN_RSA_PRIVATE_KEY = process.env.DOCUSIGN_RSA_PRIVATE_KEY!;
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi';
const DOCUSIGN_OAUTH_BASE_PATH = process.env.DOCUSIGN_OAUTH_BASE_PATH || 'account-d.docusign.com';

// Token cache to avoid requesting new tokens for every API call
let cachedAccessToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Import a private key that may be in PKCS#1 (RSA PRIVATE KEY) or PKCS#8 (PRIVATE KEY) format
 */
async function importPrivateKey(pemBase64: string): Promise<crypto.KeyObject> {
  // Decode from base64
  let pem = Buffer.from(pemBase64, 'base64').toString('utf-8');

  // Normalize the PEM format - ensure proper line breaks
  // Sometimes base64 encoding removes newlines
  if (!pem.includes('\n')) {
    // Key is all on one line, need to reconstruct proper PEM format
    const header = pem.match(/-----BEGIN [^-]+-----/)?.[0] || '';
    const footer = pem.match(/-----END [^-]+-----/)?.[0] || '';
    const body = pem.replace(header, '').replace(footer, '').trim();

    // Split body into 64-character lines
    const bodyLines = body.match(/.{1,64}/g)?.join('\n') || body;
    pem = `${header}\n${bodyLines}\n${footer}`;
  }

  console.log('[DocuSign] Key format check - starts with:', pem.substring(0, 50));

  // Use Node's crypto module which handles both PKCS#1 and PKCS#8 formats
  return crypto.createPrivateKey(pem);
}

/**
 * Get an access token using JWT Grant authentication
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 5 minute buffer)
  if (cachedAccessToken && Date.now() < tokenExpiresAt - 5 * 60 * 1000) {
    return cachedAccessToken;
  }

  // Import the private key (handles base64 decoding and format normalization)
  const privateKey = await importPrivateKey(DOCUSIGN_RSA_PRIVATE_KEY);

  // Create JWT
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new jose.SignJWT({
    iss: DOCUSIGN_INTEGRATION_KEY,
    sub: DOCUSIGN_USER_ID,
    aud: DOCUSIGN_OAUTH_BASE_PATH,
    scope: 'signature impersonation',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  // Exchange JWT for access token
  const tokenResponse = await fetch(`https://${DOCUSIGN_OAUTH_BASE_PATH}/oauth/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    const errorText = await tokenResponse.text();
    throw new Error(`Failed to get DocuSign access token: ${errorText}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiresAt = Date.now() + tokenData.expires_in * 1000;

  return cachedAccessToken!;
}

/**
 * Make an authenticated request to the DocuSign API
 */
export async function docusignFetch(
  endpoint: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = await getAccessToken();
  const url = `${DOCUSIGN_BASE_PATH}/v2.1/accounts/${DOCUSIGN_ACCOUNT_ID}${endpoint}`;

  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
}

/**
 * Get the configured DocuSign account ID
 */
export function getAccountId(): string {
  return DOCUSIGN_ACCOUNT_ID;
}

/**
 * Check if DocuSign is properly configured
 */
export function isDocuSignConfigured(): boolean {
  return !!(
    DOCUSIGN_INTEGRATION_KEY &&
    DOCUSIGN_USER_ID &&
    DOCUSIGN_ACCOUNT_ID &&
    DOCUSIGN_RSA_PRIVATE_KEY
  );
}

/**
 * SLA status type
 */
export type SlaStatus = 'not_sent' | 'sent' | 'delivered' | 'viewed' | 'signed' | 'declined' | 'voided';

/**
 * Map DocuSign envelope status to our SLA status
 */
export function mapEnvelopeStatusToSlaStatus(envelopeStatus: string): SlaStatus {
  const statusMap: Record<string, SlaStatus> = {
    'sent': 'sent',
    'delivered': 'delivered',
    'completed': 'signed',
    'declined': 'declined',
    'voided': 'voided',
  };

  return statusMap[envelopeStatus.toLowerCase()] || 'sent';
}
