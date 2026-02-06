/**
 * Vendor Authentication E2E Tests
 *
 * Tests vendor login and access control based on status.
 * Note: Vendors don't sign up - they apply and get approved.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import {
  getSupabaseAdmin,
  createTestVendor,
  cleanupByEmail,
} from '../../fixtures/database.fixture';

test.describe('Vendor Authentication', () => {
  test.describe('Login Page', () => {
    test('should display vendor login form', async ({ page }) => {
      await page.goto('/vendor/login');
      await page.waitForLoadState('networkidle');

      // Should show login form
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator(pages.login.emailInput)).toBeVisible();
      await expect(page.locator(pages.login.passwordInput)).toBeVisible();
      await expect(page.locator(pages.login.submitButton)).toBeVisible();
    });

    test('should link to vendor application', async ({ page }) => {
      await page.goto('/vendor/login');

      // Look for apply link
      const applyLink = page.locator('a:has-text("Apply"), a:has-text("Join"), a:has-text("apply")');
      if (await applyLink.isVisible({ timeout: 3000 })) {
        await applyLink.click();
        await page.waitForURL(/\/vendor\/apply/);
      }
    });
  });

  test.describe('Login Validation', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/vendor/login');

      await page.fill(pages.login.emailInput, 'nonexistent@vendor.com');
      await page.fill(pages.login.passwordInput, 'WrongPassword123!');
      await page.click(pages.login.submitButton);

      // Should show error message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
    });

    test('should show error for non-vendor email', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('non-vendor');
      const testPassword = 'TestPassword123!';

      // Create auth user without vendor record
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should show not a vendor error
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Vendor Status Access Control', () => {
    test('should block pending_review vendors from login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-pending');
      const testPassword = 'TestPassword123!';

      // Create auth user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      // Create pending vendor
      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Pending Vendor',
        business_name: 'Pending Co',
        phone: '2155551234',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'pending_review',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should show pending review message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
      const messageText = await page.locator('.ant-message-error').textContent();
      expect(messageText?.toLowerCase()).toMatch(/review|pending|approved/);

      // Should stay on login page
      expect(page.url()).toContain('/vendor/login');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should block rejected vendors from login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-rejected');
      const testPassword = 'TestPassword123!';

      // Create auth user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      // Create rejected vendor
      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Rejected Vendor',
        business_name: 'Rejected Co',
        phone: '2155551234',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'rejected',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should show rejected message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should block inactive vendors from login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-inactive');
      const testPassword = 'TestPassword123!';

      // Create auth user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      // Create inactive vendor
      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Inactive Vendor',
        business_name: 'Inactive Co',
        phone: '2155551234',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'inactive',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should show inactive message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should allow active vendors to login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-active');
      const testPassword = 'TestPassword123!';

      // Create auth user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      // Create active vendor
      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Active Vendor',
        business_name: 'Active Co',
        phone: '2155551234',
        services: ['handyman'],
        service_areas: ['19103'],
        status: 'active',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should redirect to dashboard
      await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });
      expect(page.url()).toContain('/vendor/dashboard');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Vendor Login API', () => {
    test('should return vendor info on successful login', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-api');
      const testPassword = 'TestPassword123!';

      // Create auth user and vendor
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'API Test Vendor',
        business_name: 'API Test Co',
        phone: '2155551234',
        services: ['electrician'],
        service_areas: ['19103'],
        status: 'active',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      const response = await request.post('/api/vendor/login', {
        data: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.vendor).toBeDefined();
      expect(data.vendor.business_name).toBe('API Test Co');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should return 403 for pending vendor', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-pending-api');
      const testPassword = 'TestPassword123!';

      // Create auth user and pending vendor
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Pending API Vendor',
        business_name: 'Pending API Co',
        phone: '2155551234',
        services: ['plumber_sewer'],
        service_areas: ['19103'],
        status: 'pending_review',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      const response = await request.post('/api/vendor/login', {
        data: {
          email: testEmail,
          password: testPassword,
        },
      });

      expect(response.status()).toBe(403);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from vendor dashboard', async ({ page }) => {
      await page.goto('/vendor/dashboard');
      await page.waitForTimeout(3000);

      // Should redirect to login
      expect(page.url()).toMatch(/\/vendor\/login|\/login/);
    });

    test('should redirect unauthenticated users from vendor profile', async ({ page }) => {
      await page.goto('/vendor/dashboard/profile');
      await page.waitForTimeout(3000);

      // Should redirect to login
      expect(page.url()).toMatch(/\/vendor\/login|\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should persist vendor session across reloads', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('vendor-session');
      const testPassword = 'TestPassword123!';

      // Create active vendor
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('vendors').insert({
        email: testEmail,
        contact_name: 'Session Vendor',
        business_name: 'Session Co',
        phone: '2155551234',
        services: ['hvac'],
        service_areas: ['19103'],
        status: 'active',
        terms_accepted: true,
        auth_user_id: authUser.user!.id,
      });

      // Login
      await page.goto('/vendor/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/\/vendor\/dashboard/, { timeout: 10000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be on dashboard
      expect(page.url()).toContain('/vendor/dashboard');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });
});
