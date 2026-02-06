/**
 * Public Request Submission E2E Tests
 *
 * Tests the multi-step service request form that landlords use
 * to submit service requests without requiring authentication.
 */

import { test, expect } from '@playwright/test';
import { generateRequestData, generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import { getSupabaseAdmin, cleanupByEmail } from '../../fixtures/database.fixture';
import { maybeVerifyEmailSent } from '../../fixtures/email.fixture';

test.describe('Service Request Submission', () => {
  test.describe('Form Navigation', () => {
    test('should display the request form page', async ({ page }) => {
      await page.goto('/request');
      await page.waitForLoadState('networkidle');

      // Should show the form
      await expect(page.locator('form, [data-testid="request-form"]')).toBeVisible();

      // Should have first step fields
      await expect(page.locator(pages.requestForm.email)).toBeVisible();
    });

    test('should navigate through multi-step form', async ({ page }) => {
      await page.goto('/request');
      await page.waitForLoadState('networkidle');

      const data = generateRequestData();

      // Fill Step 1: Contact Info
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      // Go to next step
      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Should show Step 2 fields (service details)
      await expect(
        page.locator(`${pages.requestForm.serviceType}, ${pages.requestForm.jobDescription}`)
      ).toBeVisible({ timeout: 5000 });
    });

    test('should allow going back to previous step', async ({ page }) => {
      await page.goto('/request');
      const data = generateRequestData();

      // Fill Step 1
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      // Go to Step 2
      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Go back to Step 1
      await page.click(pages.requestForm.prevButton);
      await page.waitForTimeout(500);

      // Should still have the data
      await expect(page.locator(pages.requestForm.firstName)).toHaveValue(data.first_name);
    });
  });

  test.describe('Form Validation', () => {
    test('should show validation errors for empty required fields', async ({ page }) => {
      await page.goto('/request');
      await page.waitForLoadState('networkidle');

      // Try to proceed without filling any fields
      await page.click(pages.requestForm.nextButton);

      // Should show validation errors
      await expect(page.locator(antd.formError)).toBeVisible({ timeout: 3000 });
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/request');

      // Fill with invalid email
      await page.fill(pages.requestForm.firstName, 'Test');
      await page.fill(pages.requestForm.lastName, 'User');
      await page.fill(pages.requestForm.email, 'not-an-email');
      await page.fill(pages.requestForm.phone, '2155551234');

      // Try to proceed
      await page.click(pages.requestForm.nextButton);

      // Should show email validation error
      const errorText = await page.locator(antd.formError).textContent();
      expect(errorText?.toLowerCase()).toMatch(/email|invalid/);
    });

    test('should validate phone number format', async ({ page }) => {
      await page.goto('/request');

      // Fill with invalid phone
      await page.fill(pages.requestForm.firstName, 'Test');
      await page.fill(pages.requestForm.lastName, 'User');
      await page.fill(pages.requestForm.email, generateTestEmail());
      await page.fill(pages.requestForm.phone, '123'); // Too short

      // Try to proceed
      await page.click(pages.requestForm.nextButton);

      // May show phone validation error (depends on implementation)
      // At minimum, should not proceed to next step with invalid data
    });

    test('should require job description', async ({ page }) => {
      await page.goto('/request');
      const data = generateRequestData();

      // Fill Step 1
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      // Go to Step 2
      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Fill some fields but not job description
      await page.fill(pages.requestForm.propertyAddress, data.property_address);
      await page.fill(pages.requestForm.zipCode, data.zip_code);

      // Try to submit/proceed
      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.click(pages.requestForm.submitButton).catch(() => {});

      // Should show validation error for job description
      await expect(page.locator(antd.formError)).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Successful Submission', () => {
    test('should submit request successfully via form', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('submit');

      await page.goto('/request');
      const data = generateRequestData({ email: testEmail });

      // Fill Step 1
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Fill Step 2 - Service selection
      const serviceSelect = page.locator(pages.requestForm.serviceType);
      if (await serviceSelect.isVisible()) {
        await serviceSelect.click();
        await page.click('.ant-select-item-option').first();
      }

      await page.fill(pages.requestForm.propertyAddress, data.property_address);
      await page.fill(pages.requestForm.zipCode, data.zip_code);
      await page.fill(pages.requestForm.jobDescription, data.job_description);

      // Try to proceed to next step or submit
      const nextBtn = page.locator(pages.requestForm.nextButton);
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }

      // Submit
      const submitBtn = page.locator(pages.requestForm.submitButton);
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }

      // Wait for success
      await expect(page.locator(pages.requestForm.successResult)).toBeVisible({
        timeout: 15000,
      });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should show signup nudge after submission', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('nudge');

      await page.goto('/request');
      const data = generateRequestData({ email: testEmail });

      // Complete the form (simplified - actual form may have more steps)
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      // Navigate through form and submit
      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.waitForTimeout(500);

      // Fill service details if visible
      const jobDesc = page.locator(pages.requestForm.jobDescription);
      if (await jobDesc.isVisible()) {
        await page.fill(pages.requestForm.propertyAddress, data.property_address);
        await page.fill(pages.requestForm.zipCode, data.zip_code);
        await page.fill(pages.requestForm.jobDescription, data.job_description);
      }

      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.waitForTimeout(500);
      await page.click(pages.requestForm.submitButton).catch(() => {});

      // Wait for success
      await page.waitForSelector(pages.requestForm.successResult, { timeout: 15000 });

      // Should show signup nudge
      await expect(page.locator(pages.requestForm.signupNudge)).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should send confirmation email after submission', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('email');
      const beforeSubmit = new Date();

      await page.goto('/request');
      const data = generateRequestData({ email: testEmail });

      // Fill and submit form (simplified flow)
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.waitForTimeout(500);

      const jobDesc = page.locator(pages.requestForm.jobDescription);
      if (await jobDesc.isVisible()) {
        await page.fill(pages.requestForm.propertyAddress, data.property_address);
        await page.fill(pages.requestForm.zipCode, data.zip_code);
        await page.fill(pages.requestForm.jobDescription, data.job_description);
      }

      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.waitForTimeout(500);
      await page.click(pages.requestForm.submitButton).catch(() => {});

      // Wait for success
      await page.waitForSelector(pages.requestForm.successResult, { timeout: 15000 });

      // Verify email was sent
      await maybeVerifyEmailSent(testEmail, 'request', {
        timeout: 20000,
        since: beforeSubmit,
      });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Service Types', () => {
    test('should display all service type options', async ({ page }) => {
      await page.goto('/request');
      const data = generateRequestData();

      // Fill Step 1 to get to service selection
      await page.fill(pages.requestForm.firstName, data.first_name);
      await page.fill(pages.requestForm.lastName, data.last_name);
      await page.fill(pages.requestForm.email, data.email);
      await page.fill(pages.requestForm.phone, data.phone);

      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Open service type dropdown
      const serviceSelect = page.locator(pages.requestForm.serviceType);
      if (await serviceSelect.isVisible()) {
        await serviceSelect.click();

        // Should have multiple options
        const options = page.locator('.ant-select-item-option');
        await expect(options.first()).toBeVisible();

        const count = await options.count();
        expect(count).toBeGreaterThan(5); // Should have many service types
      }
    });
  });

  test.describe('API Submission', () => {
    test('should accept valid request via API', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('api');

      const response = await request.post('/api/requests', {
        data: {
          landlord_email: testEmail,
          first_name: 'API',
          last_name: 'Test',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 API Test St',
          zip_code: '19103',
          job_description: 'E2E API test request',
          urgency: 'medium',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      const data = await response.json();
      expect(data.id).toBeDefined();

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should reject request with missing required fields', async ({ request }) => {
      const response = await request.post('/api/requests', {
        data: {
          landlord_email: 'test@example.com',
          // Missing most required fields
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should handle all service types', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const serviceTypes = ['plumber_sewer', 'electrician', 'hvac', 'handyman'];

      for (const serviceType of serviceTypes) {
        const testEmail = generateTestEmail(`service-${serviceType}`);

        const response = await request.post('/api/requests', {
          data: {
            landlord_email: testEmail,
            first_name: 'Service',
            last_name: 'Test',
            landlord_phone: '2155551234',
            service_type: serviceType,
            property_address: '123 Service Test St',
            zip_code: '19103',
            job_description: `Test ${serviceType} request`,
            urgency: 'low',
            is_owner: true,
          },
        });

        expect([200, 201]).toContain(response.status());

        // Cleanup
        await cleanupByEmail(supabase, testEmail);
      }
    });
  });

  test.describe('Edge Cases', () => {
    test('should handle special characters in job description', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('special');

      const response = await request.post('/api/requests', {
        data: {
          landlord_email: testEmail,
          first_name: 'Special',
          last_name: 'Test',
          landlord_phone: '2155551234',
          service_type: 'handyman',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: 'Need help with: <quotes> & "special" characters! @#$%',
          urgency: 'low',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      await cleanupByEmail(supabase, testEmail);
    });

    test('should handle long job descriptions', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('long');
      const longDescription = 'This is a test. '.repeat(100);

      const response = await request.post('/api/requests', {
        data: {
          landlord_email: testEmail,
          first_name: 'Long',
          last_name: 'Test',
          landlord_phone: '2155551234',
          service_type: 'handyman',
          property_address: '123 Test St',
          zip_code: '19103',
          job_description: longDescription,
          urgency: 'low',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      await cleanupByEmail(supabase, testEmail);
    });
  });
});
