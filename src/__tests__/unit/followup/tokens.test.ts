import crypto from 'crypto';
import { generateFollowupToken, verifyFollowupToken } from '@/lib/followup/tokens';

// Set up test secret
beforeAll(() => {
  process.env.FOLLOWUP_TOKEN_SECRET = 'test-secret-key-for-testing-only-32chars!!';
});

afterAll(() => {
  delete process.env.FOLLOWUP_TOKEN_SECRET;
});

describe('Follow-up Token System', () => {
  const testFollowupId = '550e8400-e29b-41d4-a716-446655440000';

  describe('generateFollowupToken', () => {
    it('generates a token with correct format', () => {
      const token = generateFollowupToken(testFollowupId, 'vendor');
      const parts = token.split('.');
      expect(parts).toHaveLength(4);
      expect(parts[0]).toBe(testFollowupId);
      expect(parts[1]).toBe('vendor');
      expect(parseInt(parts[2], 10)).toBeGreaterThan(0);
      expect(parts[3]).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    });

    it('generates different tokens for vendor vs landlord', () => {
      const vendorToken = generateFollowupToken(testFollowupId, 'vendor');
      const landlordToken = generateFollowupToken(testFollowupId, 'landlord');
      expect(vendorToken).not.toBe(landlordToken);
    });

    it('generates different tokens for different followup IDs', () => {
      const token1 = generateFollowupToken(testFollowupId, 'vendor');
      const token2 = generateFollowupToken('different-id', 'vendor');
      expect(token1).not.toBe(token2);
    });
  });

  describe('verifyFollowupToken', () => {
    it('verifies a valid vendor token', () => {
      const token = generateFollowupToken(testFollowupId, 'vendor');
      const result = verifyFollowupToken(token);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.followupId).toBe(testFollowupId);
      expect(result.type).toBe('vendor');
    });

    it('verifies a valid landlord token', () => {
      const token = generateFollowupToken(testFollowupId, 'landlord');
      const result = verifyFollowupToken(token);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
      expect(result.followupId).toBe(testFollowupId);
      expect(result.type).toBe('landlord');
    });

    it('rejects empty token', () => {
      const result = verifyFollowupToken('');
      expect(result.valid).toBe(false);
    });

    it('rejects token with wrong number of parts', () => {
      const result = verifyFollowupToken('a.b.c');
      expect(result.valid).toBe(false);
    });

    it('rejects token with invalid type', () => {
      const result = verifyFollowupToken(`${testFollowupId}.admin.12345.abcdef`);
      expect(result.valid).toBe(false);
    });

    it('rejects tampered token (modified HMAC)', () => {
      const token = generateFollowupToken(testFollowupId, 'vendor');
      const parts = token.split('.');
      parts[3] = 'a'.repeat(64); // Replace HMAC
      const result = verifyFollowupToken(parts.join('.'));
      expect(result.valid).toBe(false);
    });

    it('rejects tampered token (modified followupId)', () => {
      const token = generateFollowupToken(testFollowupId, 'vendor');
      const parts = token.split('.');
      parts[0] = 'tampered-id';
      const result = verifyFollowupToken(parts.join('.'));
      expect(result.valid).toBe(false);
    });

    it('detects expired token', () => {
      // Generate a token, then mock it with an old timestamp
      const oldTimestamp = Math.floor(Date.now() / 1000) - (31 * 24 * 60 * 60); // 31 days ago
      const payload = `${testFollowupId}.vendor.${oldTimestamp}`;
      const hmac = crypto
        .createHmac('sha256', process.env.FOLLOWUP_TOKEN_SECRET!)
        .update(payload)
        .digest('hex');
      const expiredToken = `${payload}.${hmac}`;

      const result = verifyFollowupToken(expiredToken);
      expect(result.valid).toBe(false);
      expect(result.expired).toBe(true);
      expect(result.followupId).toBe(testFollowupId);
    });

    it('accepts token just within expiry window', () => {
      // Generate a token with timestamp 29 days ago (within 30-day window)
      const recentTimestamp = Math.floor(Date.now() / 1000) - (29 * 24 * 60 * 60);
      const payload = `${testFollowupId}.vendor.${recentTimestamp}`;
      const hmac = crypto
        .createHmac('sha256', process.env.FOLLOWUP_TOKEN_SECRET!)
        .update(payload)
        .digest('hex');
      const token = `${payload}.${hmac}`;

      const result = verifyFollowupToken(token);
      expect(result.valid).toBe(true);
      expect(result.expired).toBe(false);
    });
  });

  describe('token without secret', () => {
    it('throws when generating without FOLLOWUP_TOKEN_SECRET', () => {
      const originalSecret = process.env.FOLLOWUP_TOKEN_SECRET;
      delete process.env.FOLLOWUP_TOKEN_SECRET;
      expect(() => generateFollowupToken(testFollowupId, 'vendor')).toThrow(
        'FOLLOWUP_TOKEN_SECRET environment variable is not set'
      );
      process.env.FOLLOWUP_TOKEN_SECRET = originalSecret;
    });
  });
});
