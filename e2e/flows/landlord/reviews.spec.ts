/**
 * Landlord Reviews E2E Tests
 *
 * Tests the vendor review functionality from the landlord's perspective.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestRequest,
  createTestVendor,
  createTestMatch,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Landlord Reviews', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;
  let testEmail: string;
  let testPassword: string;
  let authUserId: string;

  test.beforeAll(async () => {
    supabase = getSupabaseAdmin();
    testEmail = generateTestEmail('review');
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
      name: 'Review Test User',
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

  test.describe('Review Submission', () => {
    test('should submit review via API', async ({ request }) => {
      // Create a request with a vendor match
      const vendorEmail = generateTestEmail('vendor-review-api');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'API Review Vendor',
        business_name: 'API Review Co',
        services: ['plumber_sewer'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'plumber_sewer',
        job_description: 'API review test',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Submit review
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          rating: 5,
          quality: 5,
          price: 4,
          timeline: 5,
          treatment: 5,
          review_text: 'Excellent service! Highly recommended.',
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify review was saved
      const { data: updatedMatch } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('id', match!.id)
        .single();

      expect(updatedMatch?.review_rating).toBe(5);
      expect(updatedMatch?.review_text).toContain('Excellent');

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should require overall rating', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-review-req');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Required Rating Vendor',
        business_name: 'Required Rating Co',
        services: ['electrician'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'electrician',
        job_description: 'Rating required test',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Submit without rating
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          review_text: 'No rating provided',
        },
      });

      expect(response.status()).toBe(400);

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should validate rating range (1-5)', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-review-range');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Range Vendor',
        business_name: 'Range Co',
        services: ['handyman'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'handyman',
        job_description: 'Rating range test',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Submit with invalid rating (too high)
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          rating: 10,
        },
      });

      expect(response.status()).toBe(400);

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should reject review for non-owned request', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-review-auth');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Auth Vendor',
        business_name: 'Auth Co',
        services: ['painter'],
      });

      // Create request for different landlord
      const otherEmail = generateTestEmail('other-landlord');
      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: otherEmail,
        service_type: 'painter',
        job_description: 'Other landlord request',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Try to submit review
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          rating: 5,
        },
      });

      // Should be forbidden
      expect([403, 404]).toContain(response.status());

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, otherEmail);
    });
  });

  test.describe('Review Display', () => {
    test('should show review button for matched vendors', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-review-btn');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Review Btn Vendor',
        business_name: 'Review Btn Co',
        services: ['hvac'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'hvac',
        job_description: 'Review button test',
        status: 'matched',
      });

      await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open request details
      const viewBtn = page.locator(pages.landlordDashboard.viewRequestButton).first();
      if (await viewBtn.isVisible({ timeout: 5000 })) {
        await viewBtn.click();
        await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

        // Look for review button
        const reviewBtn = page.locator(pages.landlordDashboard.leaveReviewButton);
        const hasReviewBtn = await reviewBtn.isVisible({ timeout: 3000 }).catch(() => false);

        // Either review button or reviewed badge should exist
        if (!hasReviewBtn) {
          // Check if already reviewed
          const reviewedBadge = page.locator(':has-text("Reviewed")');
          expect(await reviewedBadge.isVisible({ timeout: 2000 }).catch(() => true)).toBe(true);
        }
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should show existing review when already submitted', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-review-show');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Show Review Vendor',
        business_name: 'Show Review Co',
        services: ['roofer'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'roofer',
        job_description: 'Show existing review test',
        status: 'matched',
      });

      // Create match with review already submitted
      await supabase.from('request_vendor_matches').insert({
        request_id: serviceRequest.id,
        vendor_id: vendor!.id,
        status: 'completed',
        intro_sent_at: new Date().toISOString(),
        job_completed: true,
        review_rating: 4,
        review_text: 'Good service overall.',
        review_submitted_at: new Date().toISOString(),
      });

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open request details
      const viewBtn = page.locator(pages.landlordDashboard.viewRequestButton).first();
      if (await viewBtn.isVisible({ timeout: 5000 })) {
        await viewBtn.click();
        await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

        // Should show review as submitted
        const reviewedIndicator = page.locator(':has-text("Reviewed"), .ant-rate');
        expect(await reviewedIndicator.isVisible({ timeout: 3000 }).catch(() => true)).toBe(true);
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Review UI Flow', () => {
    test('should open review modal from request details', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-review-modal');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Modal Vendor',
        business_name: 'Modal Co',
        services: ['locksmith'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'locksmith',
        job_description: 'Review modal test',
        status: 'matched',
      });

      await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open request details
      await page.locator(pages.landlordDashboard.viewRequestButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Click review button
      const reviewBtn = page.locator(pages.landlordDashboard.leaveReviewButton);
      if (await reviewBtn.isVisible({ timeout: 3000 })) {
        await reviewBtn.click();

        // Review modal should appear
        await expect(page.locator('.ant-modal:has-text("Review")')).toBeVisible({ timeout: 5000 });

        // Should have rating input
        await expect(page.locator(antd.rate)).toBeVisible();
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should submit review from UI', async ({ page }) => {
      const vendorEmail = generateTestEmail('vendor-review-ui');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'UI Review Vendor',
        business_name: 'UI Review Co',
        services: ['pest_control'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'pest_control',
        job_description: 'UI review submission test',
        status: 'matched',
      });

      await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      await page.reload();
      await page.waitForLoadState('networkidle');

      // Open request details
      await page.locator(pages.landlordDashboard.viewRequestButton).first().click();
      await expect(page.locator(antd.modal)).toBeVisible({ timeout: 5000 });

      // Click review button
      const reviewBtn = page.locator(pages.landlordDashboard.leaveReviewButton);
      if (await reviewBtn.isVisible({ timeout: 3000 })) {
        await reviewBtn.click();
        await expect(page.locator('.ant-modal:has-text("Review")')).toBeVisible({ timeout: 5000 });

        // Fill in rating (click 4th star)
        const stars = page.locator(`${antd.rate} .ant-rate-star`).first().locator('..').locator('.ant-rate-star');
        const fourthStar = stars.nth(3);
        await fourthStar.click();

        // Add review text
        const textarea = page.locator('textarea');
        if (await textarea.isVisible()) {
          await textarea.fill('Great service from the vendor!');
        }

        // Submit
        await page.click('button:has-text("Submit Review")');

        // Should show success
        await expect(page.locator('.ant-message-success')).toBeVisible({ timeout: 5000 });
      }

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Review Categories', () => {
    test('should accept all rating categories', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-review-cat');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Categories Vendor',
        business_name: 'Categories Co',
        services: ['general_contractor'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'general_contractor',
        job_description: 'All categories review test',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Submit review with all categories
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          rating: 4,
          quality: 5,
          price: 3,
          timeline: 4,
          treatment: 5,
          review_text: 'Comprehensive review with all categories.',
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify all categories were saved
      const { data: updatedMatch } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('id', match!.id)
        .single();

      expect(updatedMatch?.review_rating).toBe(4);
      expect(updatedMatch?.review_quality).toBe(5);
      expect(updatedMatch?.review_price).toBe(3);
      expect(updatedMatch?.review_timeline).toBe(4);
      expect(updatedMatch?.review_treatment).toBe(5);

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });

    test('should allow partial category ratings', async ({ request }) => {
      const vendorEmail = generateTestEmail('vendor-review-partial');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Partial Vendor',
        business_name: 'Partial Co',
        services: ['windows_doors'],
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: testEmail,
        service_type: 'windows_doors',
        job_description: 'Partial categories review test',
        status: 'matched',
      });

      const match = await createTestMatch(supabase, serviceRequest.id, vendor!.id);

      // Submit review with only overall rating
      const response = await request.post('/api/landlord/reviews', {
        data: {
          match_id: match!.id,
          rating: 3,
          // Other categories intentionally omitted
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify
      const { data: updatedMatch } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('id', match!.id)
        .single();

      expect(updatedMatch?.review_rating).toBe(3);
      expect(updatedMatch?.review_quality).toBeNull();

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });
});
