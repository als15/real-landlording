/**
 * Unit tests for request count logic
 *
 * These tests verify the business logic for graduated signup nudge:
 * - New landlords get requestCount = 1
 * - Existing landlords get incremented requestCount
 */

describe('Request Count Logic', () => {
  // Business logic function extracted for testing
  function calculateRequestCount(existingLandlord: { request_count: number | null } | null): number {
    if (existingLandlord) {
      return (existingLandlord.request_count || 0) + 1;
    }
    return 1;
  }

  describe('calculateRequestCount', () => {
    it('returns 1 for new landlord (null)', () => {
      const result = calculateRequestCount(null);
      expect(result).toBe(1);
    });

    it('returns 2 for landlord with 1 previous request', () => {
      const result = calculateRequestCount({ request_count: 1 });
      expect(result).toBe(2);
    });

    it('returns 6 for landlord with 5 previous requests', () => {
      const result = calculateRequestCount({ request_count: 5 });
      expect(result).toBe(6);
    });

    it('returns 1 for landlord with null request_count', () => {
      const result = calculateRequestCount({ request_count: null });
      expect(result).toBe(1);
    });

    it('returns 1 for landlord with 0 request_count', () => {
      const result = calculateRequestCount({ request_count: 0 });
      expect(result).toBe(1);
    });
  });
});

describe('Graduated Signup Nudge Logic', () => {
  // Logic for determining if graduated messaging should be shown
  function isRepeatRequester(requestCount: number): boolean {
    return requestCount > 1;
  }

  function getHeaderText(requestCount: number): string {
    if (requestCount > 1) {
      return `You have ${requestCount} requests!`;
    }
    return 'Request Submitted!';
  }

  function getCTAText(requestCount: number): string {
    if (requestCount > 1) {
      return 'Create Account & Track Requests';
    }
    return 'Create Free Account';
  }

  describe('isRepeatRequester', () => {
    it('returns false for first request', () => {
      expect(isRepeatRequester(1)).toBe(false);
    });

    it('returns true for second request', () => {
      expect(isRepeatRequester(2)).toBe(true);
    });

    it('returns true for multiple requests', () => {
      expect(isRepeatRequester(5)).toBe(true);
    });
  });

  describe('getHeaderText', () => {
    it('returns standard message for first request', () => {
      expect(getHeaderText(1)).toBe('Request Submitted!');
    });

    it('returns graduated message for second request', () => {
      expect(getHeaderText(2)).toBe('You have 2 requests!');
    });

    it('returns graduated message for multiple requests', () => {
      expect(getHeaderText(5)).toBe('You have 5 requests!');
    });
  });

  describe('getCTAText', () => {
    it('returns standard CTA for first request', () => {
      expect(getCTAText(1)).toBe('Create Free Account');
    });

    it('returns graduated CTA for second request', () => {
      expect(getCTAText(2)).toBe('Create Account & Track Requests');
    });
  });
});

describe('Service Request Validation', () => {
  // Required fields for service request
  const requiredFields = [
    'landlord_email',
    'first_name',
    'last_name',
    'service_type',
    'property_address',
    'zip_code',
    'job_description',
  ];

  function validateRequest(body: Record<string, unknown>): { valid: boolean; missing: string[] } {
    const missing = requiredFields.filter(field => !body[field]);
    return {
      valid: missing.length === 0,
      missing,
    };
  }

  const validBody = {
    landlord_email: 'test@example.com',
    first_name: 'John',
    last_name: 'Doe',
    service_type: 'plumber_sewer',
    property_address: '123 Main St',
    zip_code: '19103',
    job_description: 'Need a plumber',
  };

  describe('validateRequest', () => {
    it('returns valid for complete request', () => {
      const result = validateRequest(validBody);
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('returns invalid when email is missing', () => {
      const result = validateRequest({ ...validBody, landlord_email: undefined });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('landlord_email');
    });

    it('returns invalid when first_name is missing', () => {
      const result = validateRequest({ ...validBody, first_name: undefined });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('first_name');
    });

    it('returns invalid when service_type is missing', () => {
      const result = validateRequest({ ...validBody, service_type: undefined });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('service_type');
    });

    it('returns invalid when job_description is missing', () => {
      const result = validateRequest({ ...validBody, job_description: undefined });
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('job_description');
    });

    it('identifies multiple missing fields', () => {
      const result = validateRequest({
        landlord_email: 'test@example.com',
      });
      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(6);
    });
  });
});
