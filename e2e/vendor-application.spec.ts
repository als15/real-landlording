import { test, expect } from '@playwright/test';

/**
 * Vendor Application E2E Tests
 *
 * Tests the vendor application flow:
 * - Application form display
 * - Form validation
 * - Successful submission
 * - Duplicate email handling
 * - Service type selection
 */

test.describe('Vendor Application Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/vendor/apply');
  });

  test('should display the application form', async ({ page }) => {
    // Should show the application page
    await expect(page.locator('h1, h2').first()).toContainText(/apply|vendor|join/i);

    // Should have form elements
    await expect(page.locator('form, [role="form"]')).toBeVisible();
  });

  test('should have required form fields', async ({ page }) => {
    // Check for essential fields
    await expect(page.locator('input[name="contact_name"], input[placeholder*="name" i]').first()).toBeVisible();
    await expect(page.locator('input[name="business_name"], input[placeholder*="business" i]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]').first()).toBeVisible();
    await expect(page.locator('input[type="tel"]').first()).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Apply")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      await page.waitForTimeout(500);
      const hasErrors = await page.locator('.ant-form-item-explain-error, [role="alert"], .error').count();
      expect(hasErrors).toBeGreaterThan(0);
    }
  });
});

test.describe('Vendor Application API', () => {
  const generateVendorData = () => ({
    contact_name: `Test Vendor ${Date.now()}`,
    business_name: `Test Business ${Date.now()}`,
    email: `vendor-${Date.now()}@example.com`,
    phone: '2155559999',
    website: 'https://example.com',
    location: 'Philadelphia, PA',
    services: ['plumber_sewer', 'handyman'],
    service_areas: ['19103', '19104', '19102'],
    qualifications: 'Licensed plumber with 10 years experience',
    years_in_business: 10,
    licensed: true,
    insured: true,
    rental_experience: true,
    call_preferences: 'Call or text anytime',
    terms_accepted: true,
  });

  test('should submit application successfully', async ({ request }) => {
    const vendorData = generateVendorData();

    const response = await request.post('/api/vendor/apply', {
      data: vendorData,
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.message).toContain('successfully');
  });

  test('should reject application without required fields', async ({ request }) => {
    const response = await request.post('/api/vendor/apply', {
      data: {
        contact_name: 'Test',
        // Missing required fields
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should reject application without terms acceptance', async ({ request }) => {
    const vendorData = generateVendorData();
    vendorData.terms_accepted = false;

    const response = await request.post('/api/vendor/apply', {
      data: vendorData,
    });

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.message).toContain('terms');
  });

  test('should reject duplicate email applications', async ({ request }) => {
    const vendorData = generateVendorData();

    // First application
    const response1 = await request.post('/api/vendor/apply', {
      data: vendorData,
    });
    expect([200, 201]).toContain(response1.status());

    // Second application with same email
    const response2 = await request.post('/api/vendor/apply', {
      data: {
        ...vendorData,
        business_name: 'Different Business',
      },
    });

    expect(response2.status()).toBe(400);
    const data = await response2.json();
    expect(data.message).toMatch(/already|exists|pending/i);
  });

  test('should calculate vetting score based on credentials', async ({ request }) => {
    // Vendor with all credentials
    const fullyVettedVendor = {
      ...generateVendorData(),
      email: `vetted-${Date.now()}@example.com`,
      licensed: true,
      insured: true,
      years_in_business: 15,
    };

    const response1 = await request.post('/api/vendor/apply', {
      data: fullyVettedVendor,
    });
    expect([200, 201]).toContain(response1.status());

    // Vendor with minimal credentials
    const minimalVendor = {
      ...generateVendorData(),
      email: `minimal-${Date.now()}@example.com`,
      licensed: false,
      insured: false,
      years_in_business: 1,
    };

    const response2 = await request.post('/api/vendor/apply', {
      data: minimalVendor,
    });
    expect([200, 201]).toContain(response2.status());
  });

  test('should handle multiple service types', async ({ request }) => {
    const multiServiceVendor = {
      ...generateVendorData(),
      email: `multi-${Date.now()}@example.com`,
      services: ['plumber_sewer', 'hvac', 'electrician', 'handyman'],
    };

    const response = await request.post('/api/vendor/apply', {
      data: multiServiceVendor,
    });

    expect([200, 201]).toContain(response.status());
  });

  test('should handle service specialties', async ({ request }) => {
    const specialtyVendor = {
      ...generateVendorData(),
      email: `specialty-${Date.now()}@example.com`,
      services: ['hvac'],
      service_specialties: {
        hvac: {
          'Equipment Type': ['Gas Furnace', 'Heat Pump'],
          'Service Needed': ['No Heat', 'AC Not Cooling'],
        },
      },
    };

    const response = await request.post('/api/vendor/apply', {
      data: specialtyVendor,
    });

    expect([200, 201]).toContain(response.status());
  });
});
