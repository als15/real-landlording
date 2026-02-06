/**
 * Complete Flow Integration Tests
 *
 * Tests the full end-to-end flow from request submission
 * through vendor matching and completion.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../helpers/test-data';
import { pages, antd } from '../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestVendor,
  cleanupByEmail,
} from '../fixtures/database.fixture';
import { maybeVerifyEmailSent } from '../fixtures/email.fixture';

test.describe('Complete Service Request Flow', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;

  test.beforeAll(() => {
    supabase = getSupabaseAdmin();
  });

  test.describe('Full Flow: Submit Request → Match → Complete', () => {
    test('should complete full request lifecycle', async ({ page, request }) => {
      // Setup: Create admin user
      const adminEmail = generateTestEmail('admin-flow');
      const adminPassword = 'AdminPassword123!';
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Flow Admin',
        role: 'admin',
      });

      // Setup: Create vendor
      const vendorEmail = generateTestEmail('vendor-flow');
      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Flow Test Vendor',
        business_name: 'Flow Test Co',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        status: 'active',
      });

      // Step 1: Landlord submits a request (public form)
      const landlordEmail = generateTestEmail('landlord-flow');
      const beforeSubmit = new Date();

      await page.goto('/request');
      await page.waitForLoadState('networkidle');

      // Fill Step 1: Contact
      await page.fill(pages.requestForm.firstName, 'Flow');
      await page.fill(pages.requestForm.lastName, 'Test');
      await page.fill(pages.requestForm.email, landlordEmail);
      await page.fill(pages.requestForm.phone, '2155551234');

      await page.click(pages.requestForm.nextButton);
      await page.waitForTimeout(500);

      // Fill Step 2: Service
      const serviceSelect = page.locator(pages.requestForm.serviceType);
      if (await serviceSelect.isVisible()) {
        await serviceSelect.click();
        await page.click('.ant-select-item-option:has-text("Plumber")');
      }

      await page.fill(pages.requestForm.propertyAddress, '123 Flow Test St');
      await page.fill(pages.requestForm.zipCode, '19103');
      await page.fill(pages.requestForm.jobDescription, 'Complete flow test - need plumber for leak');

      await page.click(pages.requestForm.nextButton).catch(() => {});
      await page.waitForTimeout(500);
      await page.click(pages.requestForm.submitButton).catch(() => {});

      // Wait for success
      await expect(page.locator(pages.requestForm.successResult)).toBeVisible({ timeout: 15000 });

      // Verify confirmation email sent
      await maybeVerifyEmailSent(landlordEmail, 'request', {
        timeout: 20000,
        since: beforeSubmit,
      });

      // Step 2: Verify request in database
      const { data: requests } = await supabase
        .from('service_requests')
        .select('*')
        .eq('landlord_email', landlordEmail);

      expect(requests?.length).toBe(1);
      const serviceRequest = requests![0];
      expect(serviceRequest.status).toBe('new');

      // Step 3: Admin logs in and matches vendor
      await page.goto('/login');
      await page.fill(pages.login.emailInput, adminEmail);
      await page.fill(pages.login.passwordInput, adminPassword);
      await page.click(pages.login.submitButton);
      await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

      // Match vendor via API
      const matchResponse = await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: [vendor!.id] },
      });
      expect([200, 201]).toContain(matchResponse.status());

      // Verify request status updated
      const { data: matchedRequest } = await supabase
        .from('service_requests')
        .select('status')
        .eq('id', serviceRequest.id)
        .single();
      expect(['matching', 'matched']).toContain(matchedRequest?.status);

      // Verify match created
      const { data: matches } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('request_id', serviceRequest.id);
      expect(matches?.length).toBe(1);
      expect(matches![0].vendor_id).toBe(vendor!.id);

      // Step 4: Landlord signs up to track request
      await page.goto('/auth/signup');
      await page.fill(pages.signup.nameInput, 'Flow Test Landlord');
      await page.fill(pages.signup.emailInput, landlordEmail);
      await page.fill(pages.signup.passwordInput, 'LandlordPassword123!');
      await page.fill(pages.signup.confirmPasswordInput, 'LandlordPassword123!');
      await page.click(pages.signup.submitButton);

      // Wait for signup success (or email confirmation page)
      await page.waitForTimeout(3000);

      // Step 5: Verify landlord can see their request
      // Need to confirm email first if required
      const { data: landlordAuth } = await supabase.auth.admin.updateUserById(
        (await supabase.from('landlords').select('auth_user_id').eq('email', landlordEmail).single()).data?.auth_user_id || '',
        { email_confirm: true }
      );

      await page.goto('/auth/login');
      await page.fill(pages.login.emailInput, landlordEmail);
      await page.fill(pages.login.passwordInput, 'LandlordPassword123!');
      await page.click(pages.login.submitButton);

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Should see the request
      await expect(page.locator(antd.table)).toBeVisible({ timeout: 10000 });

      // Step 6: Landlord submits a review
      const reviewResponse = await request.post('/api/landlord/reviews', {
        data: {
          match_id: matches![0].id,
          rating: 5,
          quality: 5,
          price: 4,
          timeline: 5,
          treatment: 5,
          review_text: 'Excellent service! Very professional.',
        },
      });
      expect([200, 201]).toContain(reviewResponse.status());

      // Verify review saved
      const { data: reviewedMatch } = await supabase
        .from('request_vendor_matches')
        .select('review_rating, review_text')
        .eq('id', matches![0].id)
        .single();
      expect(reviewedMatch?.review_rating).toBe(5);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });
  });

  test.describe('Vendor Application → Approval → Dashboard Access', () => {
    test('should allow vendor to apply and access dashboard after approval', async ({ page, request }) => {
      // Setup: Create admin
      const adminEmail = generateTestEmail('admin-vendor-flow');
      const adminPassword = 'AdminPassword123!';
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Vendor Flow Admin',
        role: 'admin',
      });

      // Step 1: Vendor applies
      const vendorEmail = generateTestEmail('vendor-apply-flow');
      const beforeApply = new Date();

      const applyResponse = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Apply Flow Vendor',
          business_name: 'Apply Flow Co',
          email: vendorEmail,
          phone: '2155559999',
          services: ['electrician'],
          service_areas: ['19103'],
          qualifications: 'Licensed electrician with 10 years experience',
          years_in_business: 10,
          licensed: true,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });
      expect([200, 201]).toContain(applyResponse.status());

      // Verify vendor created with pending status
      const { data: pendingVendor } = await supabase
        .from('vendors')
        .select('*')
        .eq('email', vendorEmail)
        .single();
      expect(pendingVendor?.status).toBe('pending_review');

      // Step 2: Verify vendor cannot login yet
      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, vendorEmail);
      await page.fill(pages.login.passwordInput, 'AnyPassword123!');
      await page.click(pages.login.submitButton);

      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
      expect(page.url()).toContain('/vendor/login');

      // Step 3: Admin approves the application
      const vendorPassword = 'VendorPassword123!';
      const approveResponse = await request.post(`/api/admin/applications/${pendingVendor!.id}/approve`, {
        data: { password: vendorPassword },
      });
      expect([200, 201]).toContain(approveResponse.status());

      // Verify status changed to active
      const { data: activeVendor } = await supabase
        .from('vendors')
        .select('status')
        .eq('id', pendingVendor!.id)
        .single();
      expect(activeVendor?.status).toBe('active');

      // Step 4: Vendor can now login
      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, vendorEmail);
      await page.fill(pages.login.passwordInput, vendorPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });
      expect(page.url()).toContain('/vendor/dashboard');

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });
  });

  test.describe('Multi-Vendor Matching', () => {
    test('should match multiple vendors to single request', async ({ request }) => {
      // Setup: Create admin
      const adminEmail = generateTestEmail('admin-multi');
      const adminPassword = 'AdminPassword123!';
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Multi Admin',
        role: 'admin',
      });

      // Create multiple vendors
      const vendorEmails = [
        generateTestEmail('vendor-multi-1'),
        generateTestEmail('vendor-multi-2'),
        generateTestEmail('vendor-multi-3'),
      ];

      const vendors = await Promise.all(
        vendorEmails.map((email, i) =>
          createTestVendor(supabase, {
            email,
            contact_name: `Multi Vendor ${i + 1}`,
            business_name: `Multi Co ${i + 1}`,
            services: ['handyman'],
            service_areas: ['19103'],
            status: 'active',
          })
        )
      );

      // Create request
      const landlordEmail = generateTestEmail('landlord-multi');
      const createResponse = await request.post('/api/requests', {
        data: {
          landlord_email: landlordEmail,
          first_name: 'Multi',
          last_name: 'Test',
          landlord_phone: '2155551234',
          service_type: 'handyman',
          property_address: '123 Multi Test St',
          zip_code: '19103',
          job_description: 'Multi-vendor matching test',
          urgency: 'medium',
          is_owner: true,
        },
      });
      expect([200, 201]).toContain(createResponse.status());
      const { id: requestId } = await createResponse.json();

      // Match all 3 vendors
      const matchResponse = await request.post(`/api/requests/${requestId}/match`, {
        data: { vendor_ids: vendors.map((v) => v!.id) },
      });
      expect([200, 201]).toContain(matchResponse.status());

      // Verify all matches created
      const { data: matches } = await supabase
        .from('request_vendor_matches')
        .select('*')
        .eq('request_id', requestId);

      expect(matches?.length).toBe(3);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      for (const email of vendorEmails) {
        await cleanupByEmail(supabase, email);
      }
      await cleanupByEmail(supabase, adminEmail);
    });
  });

  test.describe('Request Urgency Handling', () => {
    test('should handle emergency requests', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-emergency');

      const response = await request.post('/api/requests', {
        data: {
          landlord_email: landlordEmail,
          first_name: 'Emergency',
          last_name: 'Test',
          landlord_phone: '2155551111',
          service_type: 'plumber_sewer',
          property_address: '123 Emergency St',
          zip_code: '19103',
          job_description: 'EMERGENCY: Pipe burst flooding basement!',
          urgency: 'emergency',
          is_owner: true,
        },
      });
      expect([200, 201]).toContain(response.status());

      // Verify request created with emergency urgency
      const { data: emergencyRequest } = await supabase
        .from('service_requests')
        .select('urgency')
        .eq('landlord_email', landlordEmail)
        .single();

      expect(emergencyRequest?.urgency).toBe('emergency');

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Duplicate Request Prevention', () => {
    test('should handle rapid duplicate submissions gracefully', async ({ request }) => {
      const landlordEmail = generateTestEmail('landlord-dup');

      // Submit same request twice quickly
      const responses = await Promise.all([
        request.post('/api/requests', {
          data: {
            landlord_email: landlordEmail,
            first_name: 'Dup',
            last_name: 'Test',
            landlord_phone: '2155552222',
            service_type: 'electrician',
            property_address: '123 Dup St',
            zip_code: '19103',
            job_description: 'Duplicate test',
            urgency: 'low',
            is_owner: true,
          },
        }),
        request.post('/api/requests', {
          data: {
            landlord_email: landlordEmail,
            first_name: 'Dup',
            last_name: 'Test',
            landlord_phone: '2155552222',
            service_type: 'electrician',
            property_address: '123 Dup St',
            zip_code: '19103',
            job_description: 'Duplicate test',
            urgency: 'low',
            is_owner: true,
          },
        }),
      ]);

      // Both should succeed (or one might be blocked)
      const successCount = responses.filter((r) => [200, 201].includes(r.status())).length;
      expect(successCount).toBeGreaterThanOrEqual(1);

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });
});
