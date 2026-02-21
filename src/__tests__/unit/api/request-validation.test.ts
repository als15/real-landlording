/**
 * Tests for Service Request Validation
 *
 * Tests the validation logic for service request submissions
 */

import {
  createTestServiceRequest,
  createMockRequest,
} from '../../utils/test-helpers';

// Validation function extracted for testing
// In a real refactor, this would be in src/lib/validation/requests.ts
function validateServiceRequestInput(body: Record<string, unknown>): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Required fields
  const requiredFields = [
    'landlord_email',
    'first_name',
    'last_name',
    'landlord_phone',
    'service_type',
    'property_address',
    'zip_code',
    'job_description',
  ];

  for (const field of requiredFields) {
    if (!body[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  // Email format validation
  if (body.landlord_email && typeof body.landlord_email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.landlord_email)) {
      errors.push('Invalid email format');
    }
  }

  // Zip code format validation (Philadelphia area)
  if (body.zip_code && typeof body.zip_code === 'string') {
    const zipRegex = /^\d{5}$/;
    if (!zipRegex.test(body.zip_code)) {
      errors.push('Invalid zip code format');
    }
  }

  // Phone format validation (required field)
  if (body.landlord_phone && typeof body.landlord_phone === 'string') {
    const phoneDigits = body.landlord_phone.replace(/\D/g, '');
    if (phoneDigits.length < 10) {
      errors.push('Invalid phone number');
    }
  }

  // Urgency validation
  const validUrgencies = ['low', 'medium', 'high', 'emergency'];
  if (body.urgency && !validUrgencies.includes(body.urgency as string)) {
    errors.push('Invalid urgency level');
  }

  // Service type validation (sample list)
  const validServiceTypes = [
    'plumber_sewer',
    'electrician',
    'hvac',
    'handyman',
    'general_contractor',
    'painter',
    'roofer',
    'locksmith',
    'pest_control',
    'clean_out',
  ];
  if (body.service_type && !validServiceTypes.includes(body.service_type as string)) {
    errors.push('Invalid service type');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

describe('Service Request Validation', () => {
  describe('Required Fields', () => {
    it('should pass with all required fields', () => {
      const input = {
        landlord_email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
      };

      const result = validateServiceRequestInput(input);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail when landlord_email is missing', () => {
      const input = {
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
      };

      const result = validateServiceRequestInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: landlord_email');
    });

    it('should fail when multiple required fields are missing', () => {
      const input = {
        landlord_email: 'test@example.com',
      };

      const result = validateServiceRequestInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should fail with empty strings for required fields', () => {
      const input = {
        landlord_email: '',
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
      };

      const result = validateServiceRequestInput(input);
      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'user.name@domain.org',
        'user+tag@example.co.uk',
        'test123@test-domain.com',
      ];

      for (const email of validEmails) {
        const input = {
          landlord_email: email,
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).not.toContain('Invalid email format');
      }
    });

    it('should reject invalid email formats', () => {
      const invalidEmails = [
        'notanemail',
        '@nodomain.com',
        'no@domain',
        'spaces in@email.com',
      ];

      for (const email of invalidEmails) {
        const input = {
          landlord_email: email,
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).toContain('Invalid email format');
      }
    });
  });

  describe('Zip Code Validation', () => {
    it('should accept valid 5-digit zip codes', () => {
      const validZips = ['19103', '19104', '19102', '19121', '19146'];

      for (const zip of validZips) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: zip,
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).not.toContain('Invalid zip code format');
      }
    });

    it('should reject invalid zip codes', () => {
      const invalidZips = ['1234', '123456', 'ABCDE', '191-03'];

      for (const zip of invalidZips) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: zip,
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).toContain('Invalid zip code format');
      }
    });
  });

  describe('Phone Validation', () => {
    it('should accept valid phone numbers', () => {
      const validPhones = [
        '2155551234',
        '215-555-1234',
        '(215) 555-1234',
        '+1 215 555 1234',
      ];

      for (const phone of validPhones) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: phone,
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).not.toContain('Invalid phone number');
      }
    });

    it('should reject invalid phone numbers', () => {
      const invalidPhones = ['123', '12345', 'not-a-phone'];

      for (const phone of invalidPhones) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: phone,
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).toContain('Invalid phone number');
      }
    });

    it('should fail when phone is missing (required field)', () => {
      const input = {
        landlord_email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
      };

      const result = validateServiceRequestInput(input);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required field: landlord_phone');
    });
  });

  describe('Urgency Validation', () => {
    it('should accept valid urgency levels', () => {
      const validUrgencies = ['low', 'medium', 'high', 'emergency'];

      for (const urgency of validUrgencies) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
          urgency,
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).not.toContain('Invalid urgency level');
      }
    });

    it('should reject invalid urgency levels', () => {
      const input = {
        landlord_email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
        urgency: 'super_urgent',
      };

      const result = validateServiceRequestInput(input);
      expect(result.errors).toContain('Invalid urgency level');
    });
  });

  describe('Service Type Validation', () => {
    it('should accept valid service types', () => {
      const validTypes = ['plumber_sewer', 'electrician', 'hvac', 'handyman'];

      for (const serviceType of validTypes) {
        const input = {
          landlord_email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
          landlord_phone: '2155551234',
          service_type: serviceType,
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Fix leaky faucet',
        };

        const result = validateServiceRequestInput(input);
        expect(result.errors).not.toContain('Invalid service type');
      }
    });

    it('should reject invalid service types', () => {
      const input = {
        landlord_email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'not_a_real_service',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Fix leaky faucet',
      };

      const result = validateServiceRequestInput(input);
      expect(result.errors).toContain('Invalid service type');
    });
  });
});

describe('Test Helpers', () => {
  describe('createTestServiceRequest', () => {
    it('should create a valid service request with defaults', () => {
      const request = createTestServiceRequest();

      expect(request.id).toBeDefined();
      expect(request.landlord_email).toBe('test@example.com');
      expect(request.status).toBe('new');
    });

    it('should allow overriding defaults', () => {
      const request = createTestServiceRequest({
        landlord_email: 'custom@example.com',
        urgency: 'emergency',
      });

      expect(request.landlord_email).toBe('custom@example.com');
      expect(request.urgency).toBe('emergency');
    });
  });

  describe('createMockRequest', () => {
    it('should create a GET request by default', () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/test',
      });

      expect(request.method).toBe('GET');
    });

    it('should create a POST request with body', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/test',
        body: { test: 'data' },
      });

      expect(request.method).toBe('POST');
      const body = await request.json();
      expect(body).toEqual({ test: 'data' });
    });

    it('should include search params', () => {
      const request = createMockRequest({
        url: 'http://localhost:3000/api/test',
        searchParams: { status: 'new', limit: '10' },
      });

      expect(request.searchParams.status).toBe('new');
      expect(request.searchParams.limit).toBe('10');
    });
  });
});
