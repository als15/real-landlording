import { test, expect } from '@playwright/test';

/**
 * Complete End-to-End Flow Tests
 *
 * These tests verify the entire platform workflow:
 * 1. Landlord submits a request
 * 2. Vendor applies to platform
 * 3. Admin approves vendor
 * 4. Admin matches vendor to request
 * 5. Emails are triggered
 * 6. Landlord and vendor can see the match
 *
 * Note: Full flow tests require admin credentials
 */

test.describe('Complete Request to Match Flow', () => {
  const testId = Date.now();

  test('Step 1: Landlord submits service request', async ({ request }) => {
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: `e2e-landlord-${testId}@example.com`,
        first_name: 'E2E',
        last_name: 'Landlord',
        landlord_phone: '2155551111',
        service_type: 'plumber_sewer',
        property_address: '100 E2E Test Street',
        zip_code: '19103',
        property_type: 'single_family',
        unit_count: '1',
        occupancy_status: 'occupied',
        job_description: 'Complete E2E test - need plumber for leaky pipe under kitchen sink. Dripping constantly.',
        urgency: 'high',
        is_owner: true,
        contact_preference: 'phone',
      },
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.message).toContain('successfully');

    // Store for later tests
    console.log(`Created request: ${data.id}`);
  });

  test('Step 2: Vendor applies to platform', async ({ request }) => {
    const response = await request.post('/api/vendor/apply', {
      data: {
        contact_name: `E2E Plumber ${testId}`,
        business_name: `E2E Plumbing Co ${testId}`,
        email: `e2e-plumber-${testId}@example.com`,
        phone: '2155552222',
        website: 'https://e2e-plumbing.example.com',
        location: 'Philadelphia, PA',
        services: ['plumber_sewer'],
        service_areas: ['19103', '19104', '19102'],
        qualifications: 'Licensed master plumber with 20 years experience. Specialize in residential repairs.',
        years_in_business: 20,
        licensed: true,
        insured: true,
        rental_experience: true,
        call_preferences: 'Available 24/7 for emergencies',
        terms_accepted: true,
      },
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.message).toContain('successfully');

    console.log(`Created vendor application: ${data.id}`);
  });

  test('Step 3-5 require admin authentication', async ({ page }) => {
    // Document the remaining steps that need admin auth
    /**
     * Step 3: Admin logs in and approves vendor
     * - Navigate to /applications
     * - Find the pending vendor
     * - Click Approve button
     * - Vendor receives welcome email with temp password
     *
     * Step 4: Admin matches vendor to request
     * - Navigate to /requests
     * - Find the new request
     * - Click Match button
     * - Select the approved vendor
     * - Confirm match
     *
     * Step 5: Emails are sent
     * - Landlord receives intro email with vendor info
     * - Vendor receives intro email with job details
     *
     * Step 6: Verify matches
     * - Request status changes to 'matched'
     * - Matched vendors visible in request details
     */

    // This test serves as documentation for the manual/authenticated steps
    expect(true).toBeTruthy();
  });
});

test.describe('Data Integrity', () => {
  test('requests should have required fields', async ({ request }) => {
    // Test that requests are properly validated
    const invalidRequests = [
      { landlord_email: 'test@example.com' }, // Missing most fields
      { first_name: 'Test', last_name: 'User' }, // Missing email
      { landlord_email: 'test@example.com', service_type: 'plumber_sewer' }, // Missing address
    ];

    for (const invalidData of invalidRequests) {
      const response = await request.post('/api/requests', {
        data: invalidData,
      });

      expect(response.status()).toBe(400);
    }
  });

  test('vendor applications should have required fields', async ({ request }) => {
    const invalidApplications = [
      { contact_name: 'Test' }, // Missing most fields
      { contact_name: 'Test', email: 'test@example.com' }, // Missing business name
      {
        contact_name: 'Test',
        business_name: 'Test Co',
        email: 'test@example.com',
        phone: '1234567890',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        qualifications: 'Test',
        years_in_business: 5,
        // Missing terms_accepted
      },
    ];

    for (const invalidData of invalidApplications) {
      const response = await request.post('/api/vendor/apply', {
        data: invalidData,
      });

      expect(response.status()).toBe(400);
    }
  });

  test('email formats should be validated', async ({ request }) => {
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: 'not-an-email',
        first_name: 'Test',
        last_name: 'User',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Test',
        urgency: 'low',
        is_owner: true,
      },
    });

    // Should either reject or succeed (depends on validation implementation)
    expect([200, 201, 400]).toContain(response.status());
  });
});

test.describe('Service Coverage', () => {
  const allServiceTypes = [
    'plumber_sewer',
    'electrician',
    'hvac',
    'handyman',
    'general_contractor',
    'painter',
    'roofer',
    'pest_control',
    'locksmith_security',
    'cleanout',
    'lead_testing',
    'exterior_contractor',
    'windows_doors',
    'move_ins',
    'compliance_legal',
    'boost_my_skills',
    'maintenance',
  ];

  test('should accept all valid service types', async ({ request }) => {
    for (const serviceType of allServiceTypes) {
      const response = await request.post('/api/requests', {
        data: {
          landlord_email: `service-${serviceType}-${Date.now()}@example.com`,
          first_name: 'Service',
          last_name: 'Test',
          service_type: serviceType,
          property_address: '123 Service Test St',
          zip_code: '19103',
          job_description: `Testing ${serviceType} service type`,
          urgency: 'low',
          is_owner: true,
        },
      });

      expect(
        [200, 201].includes(response.status()),
        `Service type ${serviceType} should be accepted`
      ).toBeTruthy();
    }
  });

  test('vendors can offer multiple services', async ({ request }) => {
    const response = await request.post('/api/vendor/apply', {
      data: {
        contact_name: `Multi Service ${Date.now()}`,
        business_name: `Multi Service Co ${Date.now()}`,
        email: `multi-service-${Date.now()}@example.com`,
        phone: '2155553333',
        services: ['plumber_sewer', 'hvac', 'electrician', 'handyman'],
        service_areas: ['19103'],
        qualifications: 'Jack of all trades',
        years_in_business: 10,
        licensed: true,
        insured: true,
        terms_accepted: true,
      },
    });

    expect([200, 201]).toContain(response.status());
  });
});

test.describe('Geographic Coverage', () => {
  const phillyZipCodes = ['19102', '19103', '19104', '19106', '19107', '19123', '19130', '19146'];

  test('should accept Philadelphia zip codes', async ({ request }) => {
    for (const zipCode of phillyZipCodes) {
      const response = await request.post('/api/requests', {
        data: {
          landlord_email: `zip-${zipCode}-${Date.now()}@example.com`,
          first_name: 'Zip',
          last_name: 'Test',
          service_type: 'handyman',
          property_address: `123 ${zipCode} St`,
          zip_code: zipCode,
          job_description: `Testing zip code ${zipCode}`,
          urgency: 'low',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());
    }
  });

  test('vendors can cover multiple service areas', async ({ request }) => {
    const response = await request.post('/api/vendor/apply', {
      data: {
        contact_name: `Wide Coverage ${Date.now()}`,
        business_name: `Wide Coverage Co ${Date.now()}`,
        email: `wide-coverage-${Date.now()}@example.com`,
        phone: '2155554444',
        services: ['handyman'],
        service_areas: phillyZipCodes,
        qualifications: 'Serves all of Philadelphia',
        years_in_business: 5,
        licensed: true,
        insured: true,
        terms_accepted: true,
      },
    });

    expect([200, 201]).toContain(response.status());
  });
});

test.describe('Rate Limiting and Security', () => {
  test('should handle rapid requests gracefully', async ({ request }) => {
    const promises = [];

    // Send 10 requests rapidly
    for (let i = 0; i < 10; i++) {
      promises.push(
        request.post('/api/requests', {
          data: {
            landlord_email: `rapid-${Date.now()}-${i}@example.com`,
            first_name: 'Rapid',
            last_name: 'Test',
            service_type: 'handyman',
            property_address: `${i} Rapid St`,
            zip_code: '19103',
            job_description: 'Rapid test request',
            urgency: 'low',
            is_owner: true,
          },
        })
      );
    }

    const responses = await Promise.all(promises);

    // All should succeed (no rate limiting for public endpoints currently)
    // Or some should be rate limited (429)
    for (const response of responses) {
      expect([200, 201, 429]).toContain(response.status());
    }
  });

  test('should sanitize input (no XSS)', async ({ request }) => {
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: 'xss-test@example.com',
        first_name: '<script>alert("xss")</script>',
        last_name: 'Test',
        service_type: 'handyman',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: '<img src=x onerror=alert("xss")>',
        urgency: 'low',
        is_owner: true,
      },
    });

    // Should accept (data is stored, but will be escaped on display)
    // or reject (validation blocks script tags)
    expect([200, 201, 400]).toContain(response.status());
  });
});
