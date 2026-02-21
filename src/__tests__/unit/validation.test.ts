import { validateName, isNameSuspicious } from '@/lib/validation';

describe('validateName', () => {
  describe('valid names', () => {
    const validNames = [
      'John Smith',
      'Maria Garcia-Lopez',
      "O'Brien",
      'Li Wei',
      'José Martínez',
      'Jean-Pierre Dupont',
      'Dr. Sarah Johnson',
      'Al',
      'Bo',
      'Mary Jane Watson',
    ];

    it.each(validNames)('accepts "%s"', (name) => {
      expect(validateName(name)).toEqual({ valid: true });
    });
  });

  describe('invalid names', () => {
    it('rejects empty string', () => {
      const result = validateName('');
      expect(result.valid).toBe(false);
      expect(result.reason).toBe('Name is required');
    });

    it('rejects null/undefined', () => {
      expect(validateName(null as unknown as string).valid).toBe(false);
      expect(validateName(undefined as unknown as string).valid).toBe(false);
    });

    it('rejects single character', () => {
      const result = validateName('A');
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('at least 2');
    });

    it('rejects names over 100 characters', () => {
      const result = validateName('A'.repeat(101));
      expect(result.valid).toBe(false);
      expect(result.reason).toContain('100 characters');
    });

    it('rejects names with no vowels', () => {
      const result = validateName('bcdfghjklmnpq');
      expect(result.valid).toBe(false);
    });

    it('rejects names with URLs', () => {
      expect(validateName('John https://spam.com').valid).toBe(false);
      expect(validateName('www.spam.com Smith').valid).toBe(false);
    });

    it('rejects names with email addresses', () => {
      expect(validateName('spam@bot.com').valid).toBe(false);
    });

    it('rejects names with >70% non-letter characters', () => {
      expect(validateName('12345678ab').valid).toBe(false);
    });

    it('rejects names with 5+ consecutive consonants', () => {
      expect(validateName('Xyzwkrman').valid).toBe(false);
    });

    it('rejects gibberish bot names', () => {
      expect(validateName('YXazyuWSswEGXHgizshpH').valid).toBe(false);
      expect(validateName('kdfghbjkl').valid).toBe(false);
    });
  });
});

describe('isNameSuspicious', () => {
  describe('suspicious names', () => {
    it('flags null/undefined/empty', () => {
      expect(isNameSuspicious(null)).toBe(true);
      expect(isNameSuspicious(undefined)).toBe(true);
      expect(isNameSuspicious('')).toBe(true);
    });

    it('flags names with no vowels', () => {
      expect(isNameSuspicious('bcdfghjk')).toBe(true);
    });

    it('flags names with 4+ consecutive consonants', () => {
      expect(isNameSuspicious('Teststrng')).toBe(true);
    });

    it('flags long single-word names (>15 chars)', () => {
      expect(isNameSuspicious('YXazyuWSswEGXHgi')).toBe(true);
      expect(isNameSuspicious('Abcdefghijklmnop')).toBe(true);
    });
  });

  describe('non-suspicious names', () => {
    const normalNames = [
      'John Smith',
      'Maria Garcia-Lopez',
      "O'Brien",
      'Li Wei',
      'Sarah',
      'Al',
    ];

    it.each(normalNames)('does not flag "%s"', (name) => {
      expect(isNameSuspicious(name)).toBe(false);
    });
  });
});
