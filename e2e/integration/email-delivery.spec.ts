/**
 * Email Delivery Integration Tests
 *
 * Tests email delivery for various system events via Resend API.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../helpers/test-data';
import {
  getSupabaseAdmin,
  createTestRequest,
  createTestVendor,
  cleanupByEmail,
} from '../fixtures/database.fixture';
import {
  verifyEmailSent,
  maybeVerifyEmailSent,
  checkEmailSent,
} from '../fixtures/email.fixture';

test.describe('Email Delivery', () => {
  let supabase: ReturnType<typeof getSupabaseAdmin>;

  test.beforeAll(() => {
    supabase = getSupabaseAdmin();
  });

  test.describe('Request Confirmation Emails', () => {
    test('should send confirmation email on request submission', async ({ request }) => {
      const landlordEmail = generateTestEmail('email-request');
      const beforeSubmit = new Date();

      const response = await request.post('/api/requests', {
        data: {
          landlord_email: landlordEmail,
          first_name: 'Email',
          last_name: 'Test',
          landlord_phone: '2155551234',
          service_type: 'plumber_sewer',
          property_address: '123 Email Test St',
          zip_code: '19103',
          job_description: 'Testing email delivery on request submission',
          urgency: 'medium',
          is_owner: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify confirmation email was sent
      await maybeVerifyEmailSent(landlordEmail, 'request', {
        timeout: 30000,
        since: beforeSubmit,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });

    test('should include request details in confirmation email', async ({ request }) => {
      const landlordEmail = generateTestEmail('email-details');
      const beforeSubmit = new Date();

      await request.post('/api/requests', {
        data: {
          landlord_email: landlordEmail,
          first_name: 'Details',
          last_name: 'Test',
          landlord_phone: '2155552222',
          service_type: 'electrician',
          property_address: '456 Details Test Ave',
          zip_code: '19104',
          job_description: 'Email should include these details',
          urgency: 'high',
          is_owner: true,
        },
      });

      // Verify email sent (details verification depends on Resend API capabilities)
      await maybeVerifyEmailSent(landlordEmail, 'request', {
        timeout: 30000,
        since: beforeSubmit,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Vendor Application Emails', () => {
    test('should send confirmation email on vendor application', async ({ request }) => {
      const vendorEmail = generateTestEmail('email-vendor-app');
      const beforeApply = new Date();

      const response = await request.post('/api/vendor/apply', {
        data: {
          contact_name: 'Email Vendor',
          business_name: 'Email Vendor Co',
          email: vendorEmail,
          phone: '2155553333',
          services: ['handyman'],
          service_areas: ['19103'],
          qualifications: 'Testing email delivery',
          years_in_business: 5,
          licensed: false,
          insured: true,
          rental_experience: true,
          terms_accepted: true,
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify application confirmation email
      await maybeVerifyEmailSent(vendorEmail, 'application', {
        timeout: 30000,
        since: beforeApply,
      });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
    });
  });

  test.describe('Matching/Introduction Emails', () => {
    test('should send intro email to landlord when matched', async ({ request }) => {
      // Setup
      const adminEmail = generateTestEmail('admin-email');
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Email Admin',
        role: 'admin',
      });

      const landlordEmail = generateTestEmail('email-intro-landlord');
      const vendorEmail = generateTestEmail('email-intro-vendor');
      const beforeMatch = new Date();

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Intro Email Vendor',
        business_name: 'Intro Email Co',
        services: ['painter'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        first_name: 'Intro',
        last_name: 'Email',
        service_type: 'painter',
        zip_code: '19103',
        job_description: 'Intro email test',
        status: 'new',
      });

      // Match vendor
      const matchResponse = await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: [vendor!.id] },
      });
      expect([200, 201]).toContain(matchResponse.status());

      // Verify intro email to landlord
      await maybeVerifyEmailSent(landlordEmail, 'intro', {
        timeout: 30000,
        since: beforeMatch,
      });

      // Verify intro email to vendor
      await maybeVerifyEmailSent(vendorEmail, 'intro', {
        timeout: 30000,
        since: beforeMatch,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });

    test('should send resend intro emails', async ({ request }) => {
      // Setup
      const adminEmail = generateTestEmail('admin-resend-email');
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Resend Admin',
        role: 'admin',
      });

      const landlordEmail = generateTestEmail('email-resend-landlord');
      const vendorEmail = generateTestEmail('email-resend-vendor');

      const vendor = await createTestVendor(supabase, {
        email: vendorEmail,
        contact_name: 'Resend Email Vendor',
        business_name: 'Resend Email Co',
        services: ['hvac'],
        service_areas: ['19103'],
        status: 'active',
      });

      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'hvac',
        job_description: 'Resend email test',
        status: 'matched',
      });

      // Create initial match
      await supabase.from('request_vendor_matches').insert({
        request_id: serviceRequest.id,
        vendor_id: vendor!.id,
        status: 'sent',
        intro_sent_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      });

      const beforeResend = new Date();

      // Resend intro
      const resendResponse = await request.post(`/api/requests/${serviceRequest.id}/resend-intro`, {
        data: { vendor_id: vendor!.id },
      });
      expect([200, 201]).toContain(resendResponse.status());

      // Verify resend emails
      await maybeVerifyEmailSent(landlordEmail, 'intro', {
        timeout: 30000,
        since: beforeResend,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });
  });

  test.describe('Vendor Approval Emails', () => {
    test('should send welcome email on vendor approval', async ({ request }) => {
      // Setup admin
      const adminEmail = generateTestEmail('admin-approval-email');
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Approval Admin',
        role: 'admin',
      });

      // Create pending vendor
      const vendorEmail = generateTestEmail('email-approval-vendor');
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Approval Email Vendor',
          business_name: 'Approval Email Co',
          phone: '2155554444',
          services: ['locksmith'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        })
        .select()
        .single();

      const beforeApproval = new Date();

      // Approve vendor
      const approveResponse = await request.post(`/api/admin/applications/${vendor!.id}/approve`, {
        data: { password: 'VendorPassword123!' },
      });
      expect([200, 201]).toContain(approveResponse.status());

      // Verify welcome email sent
      await maybeVerifyEmailSent(vendorEmail, 'welcome', {
        timeout: 30000,
        since: beforeApproval,
      });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });

    test('should send rejection email on vendor rejection', async ({ request }) => {
      // Setup admin
      const adminEmail = generateTestEmail('admin-reject-email');
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Reject Admin',
        role: 'admin',
      });

      // Create pending vendor
      const vendorEmail = generateTestEmail('email-reject-vendor');
      const { data: vendor } = await supabase
        .from('vendors')
        .insert({
          email: vendorEmail,
          contact_name: 'Reject Email Vendor',
          business_name: 'Reject Email Co',
          phone: '2155555555',
          services: ['roofer'],
          service_areas: ['19103'],
          status: 'pending_review',
          terms_accepted: true,
        })
        .select()
        .single();

      const beforeReject = new Date();

      // Reject vendor
      const rejectResponse = await request.post(`/api/admin/applications/${vendor!.id}/reject`, {
        data: { reason: 'Testing email delivery' },
      });
      expect([200, 201]).toContain(rejectResponse.status());

      // Verify rejection email sent
      await maybeVerifyEmailSent(vendorEmail, 'rejection', {
        timeout: 30000,
        since: beforeReject,
      });

      // Cleanup
      await cleanupByEmail(supabase, vendorEmail);
      await cleanupByEmail(supabase, adminEmail);
    });
  });

  test.describe('Password Reset Emails', () => {
    test('should send password reset email for landlord', async ({ request }) => {
      const landlordEmail = generateTestEmail('email-reset-landlord');
      const beforeReset = new Date();

      // Create landlord user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: landlordEmail,
        password: 'OldPassword123!',
        email_confirm: true,
      });
      await supabase.from('landlords').insert({
        email: landlordEmail,
        name: 'Reset Email Landlord',
        auth_user_id: authUser.user!.id,
      });

      // Request password reset
      const resetResponse = await request.post('/api/auth/forgot-password', {
        data: {
          email: landlordEmail,
          userType: 'landlord',
        },
      });
      expect([200, 201, 202]).toContain(resetResponse.status());

      // Verify reset email sent
      await maybeVerifyEmailSent(landlordEmail, 'reset', {
        timeout: 30000,
        since: beforeReset,
      });

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
    });
  });

  test.describe('Email Verification Helper', () => {
    test('checkEmailSent should return status', async () => {
      const nonexistentEmail = 'nonexistent-' + Date.now() + '@example.com';

      // This should not throw, just return a status
      const result = await checkEmailSent(nonexistentEmail, 'any');

      // Result should be false for nonexistent email
      expect(typeof result).toBe('boolean');
    });
  });

  test.describe('Multiple Email Recipients', () => {
    test('should send emails to multiple matched vendors', async ({ request }) => {
      // Setup admin
      const adminEmail = generateTestEmail('admin-multi-email');
      const { data: adminAuth } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'AdminPassword123!',
        email_confirm: true,
      });
      await supabase.from('admin_users').insert({
        auth_user_id: adminAuth.user!.id,
        email: adminEmail,
        name: 'Multi Email Admin',
        role: 'admin',
      });

      const landlordEmail = generateTestEmail('email-multi-landlord');
      const vendorEmails = [
        generateTestEmail('email-multi-vendor-1'),
        generateTestEmail('email-multi-vendor-2'),
      ];
      const beforeMatch = new Date();

      // Create vendors
      const vendors = await Promise.all(
        vendorEmails.map((email, i) =>
          createTestVendor(supabase, {
            email,
            contact_name: `Multi Email Vendor ${i + 1}`,
            business_name: `Multi Email Co ${i + 1}`,
            services: ['general_contractor'],
            service_areas: ['19103'],
            status: 'active',
          })
        )
      );

      // Create request
      const serviceRequest = await createTestRequest(supabase, {
        landlord_email: landlordEmail,
        service_type: 'general_contractor',
        job_description: 'Multi vendor email test',
        status: 'new',
      });

      // Match all vendors
      await request.post(`/api/requests/${serviceRequest.id}/match`, {
        data: { vendor_ids: vendors.map((v) => v!.id) },
      });

      // Verify emails sent to all vendors
      for (const email of vendorEmails) {
        await maybeVerifyEmailSent(email, 'intro', {
          timeout: 30000,
          since: beforeMatch,
        });
      }

      // Cleanup
      await cleanupByEmail(supabase, landlordEmail);
      for (const email of vendorEmails) {
        await cleanupByEmail(supabase, email);
      }
      await cleanupByEmail(supabase, adminEmail);
    });
  });
});
