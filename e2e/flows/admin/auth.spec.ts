/**
 * Admin Authentication E2E Tests
 *
 * Tests admin login, access control, and session management.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import { getSupabaseAdmin, cleanupByEmail } from '../../fixtures/database.fixture';

test.describe('Admin Authentication', () => {
  test.describe('Login Page', () => {
    test('should display admin login form', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Should show login form with admin branding
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator(':has-text("Admin Login")')).toBeVisible();
      await expect(page.locator(pages.login.emailInput)).toBeVisible();
      await expect(page.locator(pages.login.passwordInput)).toBeVisible();
    });
  });

  test.describe('Login Validation', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill(pages.login.emailInput, 'invalid@admin.com');
      await page.fill(pages.login.passwordInput, 'WrongPassword123!');
      await page.click(pages.login.submitButton);

      // Should show error
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
    });

    test('should deny non-admin users', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('non-admin');
      const testPassword = 'TestPassword123!';

      // Create regular user (not admin)
      await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await page.goto('/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should show access denied error
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });

      // Should stay on login page
      expect(page.url()).toContain('/login');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should allow admin users to login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('admin-login');
      const testPassword = 'AdminPassword123!';

      // Create admin user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      // Create admin record
      await supabase.from('admin_users').insert({
        auth_user_id: authUser.user!.id,
        email: testEmail,
        name: 'Test Admin',
        role: 'admin',
      });

      await page.goto('/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should redirect to admin dashboard
      await page.waitForURL(/^\/$|\/requests|\/dashboard/, { timeout: 10000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Protected Routes', () => {
    test('should redirect unauthenticated users from admin pages', async ({ page }) => {
      // Try to access admin routes
      await page.goto('/requests');
      await page.waitForTimeout(3000);

      // Should redirect to login
      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from vendors page', async ({ page }) => {
      await page.goto('/vendors');
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from applications page', async ({ page }) => {
      await page.goto('/applications');
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from landlords page', async ({ page }) => {
      await page.goto('/landlords');
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('/login');
    });

    test('should redirect unauthenticated users from analytics page', async ({ page }) => {
      await page.goto('/analytics');
      await page.waitForTimeout(3000);

      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Session Management', () => {
    test('should persist admin session across reloads', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('admin-session');
      const testPassword = 'AdminPassword123!';

      // Create admin
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('admin_users').insert({
        auth_user_id: authUser.user!.id,
        email: testEmail,
        name: 'Session Admin',
        role: 'admin',
      });

      // Login
      await page.goto('/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

      // Reload
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be on admin area
      expect(page.url()).not.toContain('/login');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should redirect logged-in admin from login page', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('admin-redirect');
      const testPassword = 'AdminPassword123!';

      // Create admin
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('admin_users').insert({
        auth_user_id: authUser.user!.id,
        email: testEmail,
        name: 'Redirect Admin',
        role: 'admin',
      });

      // Login first
      await page.goto('/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/^\/$|\/requests/, { timeout: 10000 });

      // Try to go to login page again
      await page.goto('/login');
      await page.waitForTimeout(2000);

      // Should redirect to admin dashboard
      expect(page.url()).not.toContain('/login');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Legacy Route Redirects', () => {
    test('should redirect /admin routes to new routes', async ({ page }) => {
      await page.goto('/admin/requests');
      await page.waitForTimeout(2000);

      // Should redirect (to /requests or /login if not authenticated)
      expect(page.url()).not.toContain('/admin/');
    });

    test('should redirect /admin/login to /login', async ({ page }) => {
      await page.goto('/admin/login');
      await page.waitForTimeout(2000);

      expect(page.url()).toContain('/login');
      expect(page.url()).not.toContain('/admin/login');
    });
  });
});
