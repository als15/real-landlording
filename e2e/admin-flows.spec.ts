import { test, expect } from '@playwright/test';

/**
 * Admin Flow E2E Tests
 *
 * These tests verify the admin functionality works correctly:
 * - Admin login
 * - Viewing requests
 * - Viewing vendors
 * - Matching vendors to requests
 *
 * Prerequisites:
 * - An admin user must exist in the database
 * - Set ADMIN_EMAIL and ADMIN_PASSWORD environment variables
 */

// Test credentials from environment or defaults for local testing
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@reallandlording.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'testpassword123';

test.describe('Admin Authentication', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    // Try to access admin dashboard directly
    await page.goto('/requests');

    // Should be redirected to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should login successfully with valid admin credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i]', ADMIN_PASSWORD);

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(requests|dashboard)/, { timeout: 10000 });

    // Should be on an admin page
    expect(page.url()).toMatch(/\/(requests|dashboard)/);
  });

  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/login');

    // Fill in wrong credentials
    await page.fill('input[type="email"], input[placeholder*="email" i]', 'wrong@email.com');
    await page.fill('input[type="password"], input[placeholder*="password" i]', 'wrongpassword');

    // Submit form
    await page.click('button[type="submit"]');

    // Should show error message and stay on login page
    await expect(page.locator('.ant-message-error, [role="alert"]')).toBeVisible({ timeout: 5000 });
    expect(page.url()).toContain('/login');
  });
});

test.describe('Admin Requests Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"], input[placeholder*="email" i]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(requests|dashboard)/, { timeout: 10000 });
  });

  test('should display requests list', async ({ page }) => {
    await page.goto('/requests');

    // Wait for table to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Should have a table with requests
    const table = page.locator('.ant-table, table');
    await expect(table).toBeVisible();

    // Should have column headers
    await expect(page.locator('th, .ant-table-thead')).toBeVisible();
  });

  test('should filter requests by status', async ({ page }) => {
    await page.goto('/requests');

    // Wait for page to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Find and click status filter
    const statusFilter = page.locator('.ant-select').filter({ hasText: /status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.click();

      // Select a status option
      await page.click('.ant-select-item-option:has-text("New")');

      // Table should update (no error)
      await page.waitForSelector('.ant-table, table');
    }
  });

  test('should open request details drawer', async ({ page }) => {
    await page.goto('/requests');

    // Wait for table to load
    await page.waitForSelector('.ant-table-row, tbody tr', { timeout: 10000 });

    // Click on eye icon (view) button in first row
    const viewButton = page.locator('.ant-table-row button, tbody tr button').first();
    if (await viewButton.isVisible()) {
      await viewButton.click();

      // Drawer should open
      await expect(page.locator('.ant-drawer')).toBeVisible({ timeout: 5000 });

      // Should show request details
      await expect(page.locator('.ant-drawer-body')).toContainText(/Contact|Service|Property/i);
    }
  });

  test('should open vendor matching modal', async ({ page }) => {
    await page.goto('/requests');

    // Wait for table to load
    await page.waitForSelector('.ant-table-row, tbody tr', { timeout: 10000 });

    // Find a "Match" button
    const matchButton = page.locator('button:has-text("Match")').first();
    if (await matchButton.isVisible()) {
      await matchButton.click();

      // Modal should open
      await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });

      // Should show vendor selection UI
      await expect(page.locator('.ant-modal-body')).toContainText(/vendor/i);
    }
  });
});

test.describe('Admin Vendors Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"], input[placeholder*="email" i]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(requests|dashboard)/, { timeout: 10000 });
  });

  test('should display vendors list', async ({ page }) => {
    await page.goto('/vendors');

    // Wait for table to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Should have a table
    const table = page.locator('.ant-table, table');
    await expect(table).toBeVisible();
  });

  test('should search vendors', async ({ page }) => {
    await page.goto('/vendors');

    // Wait for page to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Find search input
    const searchInput = page.locator('input[placeholder*="search" i]').first();
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');

      // Wait for search results
      await page.waitForTimeout(500); // Debounce wait

      // Table should still be visible (no crash)
      await expect(page.locator('.ant-table, table')).toBeVisible();
    }
  });

  test('should open add vendor modal', async ({ page }) => {
    await page.goto('/vendors');

    // Wait for page to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Click add vendor button
    const addButton = page.locator('button:has-text("Add Vendor")');
    if (await addButton.isVisible()) {
      await addButton.click();

      // Modal should open
      await expect(page.locator('.ant-modal')).toBeVisible({ timeout: 5000 });

      // Should have vendor form fields
      await expect(page.locator('.ant-modal-body')).toContainText(/Business Name|Contact|Email/i);
    }
  });
});

test.describe('Admin Applications Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.fill('input[type="email"], input[placeholder*="email" i]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[placeholder*="password" i]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(requests|dashboard)/, { timeout: 10000 });
  });

  test('should display applications list', async ({ page }) => {
    await page.goto('/applications');

    // Wait for table to load
    await page.waitForSelector('.ant-table, table', { timeout: 10000 });

    // Should have a table
    const table = page.locator('.ant-table, table');
    await expect(table).toBeVisible();
  });
});

test.describe('API Authorization', () => {
  test('should reject unauthenticated requests to admin API', async ({ request }) => {
    // Try to access admin API without auth
    const response = await request.get('/api/requests');

    // Should be unauthorized
    expect(response.status()).toBe(401);
  });

  test('should reject unauthenticated vendor API requests', async ({ request }) => {
    const response = await request.get('/api/vendors');

    expect(response.status()).toBe(401);
  });

  test('should allow public request submission', async ({ request }) => {
    // Public request submission should work without auth
    const response = await request.post('/api/requests', {
      data: {
        landlord_email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        service_type: 'plumber_sewer',
        property_address: '123 Test St',
        zip_code: '19103',
        job_description: 'Test request',
        urgency: 'medium',
        is_owner: true,
      },
    });

    // Should succeed (201 or 200)
    expect([200, 201]).toContain(response.status());
  });
});
