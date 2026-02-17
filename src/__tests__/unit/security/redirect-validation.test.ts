/**
 * Tests for redirect URL validation
 */

import { sanitizeRedirectUrl } from '@/lib/security';

describe('sanitizeRedirectUrl', () => {
  it('should allow internal paths', () => {
    expect(sanitizeRedirectUrl('/dashboard')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('/vendor/dashboard')).toBe('/vendor/dashboard');
    expect(sanitizeRedirectUrl('/requests')).toBe('/requests');
  });

  it('should allow paths with query parameters', () => {
    expect(sanitizeRedirectUrl('/dashboard?tab=profile')).toBe('/dashboard?tab=profile');
    expect(sanitizeRedirectUrl('/requests?view=123')).toBe('/requests?view=123');
  });

  it('should block external URLs with protocol', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('http://evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('javascript://alert(1)')).toBe('/dashboard');
  });

  it('should block protocol-relative URLs', () => {
    expect(sanitizeRedirectUrl('//evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('//evil.com/path')).toBe('/dashboard');
  });

  it('should block URLs not starting with /', () => {
    expect(sanitizeRedirectUrl('evil.com')).toBe('/dashboard');
    expect(sanitizeRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe('/dashboard');
  });

  it('should return fallback for null', () => {
    expect(sanitizeRedirectUrl(null)).toBe('/dashboard');
  });

  it('should return fallback for undefined', () => {
    expect(sanitizeRedirectUrl(undefined)).toBe('/dashboard');
  });

  it('should return fallback for empty string', () => {
    expect(sanitizeRedirectUrl('')).toBe('/dashboard');
  });

  it('should use custom fallback when provided', () => {
    expect(sanitizeRedirectUrl('https://evil.com', '/vendor/login')).toBe('/vendor/login');
    expect(sanitizeRedirectUrl(null, '/auth/login')).toBe('/auth/login');
  });

  it('should block path with embedded protocol', () => {
    expect(sanitizeRedirectUrl('/redirect?url=https://evil.com')).toBe('/dashboard');
  });
});
