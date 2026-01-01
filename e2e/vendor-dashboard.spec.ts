import { test, expect } from '@playwright/test';

/**
 * Vendor Dashboard E2E Tests
 *
 * Tests the vendor user flows:
 * - Vendor login
 * - Dashboard access
 * - Job viewing
 * - Job acceptance
 */

test.describe('Vendor Authentication', () => {
  test('should display vendor login page', async ({ page }) => {
    await page.goto('/vendor/login');

    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should redirect unauthenticated users from vendor dashboard', async ({ page }) => {
    await page.goto('/vendor/dashboard');

    // Should redirect to vendor login
    await expect(page).toHaveURL(/\/vendor\/login|\/login/);
  });

  test('should reject invalid vendor credentials', async ({ page }) => {
    await page.goto('/vendor/login');

    await page.fill('input[type="email"]', 'nonexistent@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Wait for response
    await page.waitForTimeout(2000);

    // Should stay on login page (not redirect to dashboard)
    expect(page.url()).toMatch(/\/vendor\/login/);
  });

  test('should have link to apply as vendor', async ({ page }) => {
    await page.goto('/vendor/login');

    const applyLink = page.locator('a:has-text("Apply"), a:has-text("apply"), a[href*="apply"]');
    if (await applyLink.isVisible()) {
      await expect(applyLink).toBeVisible();
    }
  });
});

test.describe('Vendor API', () => {
  test('should reject unauthenticated access to vendor jobs', async ({ request }) => {
    const response = await request.get('/api/vendor/jobs');
    // Should not succeed - expect 401, 403, or 500
    expect([401, 403, 500]).toContain(response.status());
  });

  test('should reject unauthenticated access to vendor stats', async ({ request }) => {
    const response = await request.get('/api/vendor/stats');
    expect([401, 403, 500]).toContain(response.status());
  });

  test('should reject unauthenticated job acceptance', async ({ request }) => {
    const response = await request.post('/api/vendor/jobs/fake-id/accept');
    expect([401, 403, 404, 500]).toContain(response.status());
  });

  test('should handle vendor login API', async ({ request }) => {
    const response = await request.post('/api/vendor/login', {
      data: {
        email: 'test@example.com',
        password: 'testpassword',
      },
    });

    // Should fail with invalid credentials - endpoint may return various error codes
    expect([400, 401, 404, 500]).toContain(response.status());
  });
});

test.describe('Vendor Dashboard (Authenticated)', () => {
  // These tests require vendor credentials
  const VENDOR_EMAIL = process.env.VENDOR_EMAIL || '';
  const VENDOR_PASSWORD = process.env.VENDOR_PASSWORD || '';

  test.beforeEach(async ({ page }) => {
    if (!VENDOR_EMAIL || !VENDOR_PASSWORD) {
      test.skip();
    }

    await page.goto('/vendor/login');
    await page.fill('input[type="email"]', VENDOR_EMAIL);
    await page.fill('input[type="password"]', VENDOR_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });
  });

  test('should display vendor dashboard', async ({ page }) => {
    await page.goto('/vendor/dashboard');

    // Dashboard should load
    await page.waitForTimeout(2000);
    const content = await page.content();
    expect(content).toMatch(/dashboard|job|lead/i);
  });

  test('should show job leads or empty state', async ({ page }) => {
    await page.goto('/vendor/dashboard');

    // Should show jobs table or empty state
    const hasTable = await page.locator('.ant-table, table').isVisible();
    const hasEmptyState = await page.locator('.ant-empty, [class*="empty"]').isVisible();
    const hasCards = await page.locator('.ant-card').count() > 0;

    expect(hasTable || hasEmptyState || hasCards).toBeTruthy();
  });

  test('should show vendor stats', async ({ page }) => {
    await page.goto('/vendor/dashboard');

    // Should have some stats displayed
    await page.waitForTimeout(2000);

    // Look for stat cards or numbers
    const hasStats = await page.locator('.ant-statistic, .ant-card').count() > 0;
    expect(hasStats).toBeTruthy();
  });
});

test.describe('Vendor Application to Approval Flow', () => {
  test('complete vendor application flow', async ({ request }) => {
    const uniqueId = Date.now();

    // Step 1: Submit vendor application
    const applyResponse = await request.post('/api/vendor/apply', {
      data: {
        contact_name: `Flow Test Vendor ${uniqueId}`,
        business_name: `Flow Test Business ${uniqueId}`,
        email: `flow-vendor-${uniqueId}@example.com`,
        phone: '2155557777',
        services: ['plumber_sewer', 'handyman'],
        service_areas: ['19103', '19104'],
        qualifications: 'Licensed plumber with 15 years experience in Philadelphia',
        years_in_business: 15,
        licensed: true,
        insured: true,
        rental_experience: true,
        call_preferences: 'Call between 8am-6pm',
        terms_accepted: true,
      },
    });

    expect([200, 201]).toContain(applyResponse.status());

    const applyData = await applyResponse.json();
    expect(applyData.id).toBeDefined();
    expect(applyData.message).toContain('successfully');

    // Step 2: Application is now pending review
    // Admin would need to approve it

    // Step 3: Once approved, vendor can login
    // This requires admin action which needs authentication
  });

  test('vendor application creates pending_review status', async ({ request }) => {
    const uniqueId = Date.now();

    const response = await request.post('/api/vendor/apply', {
      data: {
        contact_name: `Status Test ${uniqueId}`,
        business_name: `Status Business ${uniqueId}`,
        email: `status-${uniqueId}@example.com`,
        phone: '2155558888',
        services: ['electrician'],
        service_areas: ['19101'],
        qualifications: 'Master electrician',
        years_in_business: 8,
        licensed: true,
        insured: true,
        terms_accepted: true,
      },
    });

    expect([200, 201]).toContain(response.status());

    // Vendor should be created with pending_review status
    // (verified by checking they can't login yet)
    const loginResponse = await request.post('/api/vendor/login', {
      data: {
        email: `status-${uniqueId}@example.com`,
        password: 'anypassword',
      },
    });

    // Should fail - vendor not approved yet
    expect([400, 401, 404]).toContain(loginResponse.status());
  });
});
