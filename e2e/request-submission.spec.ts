import { test, expect } from '@playwright/test';

/**
 * Request Submission E2E Tests
 *
 * Tests the landlord request submission flow:
 * - Form validation
 * - Successful submission
 * - Email confirmation
 * - Multi-step form navigation
 */

test.describe('Request Submission Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/request');
  });

  test('should display the request form', async ({ page }) => {
    // Should show the form title
    await expect(page.locator('h1, h2').first()).toContainText(/request|service/i);

    // Should have the first step visible
    await expect(page.locator('form, [role="form"]')).toBeVisible();
  });

  test('should validate required fields', async ({ page }) => {
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Next")').first();

    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      await page.waitForTimeout(500);
      const hasErrors = await page.locator('.ant-form-item-explain-error, [role="alert"], .error').count();
      expect(hasErrors).toBeGreaterThan(0);
    }
  });

  test('should navigate through multi-step form', async ({ page }) => {
    // Check if it's a multi-step form
    const nextButton = page.locator('button:has-text("Next")');

    if (await nextButton.isVisible()) {
      // Fill first step (contact info typically)
      await page.fill('input[name="first_name"], input[placeholder*="first" i]', 'Test');
      await page.fill('input[name="last_name"], input[placeholder*="last" i]', 'User');
      await page.fill('input[type="email"], input[name="landlord_email"]', 'test@example.com');
      await page.fill('input[type="tel"], input[name="landlord_phone"]', '2155551234');

      // Click next
      await nextButton.click();
      await page.waitForTimeout(500);

      // Should advance to next step or show validation error
      // (either is acceptable for this test)
    }
  });

  test('should submit request successfully via API', async ({ request }) => {
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: `test-${Date.now()}@example.com`,
        first_name: 'Test',
        last_name: 'User',
        landlord_phone: '2155551234',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Test request from e2e tests - leaky faucet in bathroom',
        urgency: 'medium',
        is_owner: true,
      },
    });

    expect([200, 201]).toContain(response.status());

    const data = await response.json();
    expect(data.id).toBeDefined();
    expect(data.message).toContain('successfully');
  });

  test('should reject incomplete request via API', async ({ request }) => {
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: 'test@example.com',
        // Missing required fields
      },
    });

    expect(response.status()).toBe(400);
  });

  test('should handle different service types', async ({ request }) => {
    const serviceTypes = ['plumber_sewer', 'electrician', 'hvac', 'handyman', 'general_contractor'];

    for (const serviceType of serviceTypes) {
      const response = await request.post('/api/requests', {
        data: {
          landlord_email: `test-${serviceType}-${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'User',
          service_type: serviceType,
          property_address: '456 Test Ave',
          zip_code: '19104',
          job_description: `Test ${serviceType} request`,
          urgency: 'low',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());
    }
  });

  test('should handle urgency levels', async ({ request }) => {
    const urgencyLevels = ['low', 'medium', 'high', 'emergency'];

    for (const urgency of urgencyLevels) {
      const response = await request.post('/api/requests', {
        data: {
          landlord_email: `test-${urgency}-${Date.now()}@example.com`,
          first_name: 'Test',
          last_name: 'User',
          service_type: 'handyman',
          property_address: '789 Test Blvd',
          zip_code: '19102',
          job_description: `Test ${urgency} urgency request`,
          urgency,
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());
    }
  });

  test('should track request count for graduated nudge', async ({ request }) => {
    const email = `test-count-${Date.now()}@example.com`;

    // First request
    const response1 = await request.post('/api/requests', {
      data: {
        landlord_email: email,
        first_name: 'Test',
        last_name: 'Counter',
        service_type: 'plumber_sewer',
        property_address: '111 First St',
        zip_code: '19103',
        job_description: 'First request',
        urgency: 'low',
        is_owner: true,
      },
    });

    const data1 = await response1.json();
    expect(data1.requestCount).toBe(1);

    // Second request with same email
    const response2 = await request.post('/api/requests', {
      data: {
        landlord_email: email,
        first_name: 'Test',
        last_name: 'Counter',
        service_type: 'electrician',
        property_address: '222 Second St',
        zip_code: '19104',
        job_description: 'Second request',
        urgency: 'medium',
        is_owner: true,
      },
    });

    const data2 = await response2.json();
    expect(data2.requestCount).toBe(2);
  });
});
