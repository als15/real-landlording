/**
 * Vendor Application E2E Tests
 *
 * Tests the multi-step vendor application form that service providers
 * use to apply to join the platform.
 */

import { test, expect } from '@playwright/test';
import { generateVendorApplicationData, generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import { getSupabaseAdmin, cleanupByEmail } from '../../fixtures/database.fixture';
import { maybeVerifyEmailSent } from '../../fixtures/email.fixture';

test.describe('Vendor Application', () => {
  test.describe('Form Display', () => {
    test('should display the vendor application form', async ({ page }) => {
      await page.goto('/vendor/apply');
      await page.waitForLoadState('networkidle');

      // Should show the form
      await expect(page.locator('form, [data-testid="vendor-application-form"]')).toBeVisible();

      // Should have contact fields
      await expect(page.locator(pages.vendorApplication.contactName)).toBeVisible();
      await expect(page.locator(pages.vendorApplication.businessName)).toBeVisible();
    });

    test('should link to vendor terms', async ({ page }) => {
      await page.goto('/vendor/apply');
      await page.waitForLoadState('networkidle');

      // Navigate to terms step
      const data = generateVendorApplicationData();
      await page.fill(pages.vendorApplication.contactName, data.contact_name);
      await page.fill(pages.vendorApplication.businessName, data.business_name);
      await page.fill(pages.vendorApplication.email, data.email);
      await page.fill(pages.vendorApplication.phone, data.phone);

      // Navigate through steps to find terms
      let foundTerms = false;
      for (let i = 0; i < 5; i++) {
        const termsLink = page.locator('a:has-text("terms"), a[href*="terms"]');
        if (await termsLink.isVisible({ timeout: 1000 })) {
          foundTerms = true;
          break;
        }

        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      }

      // Terms link should exist somewhere in the form
      expect(foundTerms).toBe(true);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate required contact fields', async ({ page }) => {
      await page.goto('/vendor/apply');
      await page.waitForLoadState('networkidle');

      // Try to proceed without filling fields
      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      // Should show validation errors
      await expect(page.locator(antd.formError)).toBeVisible({ timeout: 3000 });
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/vendor/apply');

      await page.fill(pages.vendorApplication.contactName, 'Test Vendor');
      await page.fill(pages.vendorApplication.businessName, 'Test Business');
      await page.fill(pages.vendorApplication.email, 'invalid-email');
      await page.fill(pages.vendorApplication.phone, '2155551234');

      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      // Should show email validation error
      const errorText = await page.locator(antd.formError).first().textContent();
      expect(errorText?.toLowerCase()).toMatch(/email|invalid/);
    });

    test('should require terms acceptance', async ({ page }) => {
      await page.goto('/vendor/apply');
      const data = generateVendorApplicationData({ terms_accepted: false });

      // Fill all steps but don't accept terms
      await page.fill(pages.vendorApplication.contactName, data.contact_name);
      await page.fill(pages.vendorApplication.businessName, data.business_name);
      await page.fill(pages.vendorApplication.email, data.email);
      await page.fill(pages.vendorApplication.phone, data.phone);

      // Navigate through form
      for (let i = 0; i < 5; i++) {
        const nextBtn = page.locator('button:has-text("Next")');
        if (await nextBtn.isVisible({ timeout: 1000 })) {
          await nextBtn.click();
          await page.waitForTimeout(500);
        } else {
          break;
        }
      }

      // Try to submit without terms
      const submitBtn = page.locator(pages.vendorApplication.submitButton);
      if (await submitBtn.isVisible()) {
        await submitBtn.click();

        // Should show terms validation error or prevent submission
        const termsError = page.locator(':has-text("terms"), :has-text("accept")');
        await expect(termsError).toBeVisible({ timeout: 3000 });
      }
    });
  });

  test.describe('Successful Submission', () => {
    test('should submit application successfully via API', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-api');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'API Test Vendor',
          business_name: 'API Test Business',
          email: testEmail,
          phone: '2155551234',
          services: ['plumber_sewer'],
          service_areas: ['19103'],
          qualifications: 'Licensed plumber with 10 years experience',
          years_in_business: 10,
          licensed: true,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      const data = await response.json();
      expect(data.id).toBeDefined();

      // Verify vendor was created with pending_review status
      const { data: vendor } = await supabase
        .from('vendors')
        .select('status')
        .eq('email', testEmail)
        .single();

      expect(vendor?.status).toBe('pending_review');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should send confirmation email after application', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-email');
      const beforeSubmit = new Date();

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Email Test Vendor',
          business_name: 'Email Test Business',
          email: testEmail,
          phone: '2155551234',
          services: ['electrician'],
          service_areas: ['19103', '19104'],
          qualifications: 'Licensed electrician',
          years_in_business: 5,
          licensed: true,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify confirmation email
      await maybeVerifyEmailSent(testEmail, 'application', {
        timeout: 20000,
        since: beforeSubmit,
      });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should prevent duplicate applications', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-dup');

      // First application
      const response1 = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'First Application',
          business_name: 'First Business',
          email: testEmail,
          phone: '2155551234',
          services: ['handyman'],
          service_areas: ['19103'],
          qualifications: 'Experienced handyman',
          years_in_business: 3,
          licensed: false,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response1.status());

      // Second application with same email
      const response2 = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Second Application',
          business_name: 'Second Business',
          email: testEmail,
          phone: '2155559999',
          services: ['painter'],
          service_areas: ['19104'],
          qualifications: 'Experienced painter',
          years_in_business: 5,
          licensed: false,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      // Should be rejected or return error
      expect([400, 409, 422]).toContain(response2.status());

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Multiple Services', () => {
    test('should accept vendors with multiple services', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-multi');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Multi Service Vendor',
          business_name: 'Multi Service Co',
          email: testEmail,
          phone: '2155551234',
          services: ['plumber_sewer', 'hvac', 'electrician', 'handyman'],
          service_areas: ['19103', '19104', '19102', '19106'],
          qualifications: 'Jack of all trades with multiple licenses',
          years_in_business: 15,
          licensed: true,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify all services were saved
      const { data: vendor } = await supabase
        .from('vendors')
        .select('services')
        .eq('email', testEmail)
        .single();

      expect(vendor?.services).toContain('plumber_sewer');
      expect(vendor?.services).toContain('hvac');
      expect(vendor?.services.length).toBeGreaterThanOrEqual(4);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Service Areas', () => {
    test('should accept multiple service areas', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-areas');
      const phillyZips = ['19102', '19103', '19104', '19106', '19107', '19123', '19130', '19146'];

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Wide Coverage Vendor',
          business_name: 'Wide Coverage Co',
          email: testEmail,
          phone: '2155551234',
          services: ['handyman'],
          service_areas: phillyZips,
          qualifications: 'Serves all of Philadelphia',
          years_in_business: 8,
          licensed: false,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify all areas were saved
      const { data: vendor } = await supabase
        .from('vendors')
        .select('service_areas')
        .eq('email', testEmail)
        .single();

      expect(vendor?.service_areas.length).toBe(phillyZips.length);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Validation Rules', () => {
    test('should reject application without services', async ({ request }) => {
      const testEmail = generateTestEmail('vendor-noservice');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'No Service Vendor',
          business_name: 'No Service Co',
          email: testEmail,
          phone: '2155551234',
          services: [], // Empty services
          service_areas: ['19103'],
          qualifications: 'No services offered',
          years_in_business: 1,
          licensed: false,
          insured: false,
          terms_accepted: true,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject application without service areas', async ({ request }) => {
      const testEmail = generateTestEmail('vendor-noarea');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'No Area Vendor',
          business_name: 'No Area Co',
          email: testEmail,
          phone: '2155551234',
          services: ['handyman'],
          service_areas: [], // Empty areas
          qualifications: 'No areas served',
          years_in_business: 1,
          licensed: false,
          insured: false,
          terms_accepted: true,
        },
      });

      expect(response.status()).toBe(400);
    });

    test('should reject application without terms acceptance', async ({ request }) => {
      const testEmail = generateTestEmail('vendor-noterms');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'No Terms Vendor',
          business_name: 'No Terms Co',
          email: testEmail,
          phone: '2155551234',
          services: ['handyman'],
          service_areas: ['19103'],
          qualifications: 'Refuses to accept terms',
          years_in_business: 1,
          licensed: false,
          insured: false,
          terms_accepted: false, // Not accepted
        },
      });

      expect(response.status()).toBe(400);
    });
  });

  test.describe('Vendor Status', () => {
    test('new vendor should have pending_review status', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-status');

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Status Test Vendor',
          business_name: 'Status Test Co',
          email: testEmail,
          phone: '2155551234',
          services: ['painter'],
          service_areas: ['19103'],
          qualifications: 'Testing vendor status',
          years_in_business: 2,
          licensed: false,
          insured: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Check status
      const { data: vendor } = await supabase
        .from('vendors')
        .select('status, auth_user_id')
        .eq('email', testEmail)
        .single();

      expect(vendor?.status).toBe('pending_review');
      // Should not have auth user until approved
      expect(vendor?.auth_user_id).toBeNull();

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('pending vendor cannot login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-login');

      // Create pending vendor via API
      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Pending Vendor',
        business_name: 'Pending Co',
        phone: '2155551234',
        services: ['handyman'],
        service_areas: ['19103'],
        qualifications: 'Pending vendor',
        status: 'pending_review',
        terms_accepted: true,
      });

      // Try to login
      await page.goto('/vendor/login');
      await page.fill('input[type="email"], input[name="email"]', testEmail);
      await page.fill('input[type="password"], input[name="password"]', 'anypassword');
      await page.click('button[type="submit"]');

      // Should fail - either error message or stay on login page
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toMatch(/\/vendor\/login/);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });
});
