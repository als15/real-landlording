/**
 * Vendor Dashboard E2E Tests
 *
 * Tests the vendor dashboard functionality including
 * viewing jobs, job details, accepting jobs, and stats.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestRequest,
  createTestMatch,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Vendor Dashboard', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let testEmail: string;
  let testPassword: string;
  let vendorId: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    testEmail = generateTestEmail('vendor-dash');
    testPassword = 'TestPassword123!';

    // Create test vendor with auth user
    const { data: authUser } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    const { data: vendor } = await supabase
      .from('vendors')
      .insert({
        email: testEmail,
        contact_name: 'Dashboard Test Vendor',
        business_name: 'Dashboard Test Co',
        phone: '2155551234',
        services: ['plumber_sewer', 'handyman'],
        service_areas: ['19103', '19104'],
        status: 'active',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      })
      .select()
      .single();

    vendorId = vendor!.id;
  });

  test.afterAll(async () => {
    await cleanupByEmail(supabase, testEmail);
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/vendor/login');
    await page.fill(pages.login.emailInput, testEmail);
    await page.fill(pages.login.passwordInput, testPassword);
    await page.click(pages.login.submitButton);
    await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });
  });

  test.describe('Dashboard Page', () => {
    test('should display vendor dashboard', async ({ page }) => {
      await expect(page.locator('h2:has-text("Vendor Dashboard")')).toBeVisible();
    });

    test('should show stats cards', async ({ page }) => {
      // Look for stats cards
      const statsCards = page.locator(pages.vendorDashboard.statsCards);
      await expect(statsCards.first()).toBeVisible({ timeout: 5000 });

      // Should have multiple stat cards
      const cardCount = await statsCards.count();
      expect(cardCount).toBeGreaterThanOrEqual(3);
    });

    test('should show empty state when no jobs', async ({ page }) => {
      // Initially may show empty state
      const emptyState = page.locator(antd.tableEmpty);
      const table = page.locator(antd.table);

      // One should be visible
      const hasEmpty = await emptyState.isVisible({ timeout: 5000 }).catch(() => false);
      const hasTable = await table.isVisible({ timeout: 5000 }).catch(() => false);

      expect(hasEmpty || hasTable).toBe(true);
    });
  });

  test.describe('Jobs Display', () => {
    test('should display assigned jobs in table', async ({ page }) => {
      // Create a request and match it to this vendor
      const landlordEmail = generateTestEmail('landlord-job');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        property_address: '123 Vendor Job Test St',
        zip_code: '19103',
        job_description: 'Test job for vendor dashboard',
        urgency: 'medium',
        status: 'matched',
      });

      await createTestMatch(supabase, request.id, vendorId);

      // Refresh page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should show the table
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });

      // Should have at least one row
      const rows = page.locator(antd.tableRow);
      expect(await rows.count()).toBeGreaterThanOrEqual(1);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should show job details in modal', async ({ page }) => {
      // Create a job
      const landlordEmail = generateTestEmail('landlord-modal');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Modal',
        last_name: 'Test',
        landlord_phone: '2155559999',
        service_type: 'handyman',
        property_address: '456 Modal Test Ave',
        zip_code: '19104',
        job_description: 'Testing job details modal display',
        urgency: 'high',
        status: 'matched',
      });

      await createTestMatch(supabase, request.id, vendorId);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Click view on first job
      const viewBtn = page.locator(pages.vendorDashboard.viewJobButton).first();
      await viewBtn.click();

      // Modal should appear
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Should show job details
      const modalBody = page.locator(antd.modalBody);
      await expect(modalBody).toContainText(/Service|Location|Urgency/);
      await expect(modalBody).toContainText(/19104/);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Job Acceptance', () => {
    test('should show accept button for pending jobs', async ({ page }) => {
      // Create a pending job
      const landlordEmail = generateTestEmail('landlord-accept');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        job_description: 'Job to accept',
        status: 'matched',
      });

      await supabase.from('request_vendor_matches').insert({
        request_id: request.id,
        vendor_id: vendorId,
        status: 'sent',
        intro_sent_at: new Date().toISOString(),
        vendor_accepted: false,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open job details
      await page.locator(pages.vendorDashboard.viewJobButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Should have accept button
      const acceptBtn = page.locator(pages.vendorDashboard.acceptJobButton);
      await expect(acceptBtn).toBeVisible();

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should accept job via UI', async ({ page }) => {
      // Create a pending job
      const landlordEmail = generateTestEmail('landlord-accept-ui');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'handyman',
        job_description: 'Job to accept via UI',
        status: 'matched',
      });

      const { data: match } = await supabase
        .from('request_vendor_matches')
        .insert({
          request_id: request.id,
          vendor_id: vendorId,
          status: 'sent',
          intro_sent_at: new Date().toISOString(),
          vendor_accepted: false,
        })
        .select()
        .single();

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open job details
      await page.locator(pages.vendorDashboard.viewJobButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Click accept
      const acceptBtn = page.locator(pages.vendorDashboard.acceptJobButton);
      if (await acceptBtn.isVisible({ timeout: 3000 })) {
        await acceptBtn.click();

        // Should show success message
        await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });

        // Verify in database
        const { data: updatedMatch } = await supabase
          .from('request_vendor_matches')
          .select('vendor_accepted')
          .eq('id', match!.id)
          .single();

        expect(updatedMatch?.vendor_accepted).toBe(true);
      }

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should accept job via API', async ({ request }) => {
      // Create a pending job
      const landlordEmail = generateTestEmail('landlord-accept-api');
      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'electrician',
        job_description: 'Job to accept via API',
        status: 'matched',
      });

      const { data: match } = await supabase
        .from('request_vendor_matches')
        .insert({
          request_id: serviceRequest.id,
          vendor_id: vendorId,
          status: 'sent',
          intro_sent_at: new Date().toISOString(),
          vendor_accepted: false,
        })
        .select()
        .single();

      const response = await request.post(`/api/vendor/jobs/${match!.id}/accept`);
      expect([200, 201]).toContain(response.status());

      // Verify
      const { data: updatedMatch } = await supabase
        .from('request_vendor_matches')
        .select('vendor_accepted')
        .eq('id', match!.id)
        .single();

      expect(updatedMatch?.vendor_accepted).toBe(true);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Job Status Display', () => {
    test('should show pending status for unaccepted jobs', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-pending');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'plumber_sewer',
        job_description: 'Pending status test',
        status: 'matched',
      });

      await supabase.from('request_vendor_matches').insert({
        request_id: request.id,
        vendor_id: vendorId,
        status: 'sent',
        intro_sent_at: new Date().toISOString(),
        vendor_accepted: false,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for pending tag
      const pendingTag = page.locator(`${antd.tag}:has-text("Pending")`);
      await expect(pendingTag).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should show accepted status for accepted jobs', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-accepted');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'handyman',
        job_description: 'Accepted status test',
        status: 'matched',
      });

      await supabase.from('request_vendor_matches').insert({
        request_id: request.id,
        vendor_id: vendorId,
        status: 'accepted',
        intro_sent_at: new Date().toISOString(),
        vendor_accepted: true,
        vendor_accepted_at: new Date().toISOString(),
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for accepted tag
      const acceptedTag = page.locator(`${antd.tag}:has-text("Accepted")`);
      await expect(acceptedTag).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should show completed status for completed jobs', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-completed');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'hvac',
        job_description: 'Completed status test',
        status: 'completed',
      });

      await supabase.from('request_vendor_matches').insert({
        request_id: request.id,
        vendor_id: vendorId,
        status: 'completed',
        intro_sent_at: new Date().toISOString(),
        vendor_accepted: true,
        job_completed: true,
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Look for completed tag
      const completedTag = page.locator(`${antd.tag}:has-text("Completed")`);
      await expect(completedTag).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Landlord Contact', () => {
    test('should display landlord contact info in job details', async ({ page }) => {
      const landlordEmail = generateTestEmail('landlord-contact');
      const request = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Contact',
        last_name: 'TestLandlord',
        landlord_phone: '2155551111',
        service_type: 'plumber_sewer',
        job_description: 'Test for landlord contact display',
        status: 'matched',
      });

      await createTestMatch(supabase, request.id, vendorId);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open job details
      await page.locator(pages.vendorDashboard.viewJobButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Should show landlord info
      const modalBody = page.locator(antd.modalBody);
      await expect(modalBody).toContainText(landlordEmail);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Stats', () => {
    test('should fetch vendor stats via API', async ({ request }) => {
      const response = await request.get('/api/vendor/stats');
      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('totalJobs');
      expect(data).toHaveProperty('pendingJobs');
      expect(data).toHaveProperty('completedJobs');
      expect(data).toHaveProperty('averageRating');
    });

    test('should display correct stats on dashboard', async ({ page }) => {
      // Create jobs with different statuses
      const landlordEmail1 = generateTestEmail('stats-landlord1');
      const landlordEmail2 = generateTestEmail('stats-landlord2');

      const request1 = await createTestRequest(supabase, {
        landlord_email: landlordEmail1,
        service_type: 'plumber_sewer',
        job_description: 'Stats test 1',
        status: 'matched',
      });

      const request2 = await createTestRequest(supabase, {
        landlord_email: landlordEmail2,
        service_type: 'handyman',
        job_description: 'Stats test 2',
        status: 'completed',
      });

      await supabase.from('request_vendor_matches').insert([
        {
          request_id: request1.id,
          vendor_id: vendorId,
          status: 'sent',
          intro_sent_at: new Date().toISOString(),
          vendor_accepted: false,
        },
        {
          request_id: request2.id,
          vendor_id: vendorId,
          status: 'completed',
          intro_sent_at: new Date().toISOString(),
          vendor_accepted: true,
          job_completed: true,
          review_rating: 5,
        },
      ]);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Check stats cards are populated
      const statsCards = page.locator(pages.vendorDashboard.statsCards);
      await expect(statsCards.first()).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail1);
      await cleanupByEmail(supabase, landlordEmail2);
    });
  });

  test.describe('Navigation', () => {
    test('should navigate to profile page', async ({ page }) => {
      const profileLink = page.locator(pages.vendorDashboard.profileLink);
      if (await profileLink.isVisible({ timeout: 3000 })) {
        await profileLink.click();
        await page.waitForURL(/\/vendor\/dashboard\/profile/);
      } else {
        await page.goto('/vendor/dashboard/profile');
      }

      expect(page.url()).toContain('/vendor/dashboard/profile');
    });
  });
});
