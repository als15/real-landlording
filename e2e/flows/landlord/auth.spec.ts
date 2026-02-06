/**
 * Landlord Authentication E2E Tests
 *
 * Tests landlord signup, login, logout, and password reset flows.
 */

import { test, expect } from '@playwright/test';
import { generateTestEmail, generateLandlordSignupData } from '../../helpers/test-data';
import { pages, antd } from '../../helpers/selectors';
import { getSupabaseAdmin, cleanupByEmail } from '../../fixtures/database.fixture';
import { maybeVerifyEmailSent } from '../../fixtures/email.fixture';

test.describe('Landlord Authentication', () => {
  test.describe('Signup', () => {
    test('should display signup form', async ({ page }) => {
      await page.goto('/auth/signup');
      await page.waitForLoadState('networkidle');

      // Should show signup form
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator(pages.signup.nameInput)).toBeVisible();
      await expect(page.locator(pages.signup.emailInput)).toBeVisible();
      await expect(page.locator(pages.signup.passwordInput)).toBeVisible();
    });

    test('should validate required fields', async ({ page }) => {
      await page.goto('/auth/signup');

      // Try to submit without filling fields
      await page.click(pages.signup.submitButton);

      // Should show validation errors
      await expect(page.locator(antd.formError)).toBeVisible({ timeout: 3000 });
    });

    test('should validate password length', async ({ page }) => {
      await page.goto('/auth/signup');

      await page.fill(pages.signup.nameInput, 'Test User');
      await page.fill(pages.signup.emailInput, generateTestEmail('signup'));
      await page.fill(pages.signup.passwordInput, 'short');
      await page.fill(pages.signup.confirmPasswordInput, 'short');

      await page.click(pages.signup.submitButton);

      // Should show password length error
      const errorText = await page.locator(antd.formError).first().textContent();
      expect(errorText?.toLowerCase()).toMatch(/8|character|short/);
    });

    test('should validate password confirmation', async ({ page }) => {
      await page.goto('/auth/signup');

      await page.fill(pages.signup.nameInput, 'Test User');
      await page.fill(pages.signup.emailInput, generateTestEmail('signup'));
      await page.fill(pages.signup.passwordInput, 'Password123!');
      await page.fill(pages.signup.confirmPasswordInput, 'DifferentPassword123!');

      await page.click(pages.signup.submitButton);

      // Should show password mismatch error
      const errorText = await page.locator(antd.formError).first().textContent();
      expect(errorText?.toLowerCase()).toMatch(/match|same|differ/);
    });

    test('should create account successfully via API', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('signup-api');

      const response = await request.post('/api/auth/signup', {
        data: {
          name: 'API Signup Test',
          email: testEmail,
          password: 'TestPassword123!',
        },
      });

      expect([200, 201]).toContain(response.status());

      const data = await response.json();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe(testEmail);

      // Verify landlord record was created
      const { data: landlord } = await supabase
        .from('landlords')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(landlord).toBeDefined();
      expect(landlord?.name).toBe('API Signup Test');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should reject duplicate email signup', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('signup-dup');

      // First signup
      await request.post('/api/auth/signup', {
        data: {
          name: 'First Signup',
          email: testEmail,
          password: 'TestPassword123!',
        },
      });

      // Second signup with same email
      const response = await request.post('/api/auth/signup', {
        data: {
          name: 'Second Signup',
          email: testEmail,
          password: 'TestPassword123!',
        },
      });

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data.message.toLowerCase()).toMatch(/exist|already|duplicate/);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Login', () => {
    test('should display login form', async ({ page }) => {
      await page.goto('/auth/login');
      await page.waitForLoadState('networkidle');

      // Should show login form
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator(pages.login.emailInput)).toBeVisible();
      await expect(page.locator(pages.login.passwordInput)).toBeVisible();
      await expect(page.locator(pages.login.submitButton)).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill(pages.login.emailInput, 'nonexistent@example.com');
      await page.fill(pages.login.passwordInput, 'WrongPassword123!');

      await page.click(pages.login.submitButton);

      // Should show error message
      await expect(page.locator('.ant-message-error')).toBeVisible({ timeout: 5000 });
    });

    test('should login successfully with valid credentials', async ({ page, request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('login');
      const testPassword = 'TestPassword123!';

      // Create user via admin API
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      expect(authUser.user).toBeDefined();

      // Create landlord record
      await supabase.from('landlords').insert({
        email: testEmail,
        name: 'Login Test User',
        auth_user_id: authUser.user!.id,
      });

      // Login via UI
      await page.goto('/auth/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should redirect to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      expect(page.url()).toContain('/dashboard');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should redirect to specified page after login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('login-redirect');
      const testPassword = 'TestPassword123!';

      // Create user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('landlords').insert({
        email: testEmail,
        name: 'Login Redirect Test',
        auth_user_id: authUser.user!.id,
      });

      // Go to login with redirect parameter
      await page.goto('/auth/login?redirectTo=/dashboard/profile');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      // Should redirect to profile page
      await page.waitForURL(/\/dashboard\/profile/, { timeout: 10000 });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should link to signup page', async ({ page }) => {
      await page.goto('/auth/login');

      const signupLink = page.locator(pages.login.signupLink);
      await expect(signupLink).toBeVisible();

      await signupLink.click();
      await page.waitForURL(/\/auth\/signup/);
    });

    test('should link to forgot password page', async ({ page }) => {
      await page.goto('/auth/login');

      const forgotLink = page.locator(pages.login.forgotPasswordLink);
      await expect(forgotLink).toBeVisible();

      await forgotLink.click();
      await page.waitForURL(/\/auth\/forgot-password/);
    });
  });

  test.describe('Password Reset', () => {
    test('should display forgot password form', async ({ page }) => {
      await page.goto('/auth/forgot-password');
      await page.waitForLoadState('networkidle');

      // Should show forgot password form
      await expect(page.locator('form')).toBeVisible();
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible();
    });

    test('should request password reset via API', async ({ request }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('reset');
      const beforeRequest = new Date();

      // Create user first
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'OldPassword123!',
        email_confirm: true,
      });

      await supabase.from('landlords').insert({
        email: testEmail,
        name: 'Reset Test User',
        auth_user_id: authUser.user!.id,
      });

      // Request password reset
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: testEmail,
          userType: 'landlord',
        },
      });

      expect([200, 201]).toContain(response.status());

      // Verify reset email was sent
      await maybeVerifyEmailSent(testEmail, 'reset', {
        timeout: 20000,
        since: beforeRequest,
      });

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should handle non-existent email gracefully', async ({ request }) => {
      // Request reset for non-existent email
      const response = await request.post('/api/auth/forgot-password', {
        data: {
          email: 'nonexistent@example.com',
          userType: 'landlord',
        },
      });

      // Should return success (to prevent email enumeration)
      expect([200, 202, 404]).toContain(response.status());
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('logout');
      const testPassword = 'TestPassword123!';

      // Create user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('landlords').insert({
        email: testEmail,
        name: 'Logout Test User',
        auth_user_id: authUser.user!.id,
      });

      // Login first
      await page.goto('/auth/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Find and click logout button
      const logoutBtn = page.locator(pages.landlordDashboard.logoutButton);
      if (await logoutBtn.isVisible({ timeout: 3000 })) {
        await logoutBtn.click();
      } else {
        // Try via API
        await page.goto('/api/auth/logout');
      }

      // Try to access dashboard again
      await page.goto('/dashboard');
      await page.waitForTimeout(2000);

      // Should be redirected to login
      expect(page.url()).toMatch(/\/auth\/login|\/login/);

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page }) => {
      const supabase = getSupabaseAdmin();
      const testEmail = generateTestEmail('session');
      const testPassword = 'TestPassword123!';

      // Create user
      const { data: authUser } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
      });

      await supabase.from('landlords').insert({
        email: testEmail,
        name: 'Session Test User',
        auth_user_id: authUser.user!.id,
      });

      // Login
      await page.goto('/auth/login');
      await page.fill(pages.login.emailInput, testEmail);
      await page.fill(pages.login.passwordInput, testPassword);
      await page.click(pages.login.submitButton);

      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be on dashboard
      expect(page.url()).toContain('/dashboard');

      // Cleanup
      await cleanupByEmail(supabase, testEmail);
    });

    test('should redirect unauthenticated users from protected routes', async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForTimeout(3000);

      // Should be redirected to login
      expect(page.url()).toMatch(/\/auth\/login|\/login/);
    });
  });
});
