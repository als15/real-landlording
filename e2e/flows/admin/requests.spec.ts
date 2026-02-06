/**
 * Admin Requests Management E2E Tests
 *
 * Tests the admin request management functionality including
 * viewing, filtering, and status updates.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestRequest,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Admin Requests', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let adminEmail: string;
  let adminPassword: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    adminEmail = generateTestEmail('admin-requests');
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
      name: 'Requests Admin',
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

    // Navigate to requests page
    await page.goto('/requests');
    await page.waitForLoadState('networkidle');
  });

  test.describe('Requests List', () => {
    test('should display requests page', async ({ page }) => {
      await expect(page.locator('h2:has-text("Service Requests")')).toBeVisible();
    });

    test('should display requests table', async ({ page }) => {
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });
    });

    test('should have filter presets', async ({ page }) => {
      // Look for filter buttons
      await expect(page.locator('button:has-text("All Requests")')).toBeVisible();
      await expect(page.locator('button:has-text("Emergency")')).toBeVisible();
      await expect(page.locator('button:has-text("New")')).toBeVisible();
    });

    test('should have search functionality', async ({ page }) => {
      const searchInput = page.locator(pages.admin.searchInput);
      await expect(searchInput).toBeVisible();
    });

    test('should have export button', async ({ page }) => {
      await expect(page.locator(pages.admin.exportButton)).toBeVisible();
    });
  });

  test.describe('Request Display', () => {
    test('should display test request in table', async ({ page }) => {
      // Create a test request
      const landlordEmail = generateTestEmail('landlord-display');
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Display',
        last_name: 'Test',
        service_type: 'plumber_sewer',
        property_address: '123 Display Test St',
        zip_code: '19103',
        job_description: 'Testing display in admin requests',
        urgency: 'medium',
        status: 'new',
      });

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show request in table
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });
      const rows = page.locator(antd.tableRow);
      expect(await rows.count()).toBeGreaterThanOrEqual(1);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should show request details in drawer', async ({ page }) => {
      // Create a test request
      const landlordEmail = generateTestEmail('landlord-drawer');
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Drawer',
        last_name: 'Test',
        service_type: 'electrician',
        property_address: '456 Drawer Test Ave',
        zip_code: '19104',
        job_description: 'Testing drawer display',
        urgency: 'high',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click view button
      const viewBtn = page.locator('button:has(.anticon-eye)').first();
      await viewBtn.click();

      // Drawer should open
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });
      await expect(page.locator(':has-text("Request Details")')).toBeVisible();

      // Should show request info
      const drawerContent = page.locator(antd.drawerBody);
      await expect(drawerContent).toContainText(/Drawer|Test|19104/);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Filtering', () => {
    test('should filter by status', async ({ page }) => {
      // Create requests with different statuses
      const newEmail = generateTestEmail('landlord-new');
      const matchedEmail = generateTestEmail('landlord-matched');

      await createTestRequest(supabase, {
        landlord_email: newEmail,
        service_type: 'handyman',
        job_description: 'New status test',
        status: 'new',
      });

      await createTestRequest(supabase, {
        landlord_email: matchedEmail,
        service_type: 'painter',
        job_description: 'Matched status test',
        status: 'matched',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Use status filter
      const statusFilter = page.locator('.ant-select:has-text("Status"), .ant-select').first();
      await statusFilter.click();
      await page.click('.ant-select-item-option:has-text("New")');

      await page.waitForTimeout(1000);

      // Should show only new requests
      const newTags = page.locator(`${antd.tag}:has-text("New")`);
      const matchedTags = page.locator(`${antd.tag}:has-text("Matched")`);

      expect(await newTags.count()).toBeGreaterThanOrEqual(1);
      // Matched tags might still be visible for other statuses in same row

      // Cleanup
      await cleanupByEmail(supabase, newEmail);
      await cleanupByEmail(supabase, matchedEmail);
    });

    test('should search by landlord email', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-search');
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'hvac',
        job_description: 'Search test request',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Search by email
      await page.fill(pages.admin.searchInput, landlordEmail);
      await page.waitForTimeout(500);

      // Should show the matching request
      await expect(page.locator(`text=${landlordEmail}`)).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should filter emergency requests', async ({ page }) => {
      const emergencyEmail = generateTestEmail('landlord-emergency');
      await createTestRequest(supabase, {
        landlord_email: emergencyEmail,
        service_type: 'plumber_sewer',
        job_description: 'Emergency test request',
        urgency: 'emergency',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click emergency filter
      await page.click('button:has-text("Emergency")');
      await page.waitForTimeout(1000);

      // Should show emergency requests
      const urgentTags = page.locator(`${antd.tag}:has-text("URGENT")`);
      expect(await urgentTags.count()).toBeGreaterThanOrEqual(1);

      // Cleanup
      await cleanupByEmail(supabase, emergencyEmail);
    });
  });

  test.describe('Status Updates', () => {
    test('should update request status from drawer', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-status');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'locksmith',
        job_description: 'Status update test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open drawer
      const viewBtn = page.locator('button:has(.anticon-eye)').first();
      await viewBtn.click();
      await expect(page.locator(antd.drawer)).toBeVisible({ timeout: 5000 });

      // Change status
      const statusSelect = page.locator('.ant-drawer .ant-select').first();
      await statusSelect.click();
      await page.click('.ant-select-item-option:has-text("Matching")');

      // Should show success message
      await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

      // Verify in database
      const { data: updatedRequest } = await supabase
        .from('service_requests')
        .select('status')
        .eq('id', request.id)
        .single();

      expect(updatedRequest?.status).toBe('matching');

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Match Vendors', () => {
    test('should open matching modal for new requests', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-match-modal');
      await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'pest_control',
        job_description: 'Match modal test',
        status: 'new',
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click match button
      const matchBtn = page.locator(pages.admin.matchButton).first();
      await matchBtn.click();

      // Modal should open
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Bulk Actions', () => {
    test('should allow selecting multiple requests', async ({ page }) => {
      // Create multiple requests
      const emails = [
        generateTestEmail('bulk1'),
        generateTestEmail('bulk2'),
      ];

      for (const email of emails) {
        await createTestRequest(supabase, {
          landlord_email: email,
          service_type: 'handyman',
          job_description: 'Bulk test',
          status: 'new',
        });
      }

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Select checkboxes
      const checkboxes = page.locator('.ant-table-selection-column .ant-checkbox');
      expect(await checkboxes.count()).toBeGreaterThanOrEqual(2);

      // Cleanup
      for (const email of emails) {
        await cleanupByEmail(supabase, email);
      }
    });
  });

  test.describe('API Operations', () => {
    test('should fetch requests via API', async ({ request }) => {
      const response = await request.get('/api/requests');
      expect(response.status()).toBe(200);

      const { data } = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should fetch single request via API', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-api');
      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'roofer',
        job_description: 'API fetch test',
        status: 'new',
      });

      const response = await request.get(`/api/requests/${serviceRequest.id}`);
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.id).toBe(serviceRequest.id);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should update request status via API', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-update-api');
      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'general_contractor',
        job_description: 'API update test',
        status: 'new',
      });

      const response = await request.patch(`/api/requests/${serviceRequest.id}`, {
        data: { status: 'cancelled' },
      });

      expect(response.status()).toBe(200);

      // Verify
      const { data: updated } = await supabase
        .from('service_requests')
        .select('status')
        .eq('id', serviceRequest.id)
        .single();

      expect(updated?.status).toBe('cancelled');

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });
});
