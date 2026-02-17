/**
 * Tests for HTML escaping utility
 */

import { escapeHtml } from '@/lib/security';

describe('escapeHtml', () => {
  it('should return empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('should return empty string for empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('should pass through normal strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('John Doe')).toBe('John Doe');
    expect(escapeHtml('123 Main St, Philadelphia PA 19103')).toBe('123 Main St, Philadelphia PA 19103');
  });

  it('should escape < and >', () => {
    expect(escapeHtml('<div>')).toBe('&lt;div&gt;');
    expect(escapeHtml('a < b > c')).toBe('a &lt; b &gt; c');
  });

  it('should escape ampersand', () => {
    expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
  });

  it('should escape double quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('should escape single quotes', () => {
    expect(escapeHtml("it's fine")).toBe('it&#039;s fine');
  });

  it('should escape a script tag (XSS attempt)', () => {
    const malicious = '<script>alert("xss")</script>';
    const escaped = escapeHtml(malicious);
    expect(escaped).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    expect(escaped).not.toContain('<script>');
  });

  it('should escape img onerror (XSS attempt)', () => {
    const malicious = '<img src=x onerror="alert(1)">';
    const escaped = escapeHtml(malicious);
    expect(escaped).not.toContain('<img');
    // The word "onerror" is harmless as plain text — what matters is that
    // the angle brackets are escaped so the browser won't parse it as HTML
    expect(escaped).toContain('&lt;img');
    expect(escaped).toContain('&gt;');
  });

  it('should handle multiple special characters together', () => {
    const input = 'Fix <pipes> & "drains" at O\'Brien\'s';
    const expected = 'Fix &lt;pipes&gt; &amp; &quot;drains&quot; at O&#039;Brien&#039;s';
    expect(escapeHtml(input)).toBe(expected);
  });
});
