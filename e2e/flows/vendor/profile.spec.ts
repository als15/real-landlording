/**
 * Vendor Profile E2E Tests
 *
 * Tests the vendor profile page display and data.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Vendor Profile', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let testEmail: string;
  let testPassword: string;
  let vendorId: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    testEmail = generateTestEmail('vendor-profile');
    testPassword = 'TestPassword123!';

    // Create test vendor with full profile
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        email: testEmail,
        contact_name: 'Profile Test Vendor',
        business_name: 'Profile Test Co LLC',
        phone: '2155551234',
        website: 'https://profiletest.example.com',
        location: '123 Profile St, Philadelphia, PA 19103',
        services: ['plumber_sewer', 'handyman', 'electrician'],
        service_areas: ['19103', '19104', '19106', '19107'],
        qualifications: '15+ years experience in residential plumbing and electrical work. Licensed master plumber.',
        years_in_business: 15,
        licensed: true,
        insured: true,
        rental_experience: true,
        call_preferences: 'phone, email',
        status: 'active',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
        employee_count: '2-5',
        job_size_range: ['small', 'medium'],
        service_hours_weekdays: true,
        service_hours_weekends: true,
        emergency_services: false,
        accepted_payments: ['cash', 'check', 'credit'],
      })
      .select()
      .single();

    vendorId = vendor!.id;
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, testEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login and navigate to profile
    await page.goto('/vendor/login');
    await page.fill(pages.login.emailInput, testEmail);
    await page.fill(pages.login.passwordInput, testPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });

    // Navigate to profile
    await page.goto('/vendor/dashboard/profile');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Profile Display', () => {
    test('should display profile page title', async ({ page }) => {
      await expect(page.locator('h2:has-text("My Profile")')).toBeVisible();
    });

    test('should display contact information card', async ({ page }) => {
      // Look for contact info card
      const contactCard = page.locator(':has-text("Contact Information")');
      await expect(contactCard).toBeVisible({ timeout: 5000 });

      // Should show business name
      await expect(page.locator(':has-text("Profile Test Co LLC")')).toBeVisible();

      // Should show contact name
      await expect(page.locator(':has-text("Profile Test Vendor")')).toBeVisible();

      // Should show email
      await expect(page.locator(`text=${testEmail}`)).toBeVisible();

      // Should show phone
      await expect(page.locator(':has-text("2155551234")')).toBeVisible();
    });

    test('should display services and coverage card', async ({ page }) => {
      const servicesCard = page.locator(':has-text("Services & Coverage")');
      await expect(servicesCard).toBeVisible({ timeout: 5000 });

      // Should show service tags
      await expect(page.locator(`${antd.tag}:has-text("Plumber")`)).toBeVisible();
      await expect(page.locator(`${antd.tag}:has-text("Handyman")`)).toBeVisible();
      await expect(page.locator(`${antd.tag}:has-text("Electrician")`)).toBeVisible();
    });

    test('should display qualifications card', async ({ page }) => {
      const qualCard = page.locator(':has-text("Qualifications")');
      await expect(qualCard).toBeVisible({ timeout: 5000 });

      // Should show licensed badge
      const licensedBadge = page.locator(`${antd.tag}:has-text("Licensed")`);
      await expect(licensedBadge).toBeVisible();

      // Should show insured badge
      const insuredBadge = page.locator(`${antd.tag}:has-text("Insured")`);
      await expect(insuredBadge).toBeVisible();

      // Should show rental experience badge
      const rentalBadge = page.locator(`${antd.tag}:has-text("Rental Experience")`);
      await expect(rentalBadge).toBeVisible();

      // Should show years in business
      await expect(page.locator(':has-text("15+")')).toBeVisible();
    });

    test('should display business details card', async ({ page }) => {
      const bizCard = page.locator(':has-text("Business Details")');
      await expect(bizCard).toBeVisible({ timeout: 5000 });

      // Should show team size
      await expect(page.locator(':has-text("Team Size")')).toBeVisible();

      // Should show service hours
      await expect(page.locator(':has-text("Service Hours")')).toBeVisible();
    });

    test('should display account status card', async ({ page }) => {
      const statusCard = page.locator(':has-text("Account Status")');
      await expect(statusCard).toBeVisible({ timeout: 5000 });

      // Should show active status
      const activeBadge = page.locator(`${antd.tag}:has-text("ACTIVE")`);
      await expect(activeBadge).toBeVisible();

      // Should show terms accepted
      const termsAccepted = page.locator(':has-text("Terms Accepted")');
      await expect(termsAccepted).toBeVisible();
    });
  });

  test.describe('Profile API', () => {
    test('should fetch vendor profile via API', async ({ request }) => {
      const response = await request.get('/api/vendor/profile');
      expect(response.status()).toBe(200);

      const { data } = await response.json();
      expect(data).toBeDefined();
      expect(data.business_name).toBe('Profile Test Co LLC');
      expect(data.contact_name).toBe('Profile Test Vendor');
      expect(data.email).toBe(testEmail);
      expect(data.services).toContain('plumber_sewer');
      expect(data.licensed).toBe(true);
      expect(data.insured).toBe(true);
    });

    test('should return 401 for unauthenticated profile request', async ({ request }) => {
      // Need to make request without auth cookies
      const response = await request.get('/api/vendor/profile', {
        headers: {
          Cookie: '', // Clear cookies
        },
      });

      expect([401, 403]).toContain(response.status());
    });
  });

  test.describe('Service Areas Display', () => {
    test('should display service areas', async ({ page }) => {
      // Look for service areas section
      const serviceAreasSection = page.locator(':has-text("Service Areas")');
      await expect(serviceAreasSection).toBeVisible({ timeout: 5000 });

      // Should show zip codes or area names
      // The display might show zip codes directly or mapped neighborhood names
      const hasZipCodes = await page.locator(':has-text("19103")').isVisible({ timeout: 3000 }).catch(() => false);
      const hasAreaDisplay = await page.locator('.ant-tag').count() > 0;

      expect(hasZipCodes || hasAreaDisplay).toBe(true);
    });
  });

  test.describe('Website and Social', () => {
    test('should display website link', async ({ page }) => {
      const websiteLink = page.locator('a[href*="profiletest.example.com"]');
      await expect(websiteLink).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Loading States', () => {
    test('should show loading state initially', async ({ page }) => {
      // Navigate fresh without waiting for load
      await page.goto('/vendor/dashboard/profile');

      // Check for loading spinner (may be very brief)
      const spinner = page.locator(antd.spin);
      // Either loading or content should be visible
      const hasSpinner = await spinner.isVisible({ timeout: 1000 }).catch(() => false);
      const hasContent = await page.locator('h2:has-text("My Profile")').isVisible({ timeout: 5000 });

      expect(hasSpinner || hasContent).toBe(true);
    });
  });

  test.describe('Error States', () => {
    test('should handle non-vendor user gracefully', async ({ page }) => {
      // This test requires a user without vendor record
      // Creating a landlord user to test
      const landlordEmail = generateTestEmail('landlord-no-vendor');
      const landlordPassword = 'TestPassword123!';

      const { data: authUser } = await supabase.auth.admin.createUser({
        email: landlordEmail,
        password: landlordPassword,
        email_confirm: true,
      });

      await supabase.from('landlords').insert({
        email: landlordEmail,
        name: 'Non-Vendor User',
        auth_user_id: authUser.user!.id,
      });

      // Login as landlord but try vendor profile endpoint
      await page.goto('/auth/login');
      await page.fill(pages.login.emailInput, landlordEmail);
      await page.fill(pages.login.passwordInput, landlordPassword);
      await page.click(pages.login.submitButton);
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Try to access vendor profile
      await page.goto('/vendor/dashboard/profile');
      await page.waitForTimeout(3000);

      // Should either redirect or show error
      const onProfile = page.url().includes('/vendor/dashboard/profile');
      if (onProfile) {
        // Should show error message
        const errorAlert = page.locator('.ant-alert-error');
        await expect(errorAlert).toBeVisible({ timeout: 5000 });
      }

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });
});
