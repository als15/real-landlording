import crypto from 'crypto';

const TOKEN_EXPIRY_DAYS = 30;

function getSecret(): string {
  const secret = process.env.FOLLOWUP_TOKEN_SECRET;
  if (!secret) {
    throw new Error('FOLLOWUP_TOKEN_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Generate an HMAC-SHA256 signed token for follow-up email response links.
 * Format: {followupId}.{type}.{timestamp}.{hmac}
 */
export function generateFollowupToken(
  followupId: string,
  type: 'vendor' | 'landlord'
): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const payload = `${followupId}.${type}.${timestamp}`;
  const hmac = crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('hex');
  return `${payload}.${hmac}`;
}

export interface TokenVerification {
  followupId: string;
  type: 'vendor' | 'landlord';
  valid: boolean;
  expired: boolean;
}

/**
 * Verify a follow-up response token.
 * Checks signature integrity and expiry (30 days).
 */
export function verifyFollowupToken(token: string): TokenVerification {
  const invalid: TokenVerification = {
    followupId: '',
    type: 'vendor',
    valid: false,
    expired: false,
  };

  if (!token) return invalid;

  const parts = token.split('.');
  if (parts.length !== 4) return invalid;

  const [followupId, type, timestampStr, providedHmac] = parts;

  if (type !== 'vendor' && type !== 'landlord') return invalid;

  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) return invalid;

  // Verify HMAC
  const payload = `${followupId}.${type}.${timestampStr}`;
  let expectedHmac: string;
  try {
    expectedHmac = crypto
      .createHmac('sha256', getSecret())
      .update(payload)
      .digest('hex');
  } catch {
    return invalid;
  }

  // Constant-time comparison to prevent timing attacks
  if (
    providedHmac.length !== expectedHmac.length ||
    !crypto.timingSafeEqual(
      Buffer.from(providedHmac, 'hex'),
      Buffer.from(expectedHmac, 'hex')
    )
  ) {
    return invalid;
  }

  // Check expiry
  const now = Math.floor(Date.now() / 1000);
  const expirySeconds = TOKEN_EXPIRY_DAYS * 24 * 60 * 60;
  if (now - timestamp > expirySeconds) {
    return { followupId, type, valid: false, expired: true };
  }

  return { followupId, type, valid: true, expired: false };
}
