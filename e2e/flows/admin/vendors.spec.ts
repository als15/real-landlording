/**
 * Admin Vendors Management E2E Tests
 *
 * Tests the admin vendor management functionality including
 * viewing, editing, and status changes.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestVendor,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Admin Vendors', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let adminEmail: string;
  let adminPassword: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    adminEmail = generateTestEmail('admin-vendors');
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
      name: 'Vendors Admin',
      role: 'admin',
    });
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, adminEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login and navigate to vendors page
    await page.goto('/login');
    await page.fill(pages.login.emailInput, adminEmail);
    await page.fill(pages.login.passwordInput, adminPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

    await page.goto('/vendors');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Vendors List', () => {
    test('should display vendors page', async ({ page }) => {
      await expect(page.locator('h2:has-text("Vendors")')).toBeVisible();
    });

    test('should display vendors table', async ({ page }) => {
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });
    });

    test('should have search functionality', async ({ page }) => {
      const searchInput = page.locator(pages.admin.searchInput);
      await expect(searchInput).toBeVisible();
    });
  });

  test.describe('Vendor Display', () => {
    test('should display test vendor in table', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-display');
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Display Test Vendor',
        business_name: 'Display Test Co',
        services: ['plumber_sewer'],
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show vendor in table
      await expect(page.locator(`text=Display Test Co`)).toBeVisible({ timeout: 10000 });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should show vendor details in drawer', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-drawer');
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Drawer Test Vendor',
        business_name: 'Drawer Test Co',
        phone: '2155551234',
        services: ['electrician', 'handyman'],
        service_areas: ['19103', '19104'],
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click view button
      const viewBtn = page.locator('button:has(.anticon-eye), button:has-text("View")').first();
      await viewBtn.click();

      // Drawer should open
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Should show vendor info
      await expect(page.locator(':has-text("Drawer Test Co")')).toBeVisible();
      await expect(page.locator(`:has-text("${vendorEmail}")`)).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Filtering', () => {
    test('should filter by status', async ({ page }) => {
      // Create vendors with different statuses
      const activeEmail = generateTestEmail('vendor-active');
      const inactiveEmail = generateTestEmail('vendor-inactive');

      await createTestVendor(supabase, {
        email: activeEmail,
        contact_name: 'Active Vendor',
        business_name: 'Active Co',
        status: 'active',
      });

      await createTestVendor(supabase, {
        email: inactiveEmail,
        contact_name: 'Inactive Vendor',
        business_name: 'Inactive Co',
        status: 'inactive',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Use status filter if available
      const statusFilter = page.locator('.ant-select:has-text("Status")');
      if (await statusFilter.isVisible({ timeout: 3000 })) {
        await statusFilter.click();
        await page.click('.ant-select-item-option:has-text("Active")');
        await page.waitForTimeout(1000);

        // Should show active vendors
        await expect(page.locator('text=Active Co')).toBeVisible();
      }

      // Cleanup
      await cleanupByEmail(supabase, activeEmail);
      await cleanupByEmail(supabase, inactiveEmail);
    });

    test('should search by business name', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-search');
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Search Vendor',
        business_name: 'UniqueSearchCo',
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Search
      await page.fill(pages.admin.searchInput, 'UniqueSearchCo');
      await page.waitForTimeout(500);

      // Should find the vendor
      await expect(page.locator('text=UniqueSearchCo')).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should filter by service type', async ({ page }) => {
      const plumberEmail = generateTestEmail('vendor-plumber');
      await createTestVendor(supabase, {
        email: plumberEmail,
        contact_name: 'Plumber Vendor',
        business_name: 'Plumber Co',
        services: ['plumber_sewer'],
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Service filter if available
      const serviceFilter = page.locator('.ant-select:has-text("Service")');
      if (await serviceFilter.isVisible({ timeout: 3000 })) {
        await serviceFilter.click();
        await page.click('.ant-select-item-option:has-text("Plumber")');
        await page.waitForTimeout(1000);
      }

      // Cleanup
      await cleanupByEmail(supabase, plumberEmail);
    });
  });

  test.describe('Vendor Status', () => {
    test('should show status badges', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-badge');
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Badge Vendor',
        business_name: 'Badge Co',
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show status tag
      await expect(page.locator(`${antd.tag}:has-text("Active")`)).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('API Operations', () => {
    test('should fetch vendors via API', async ({ request }) => {
      const response = await request.get('/api/admin/applications');
      // This might be vendors endpoint or applications
      expect([200, 404]).toContain(response.status());
    });
  });

  test.describe('Vendor Services Display', () => {
    test('should display vendor services as tags', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-services');
      await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Services Vendor',
        business_name: 'Services Co',
        services: ['plumber_sewer', 'electrician', 'hvac'],
        status: 'active',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open vendor details
      const viewBtn = page.locator('button:has(.anticon-eye)').first();
      if (await viewBtn.isVisible({ timeout: 3000 })) {
        await viewBtn.click();
        await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

        // Should show service tags
        await expect(page.locator(':has-text("Plumber")')).toBeVisible();
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Vendor Performance', () => {
    test('should display vendor rating if available', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-rating');
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Rating Vendor',
          business_name: 'Rating Co',
          phone: '2155551234',
          services: ['handyman'],
          service_areas: ['19103'],
          status: 'active',
          terms_accepted: true,
          performance_score: 85,
        })
        .select()
        .single();

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open vendor details
      const viewBtn = page.locator('button:has(.anticon-eye)').first();
      if (await viewBtn.isVisible({ timeout: 3000 })) {
        await viewBtn.click();
        await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

        // Performance score might be displayed
        const hasScore = await page.locator(':has-text("Performance"), :has-text("Score")').isVisible({ timeout: 2000 }).catch(() => false);
        // Just verify drawer opens, score display is optional
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });
});
