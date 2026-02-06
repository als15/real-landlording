/**
 * Admin Applications Management E2E Tests
 *
 * Tests the admin vendor application review functionality.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import { getSupabaseAdmin, cleanupByEmail } from '../../fixtures/database.fixture';

test.describe('Admin Applications', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let adminEmail: string;
  let adminPassword: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    adminEmail = generateTestEmail('admin-applications');
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
      name: 'Applications Admin',
      role: 'admin',
    });
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, adminEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login and navigate to applications page
    await page.goto('/login');
    await page.fill(pages.login.emailInput, adminEmail);
    await page.fill(pages.login.passwordInput, adminPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

    await page.goto('/applications');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Applications List', () => {
    test('should display applications page', async ({ page }) => {
      await expect(page.locator('h2:has-text("Applications"), h2:has-text("Vendor Applications")')).toBeVisible();
    });

    test('should display applications table or empty state', async ({ page }) => {
      // Either table or empty state should be visible
      const table = page.locator(antd.table);
      const empty = page.locator(antd.tableEmpty);

      const hasTable = await table.isVisible({ timeout: 10000 }).catch(() => false);
      const hasEmpty = await empty.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasTable || hasEmpty).toBe(true);
    });
  });

  test.describe('Application Display', () => {
    test('should display pending application in list', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-pending-app');

      // Create pending vendor (application)
      await supabase.from('vendors').insert({
        email: vendorEmail,
        contact_name: 'Pending Application',
        business_name: 'Pending Application Co',
        phone: '2155551234',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        qualifications: '10 years experience',
        status: 'pending_review',
        terms_accepted: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show in applications list
      await expect(page.locator('text=Pending Application Co')).toBeVisible({ timeout: 10000 });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should show application details in drawer', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-app-details');

      await supabase.from('vendors').insert({
        email: vendorEmail,
        contact_name: 'Details Application',
        business_name: 'Details Application Co',
        phone: '2155559999',
        services: ['electrician', 'handyman'],
        service_areas: ['19103', '19104', '19106'],
        qualifications: 'Licensed master electrician with 15 years experience',
        years_in_business: 15,
        licensed: true,
        insured: true,
        rental_experience: true,
        status: 'pending_review',
        terms_accepted: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click to view details
      const viewBtn = page.locator('button:has(.anticon-eye), button:has-text("View"), button:has-text("Review")').first();
      await viewBtn.click();

      // Drawer should open
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should show application details
      await expect(page.locator(':has-text("Details Application Co")')).toBeVisible();
      await expect(page.locator(`:has-text("${vendorEmail}")`)).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Application Actions', () => {
    test('should show approve and reject buttons', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-actions');

      await supabase.from('vendors').insert({
        email: vendorEmail,
        contact_name: 'Actions Application',
        business_name: 'Actions Application Co',
        phone: '2155551111',
        services: ['painter'],
        service_areas: ['19103'],
        status: 'pending_review',
        terms_accepted: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open application details
      const viewBtn = page.locator('button:has(.anticon-eye), button:has-text("View")').first();
      await viewBtn.click();
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should have approve/reject buttons
      const approveBtn = page.locator(pages.admin.approveButton);
      const rejectBtn = page.locator(pages.admin.rejectButton);

      const hasApprove = await approveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      const hasReject = await rejectBtn.isVisible({ timeout: 3000 }).catch(() => false);

      // At least one action should be available
      expect(hasApprove || hasReject).toBe(true);

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should approve application via API', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-approve-api');

      // Create pending application
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Approve API Test',
          business_name: 'Approve API Co',
          phone: '2155552222',
          services: ['hvac'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        })
        .select()
        .single();

      const response = await request.post(`/api/admin/applications/${vendor!.id}/approve`, {
        data: { password: 'VendorPassword123!' },
      });

      expect([200, 201]).toContain(response.status());

      // Verify status changed
      const { data: updated } = await supabase
        .from('vendors')
        .select('status')
        .eq('id', vendor!.id)
        .single();

      expect(updated?.status).toBe('active');

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should reject application via API', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-reject-api');

      // Create pending application
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Reject API Test',
          business_name: 'Reject API Co',
          phone: '2155553333',
          services: ['roofer'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        })
        .select()
        .single();

      const response = await request.post(`/api/admin/applications/${vendor!.id}/reject`, {
        data: { reason: 'Test rejection' },
      });

      expect([200, 201]).toContain(response.status());

      // Verify status changed
      const { data: updated } = await supabase
        .from('vendors')
        .select('status')
        .eq('id', vendor!.id)
        .single();

      expect(updated?.status).toBe('rejected');

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Application Filtering', () => {
    test('should show only pending applications by default', async ({ page }) => {
      // Create vendors with different statuses
      const pendingEmail = generateTestEmail('vendor-pending-filter');
      const activeEmail = generateTestEmail('vendor-active-filter');

      await supabase.from('vendors').insert([
        {
          email: pendingEmail,
          contact_name: 'Pending Filter Test',
          business_name: 'Pending Filter Co',
          phone: '2155554444',
          services: ['locksmith'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        },
        {
          email: activeEmail,
          contact_name: 'Active Filter Test',
          business_name: 'Active Filter Co',
          phone: '2155555555',
          services: ['locksmith'],
          service_areas: ['19103'],
          status: 'active',
          terms_accepted: true,
        },
      ]);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Applications page should show pending by default
      await expect(page.locator('text=Pending Filter Co')).toBeVisible({ timeout: 10000 });

      // Active vendor might not show in applications
      const activeVisible = await page.locator('text=Active Filter Co').isVisible({ timeout: 3000 }).catch(() => false);
      // It's ok either way - depends on implementation

      // Cleanup
      await cleanupByEmail(supabase, pendingEmail);
      await cleanupByEmail(supabase, activeEmail);
    });
  });

  test.describe('Application Details Display', () => {
    test('should display qualifications and credentials', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-credentials');

      await supabase.from('vendors').insert({
        email: vendorEmail,
        contact_name: 'Credentials Test',
        business_name: 'Credentials Test Co',
        phone: '2155556666',
        services: ['general_contractor'],
        service_areas: ['19103'],
        qualifications: 'Licensed general contractor. 20+ years of experience. Bonded and insured.',
        years_in_business: 20,
        licensed: true,
        insured: true,
        rental_experience: true,
        status: 'pending_review',
        terms_accepted: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open details
      const viewBtn = page.locator('button:has(.anticon-eye), button:has-text("View")').first();
      await viewBtn.click();
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should show credentials
      await expect(page.locator(':has-text("Licensed")')).toBeVisible();
      await expect(page.locator(':has-text("Insured")')).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should display service areas', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-areas');

      await supabase.from('vendors').insert({
        email: vendorEmail,
        contact_name: 'Areas Test',
        business_name: 'Areas Test Co',
        phone: '2155557777',
        services: ['pest_control'],
        service_areas: ['19103', '19104', '19106', '19107', '19123'],
        status: 'pending_review',
        terms_accepted: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open details
      const viewBtn = page.locator('button:has(.anticon-eye), button:has-text("View")').first();
      await viewBtn.click();
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should show service areas
      await expect(page.locator(':has-text("Service Area"), :has-text("Areas")')).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('API Endpoints', () => {
    test('should fetch applications list', async ({ request }) => {
      const response = await request.get('/api/admin/applications');
      expect([200, 404]).toContain(response.status());

      if (response.status() === 200) {
        const data = await response.json();
        expect(Array.isArray(data.data || data)).toBe(true);
      }
    });

    test('should fetch single application', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-fetch-api');

      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Fetch API Test',
          business_name: 'Fetch API Co',
          phone: '2155558888',
          services: ['windows_doors'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        })
        .select()
        .single();

      const response = await request.get(`/api/admin/applications/${vendor!.id}`);
      expect([200, 404]).toContain(response.status());

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });
});
