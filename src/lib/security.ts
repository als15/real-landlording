/**
 * Security utilities
 */

/**
 * Escape HTML special characters to prevent XSS in email templates
 */
export function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate a redirect URL is safe (internal path only)
 *
 * @param url - The redirect URL to validate
 * @param fallback - Default path if URL is invalid
 * @returns A safe redirect path
 */
export function sanitizeRedirectUrl(url: string | null | undefined, fallback: string = '/dashboard'): string {
  if (!url) return fallback;
  if (!url.startsWith('/')) return fallback;
  if (url.includes('://')) return fallback;
  if (url.startsWith('//')) return fallback;
  return url;
}
