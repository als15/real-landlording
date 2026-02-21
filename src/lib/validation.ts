/**
 * Name validation and suspicious account detection utilities.
 * Used by signup API (rejection) and admin UI (flagging).
 */

interface ValidationResult {
  valid: boolean;
  reason?: string;
}

const URL_PATTERN = /https?:\/\/|www\./i;
const EMAIL_PATTERN = /\S+@\S+\.\S+/;
const VOWELS = /[aeiouyAEIOUY]/;
const CONSECUTIVE_CONSONANTS = /[^aeiouy\s\-']{5,}/i;
const NON_LETTER_CHARS = /[^a-zA-Z\s\-'.\u00C0-\u024F]/g;

/**
 * Validates a name for signup. Returns { valid: false, reason } if the name
 * should be rejected outright (clearly not a real name).
 */
export function validateName(name: string): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, reason: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, reason: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, reason: 'Name must be 100 characters or less' };
  }

  if (URL_PATTERN.test(trimmed)) {
    return { valid: false, reason: 'Name cannot contain URLs' };
  }

  if (EMAIL_PATTERN.test(trimmed)) {
    return { valid: false, reason: 'Name cannot contain email addresses' };
  }

  // Check for no vowels at all (gibberish like "bcdfghjklmnp")
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 3 && !VOWELS.test(lettersOnly)) {
    return { valid: false, reason: 'Name does not appear to be valid' };
  }

  // Check for too many non-letter characters (>70%)
  const nonLetterCount = (trimmed.match(NON_LETTER_CHARS) || []).length;
  if (trimmed.length >= 3 && nonLetterCount / trimmed.length > 0.7) {
    return { valid: false, reason: 'Name contains too many special characters' };
  }

  // Check for 5+ consecutive consonants (gibberish like "xyzwkr")
  if (CONSECUTIVE_CONSONANTS.test(trimmed)) {
    return { valid: false, reason: 'Name does not appear to be valid' };
  }

  return { valid: true };
}

/**
 * Flags a name as suspicious for admin UI display. Less strict than validateName —
 * these accounts aren't rejected, just highlighted for admin review.
 */
export function isNameSuspicious(name: string | null | undefined): boolean {
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return true;
  }

  const trimmed = name.trim();

  // No vowels at all
  const lettersOnly = trimmed.replace(/[^a-zA-Z]/g, '');
  if (lettersOnly.length >= 3 && !VOWELS.test(lettersOnly)) {
    return true;
  }

  // 4+ consecutive consonants (slightly less strict than validation)
  if (/[^aeiouy\s\-']{4,}/i.test(trimmed)) {
    return true;
  }

  // Long single-word name (>15 chars with no spaces) — real names almost always have spaces
  if (trimmed.length > 15 && !trimmed.includes(' ')) {
    return true;
  }

  return false;
}
