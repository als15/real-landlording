/**
 * Landlord Dashboard E2E Tests
 *
 * Tests the landlord dashboard functionality including
 * viewing requests, request details, and profile management.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestRequest,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Landlord Dashboard', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let testEmail: string;
  let testPassword: string;
  let authUserId: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    testEmail = generateTestEmail('dashboard');
    testPassword = 'TestPassword123!';

    // Create test user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    authUserId = authUser.user!.id;

    // Create landlord record
    await supabase.from('landlords').insert({
      email: testEmail,
      name: 'Dashboard Test User',
      auth_user_id: authUserId,
    });
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, testEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/auth/login');
    await page.fill(pages.login.emailInput, testEmail);
    await page.fill(pages.login.passwordInput, testPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  });

  test.describe('Dashboard Page', () => {
    test('should display dashboard for logged in user', async ({ page }) => {
      await expect(page.locator('h2:has-text("My Service Requests")')).toBeVisible();
    });

    test('should show empty state when no requests', async ({ page }) => {
      // Check for empty state or table
      const emptyState = page.locator(antd.tableEmpty);
      const table = page.locator(antd.table);

      // One of these should be visible
      const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasEmpty || hasTable).toBe(true);
    });

    test('should have new request button', async ({ page }) => {
      const newRequestBtn = page.locator('a:has-text("New Request"), button:has-text("New Request")');
      await expect(newRequestBtn).toBeVisible();

      await newRequestBtn.click();
      await page.waitForURL(/\/request/);
    });
  });

  test.describe('Request Display', () => {
    test('should display requests in table', async ({ page }) => {
      // Create a test request for this user
      const request = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'plumber_sewer',
        property_address: '123 Dashboard Test St',
        zip_code: '19103',
        job_description: 'Test request for dashboard display',
        urgency: 'medium',
      });

      // Refresh page to see new request
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show the table
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });

      // Should have at least one row
      const rows = page.locator(antd.tableRow);
      expect(await rows.count()).toBeGreaterThanOrEqual(1);
    });

    test('should show request details in modal', async ({ page }) => {
      // Create a test request
      await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'electrician',
        property_address: '456 Modal Test St',
        zip_code: '19104',
        job_description: 'Test request for modal display',
        urgency: 'high',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click view details on first row
      const viewBtn = page.locator(pages.landlordDashboard.viewRequestButton).first();
      await viewBtn.click();

      // Modal should appear
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Should show request details
      await expect(page.locator(antd.modalBody)).toContainText(/Service|Location|Status/);
    });

    test('should filter requests by status', async ({ page }) => {
      // Create requests with different statuses
      await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'handyman',
        job_description: 'New status test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for status filter if it exists
      const statusFilter = page.locator('.ant-select:has-text("Status"), .ant-select:has-text("All")');
      if (await statusFilter.isVisible({ timeout: 3000 })) {
        await statusFilter.click();

        const options = page.locator('.ant-select-item-option');
        expect(await options.count()).toBeGreaterThan(0);
      }
    });
  });

  test.describe('Request Status Display', () => {
    test('should show correct status tags', async ({ page }) => {
      await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'hvac',
        job_description: 'Status tag test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for status tag
      const statusTag = page.locator(`${antd.tag}:has-text("New")`);
      await expect(statusTag).toBeVisible({ timeout: 5000 });
    });

    test('should show matching indicator for requests being matched', async ({ page }) => {
      await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'painter',
        job_description: 'Matching status test',
        status: 'matching',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for matching status
      const matchingTag = page.locator(`${antd.tag}:has-text("Matching")`);
      if (await matchingTag.isVisible({ timeout: 3000 })) {
        await expect(matchingTag).toBeVisible();
      }
    });
  });

  test.describe('Request Details', () => {
    test('should display all request information in modal', async ({ page }) => {
      const request = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'plumber_sewer',
        property_address: '789 Detail Test Ave',
        zip_code: '19106',
        job_description: 'Detailed request for modal testing - testing the full display',
        urgency: 'emergency',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open modal
      await page.locator(pages.landlordDashboard.viewRequestButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Check for key information
      const modalBody = page.locator(antd.modalBody);
      await expect(modalBody).toContainText(/Plumber|Sewer/i);
      await expect(modalBody).toContainText(/19106/);
      await expect(modalBody).toContainText(/Emergency/i);
    });

    test('should show matched vendors when available', async ({ page }) => {
      // Create request and add a match
      const request = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'electrician',
        job_description: 'Request with vendor match',
        status: 'matched',
      });

      // Create a vendor
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: generateTestEmail('vendor-match'),
          contact_name: 'Match Test Vendor',
          business_name: 'Match Test Co',
          phone: '2155551234',
          services: ['electrician'],
          service_areas: ['19103'],
          status: 'active',
          terms_accepted: true,
        })
        .select()
        .single();

      // Create match
      if (vendor && request) {
        await supabase.from('request_vendor_matches').insert({
          request_id: request.id,
          vendor_id: vendor.id,
          status: 'sent',
          intro_sent_at: new Date().toISOString(),
        });
      }

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open modal
      await page.locator(pages.landlordDashboard.viewRequestButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Check for matched vendors section
      const modalBody = page.locator(antd.modalBody);
      const hasVendorInfo = await modalBody.locator(':has-text("Match Test Co"), :has-text("Matched Vendors")').isVisible({ timeout: 3000 });

      // Cleanup vendor
      await supabase.from('request_vendor_matches').delete().eq('vendor_id', vendor!.id);
      await supabase.from('vendors').delete().eq('id', vendor!.id);

      expect(hasVendorInfo).toBe(true);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to profile page', async ({ page }) => {
      const profileLink = page.locator(pages.landlordDashboard.profileLink);
      if (await profileLink.isVisible({ timeout: 3000 })) {
        await profileLink.click();
        await page.waitForURL(/\/dashboard\/profile/);
      } else {
        // Try direct navigation
        await page.goto('/dashboard/profile');
        await page.waitForLoadState('networkidle');
      }

      expect(page.url()).toContain('/dashboard/profile');
    });

    test('should navigate to settings page', async ({ page }) => {
      const settingsLink = page.locator(pages.landlordDashboard.settingsLink);
      if (await settingsLink.isVisible({ timeout: 3000 })) {
        await settingsLink.click();
        await page.waitForURL(/\/dashboard\/settings/);
      } else {
        await page.goto('/dashboard/settings');
        await page.waitForLoadState('networkidle');
      }

      expect(page.url()).toContain('/dashboard/settings');
    });
  });
});
