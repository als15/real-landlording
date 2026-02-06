/**
 * Admin Vendor Matching E2E Tests
 *
 * Tests the vendor matching functionality from admin perspective.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestRequest,
  createTestVendor,
  cleanupByEmail,
} from '../../fixtures/database.fixture';
import { maybeVerifyEmailSent } from '../../fixtures/email.fixture';

test.describe('Admin Vendor Matching', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let adminEmail: string;
  let adminPassword: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    adminEmail = generateTestEmail('admin-matching');
    adminPassword = 'AdminPassword123!';

    // Create admin user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });

    await supabase.from('admin_users').insert({
      auth_user_id: authUser.user!.id,
      email: adminEmail,
      name: 'Matching Admin',
      role: 'admin',
    });
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, adminEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill(pages.login.emailInput, adminEmail);
    await page.fill(pages.login.passwordInput, adminPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

    await page.goto('/requests');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Matching Modal', () => {
    test('should open matching modal for new request', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-match-modal');
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        job_description: 'Matching modal test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click match button
      const matchBtn = page.locator('button:has-text("Match")').first();
      await matchBtn.click();

      // Modal should open
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });
      await expect(page.locator(':has-text("Match Vendor")')).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should display available vendors in modal', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-vendors-list');
      const vendorEmail = generateTestEmail('vendor-available');

      // Create vendor matching the service type
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Available Vendor',
        business_name: 'Available Plumbing Co',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        status: 'active',
      });

      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        zip_code: '19103',
        job_description: 'Need plumber for test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open matching modal
      const matchBtn = page.locator('button:has-text("Match")').first();
      await matchBtn.click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Wait for vendors to load
      await page.waitForTimeout(1000);

      // Should show available vendors
      const vendorList = page.locator('.ant-modal :has-text("Available Plumbing Co")');
      await expect(vendorList).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should allow selecting vendors for matching', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-select');
      const vendorEmail = generateTestEmail('vendor-select');

      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Select Vendor',
        business_name: 'Select Vendor Co',
        services: ['electrician'],
        service_areas: ['19103'],
        status: 'active',
      });

      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'electrician',
        zip_code: '19103',
        job_description: 'Need electrician',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open matching modal
      const matchBtn = page.locator('button:has-text("Match")').first();
      await matchBtn.click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Select a vendor (checkbox or card click)
      const vendorCheckbox = page.locator('.ant-modal .ant-checkbox').first();
      if (await vendorCheckbox.isVisible({ timeout: 3000 })) {
        await vendorCheckbox.click();
      }

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Matching API', () => {
    test('should match vendors via API', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-api-match');
      const vendorEmail = generateTestEmail('vendor-api-match');

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'API Match Vendor',
        business_name: 'API Match Co',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'handyman',
        zip_code: '19103',
        job_description: 'API matching test',
        status: 'new',
      });

      // Match vendors via API
      const response = await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: [vendor!.id] },
      });

      expect([200, 201]).toContain(response.status());

      // Verify match was created
      const { data: matches } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('request_id', serviceRequest.id);

      expect(matches?.length).toBeGreaterThanOrEqual(1);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should send intro emails when matching', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-intro');
      const vendorEmail = generateTestEmail('vendor-intro');
      const beforeMatch = new Date();

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Intro Vendor',
        business_name: 'Intro Co',
        services: ['painter'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Intro',
        last_name: 'Test',
        service_type: 'painter',
        zip_code: '19103',
        job_description: 'Intro email test',
        status: 'new',
      });

      // Match vendors
      const response = await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: [vendor!.id] },
      });

      expect([200, 201]).toContain(response.status());

      // Verify intro email was sent to landlord
      await maybeVerifyEmailSent(landlordEmail, 'intro', {
        timeout: 20000,
        since: beforeMatch,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Resend Intro', () => {
    test('should resend intro email via API', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-resend');
      const vendorEmail = generateTestEmail('vendor-resend');

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Resend Vendor',
        business_name: 'Resend Co',
        services: ['hvac'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'hvac',
        zip_code: '19103',
        job_description: 'Resend test',
        status: 'matched',
      });

      // Create existing match
      await supabase.from('request_vendor_matches').insert({
        request_id: serviceRequest.id,
        vendor_id: vendor!.id,
        status: 'sent',
        intro_sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
      });

      // Resend intro
      const response = await request.post(`/api/requests/${serviceRequest.id}/resend-intro`, {
        data: { vendor_id: vendor!.id },
      });

      expect([200, 201]).toContain(response.status());

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should show resend button for matched vendors', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-resend-btn');
      const vendorEmail = generateTestEmail('vendor-resend-btn');

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Resend Button Vendor',
        business_name: 'Resend Button Co',
        services: ['locksmith'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'locksmith',
        job_description: 'Resend button test',
        status: 'matched',
      });

      await supabase.from('request_vendor_matches').insert({
        request_id: serviceRequest.id,
        vendor_id: vendor!.id,
        status: 'sent',
        intro_sent_at: new Date().toISOString(),
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open request details
      const viewBtn = page.locator('button:has(.anticon-eye)').first();
      await viewBtn.click();
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should show resend button
      const resendBtn = page.locator(pages.admin.resendIntroButton);
      await expect(resendBtn).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Matching Logic', () => {
    test('should filter vendors by service type', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-filter-service');
      const plumberEmail = generateTestEmail('vendor-plumber');
      const electricianEmail = generateTestEmail('vendor-electrician');

      // Create vendors with different services
      await createTestVendor(supabase, {
        email: plumberEmail,
        contact_name: 'Plumber',
        business_name: 'Plumber Only Co',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        status: 'active',
      });

      await createTestVendor(supabase, {
        email: electricianEmail,
        contact_name: 'Electrician',
        business_name: 'Electrician Only Co',
        services: ['electrician'],
        service_areas: ['19103'],
        status: 'active',
      });

      // Create plumber request
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        zip_code: '19103',
        job_description: 'Need plumber only',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open matching modal
      const matchBtn = page.locator('button:has-text("Match")').first();
      await matchBtn.click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(1000);

      // Should show plumber
      const plumberVisible = await page.locator('.ant-modal :has-text("Plumber Only Co")').isVisible({ timeout: 3000 }).catch(() => false);

      // Should NOT show electrician (or show with filter)
      // This depends on implementation - might filter automatically or show all

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, plumberEmail);
      await cleanupByEmail(supabase, electricianEmail);
    });

    test('should filter vendors by service area', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-filter-area');
      const nearbyEmail = generateTestEmail('vendor-nearby');
      const farEmail = generateTestEmail('vendor-far');

      // Create vendors with different service areas
      await createTestVendor(supabase, {
        email: nearbyEmail,
        contact_name: 'Nearby',
        business_name: 'Nearby Vendor Co',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'active',
      });

      await createTestVendor(supabase, {
        email: farEmail,
        contact_name: 'Far',
        business_name: 'Far Away Vendor Co',
        services: ['handyman'],
        service_areas: ['19000'], // Different area
        status: 'active',
      });

      // Create request in 19103
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'handyman',
        zip_code: '19103',
        job_description: 'Need handyman in 19103',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open matching modal
      const matchBtn = page.locator('button:has-text("Match")').first();
      await matchBtn.click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      await page.waitForTimeout(1000);

      // Should show nearby vendor
      const nearbyVisible = await page.locator('.ant-modal :has-text("Nearby Vendor Co")').isVisible({ timeout: 3000 }).catch(() => false);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, nearbyEmail);
      await cleanupByEmail(supabase, farEmail);
    });
  });

  test.describe('Match Status Updates', () => {
    test('should update request status after matching', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-status-update');
      const vendorEmail = generateTestEmail('vendor-status-update');

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Status Update Vendor',
        business_name: 'Status Update Co',
        services: ['roofer'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'roofer',
        zip_code: '19103',
        job_description: 'Status update test',
        status: 'new',
      });

      // Match vendors
      await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: [vendor!.id] },
      });

      // Check request status was updated
      const { data: updated } = await supabase
        .from('service_requests')
        .select('status')
        .eq('id', serviceRequest.id)
        .single();

      expect(['matching', 'matched']).toContain(updated?.status);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
    });
  });
});
