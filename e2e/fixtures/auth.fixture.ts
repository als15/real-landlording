/**
 * Authentication Fixture for E2E Tests
 *
 * Extends Playwright's test object with authenticated page fixtures
 * for admin, landlord, and vendor users.
 */

import { test as base, Page, BrowserContext } from '@playwright/test';
import { SupabaseClient } from '@supabase/supabase-js';
import {
  getSupabaseAdmin,
  createTestLandlord,
  createTestVendor,
  cleanupLandlord,
  cleanupVendor,
  TestLandlord,
  TestVendor,
  TEST_PASSWORD,
} from './database.fixture';

// ============================================================================
// Types
// ============================================================================

interface AuthFixtures {
  /** Supabase admin client for data operations */
  supabaseAdmin: SupabaseClient;

  /** Page logged in as admin user */
  adminPage: Page;

  /** Page logged in as a test landlord (created and cleaned up automatically) */
  landlordPage: Page;

  /** The landlord user data for the landlordPage */
  testLandlord: TestLandlord;

  /** Page logged in as a test vendor (created and cleaned up automatically) */
  vendorPage: Page;

  /** The vendor user data for the vendorPage */
  testVendor: TestVendor;
}

// ============================================================================
// Login Helper Functions
// ============================================================================

/**
 * Login as admin user via the UI
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
  }

  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"], #email', adminEmail);
  await page.fill('input[type="password"], input[name="password"], #password', adminPassword);
  await page.click('button[type="submit"]');

  // Wait for redirect to admin area
  await page.waitForURL(/\/(requests|dashboard|analytics|vendors|applications|landlords)?$/, {
    timeout: 15000,
  });
}

/**
 * Login as landlord user via the UI
 */
export async function loginAsLandlord(
  page: Page,
  landlord: TestLandlord | { email: string; password: string }
): Promise<void> {
  await page.goto('/auth/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"], #email', landlord.email);
  await page.fill('input[type="password"], input[name="password"], #password', landlord.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await page.waitForURL(/\/dashboard/, { timeout: 15000 });
}

/**
 * Login as vendor user via the UI
 */
export async function loginAsVendor(
  page: Page,
  vendor: TestVendor | { email: string; password: string }
): Promise<void> {
  await page.goto('/vendor/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"], #email', vendor.email);
  await page.fill('input[type="password"], input[name="password"], #password', vendor.password);
  await page.click('button[type="submit"]');

  // Wait for redirect to vendor dashboard
  await page.waitForURL(/\/vendor\/dashboard/, { timeout: 15000 });
}

/**
 * Logout the current user
 */
export async function logout(page: Page): Promise<void> {
  // Try clicking logout button if visible
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")').first();

  if (await logoutButton.isVisible({ timeout: 2000 })) {
    await logoutButton.click();
  } else {
    // Fallback: call logout API directly
    await page.evaluate(async () => {
      await fetch('/api/auth/logout', { method: 'POST' });
    });
  }

  await page.waitForURL(/\/(login|auth\/login)/, { timeout: 5000 });
}

// ============================================================================
// Extended Test with Fixtures
// ============================================================================

export const test = base.extend<AuthFixtures>({
  // Supabase admin client
  supabaseAdmin: async ({}, use) => {
    const client = getSupabaseAdmin();
    await use(client);
  },

  // Admin authenticated page
  adminPage: async ({ browser }, use) => {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      throw new Error('ADMIN_EMAIL and ADMIN_PASSWORD are required for admin tests');
    }

    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsAdmin(page);
      await use(page);
    } finally {
      await context.close();
    }
  },

  // Test landlord data (created fresh for each test)
  testLandlord: async ({ supabaseAdmin }, use) => {
    const landlord = await createTestLandlord(supabaseAdmin);

    try {
      await use(landlord);
    } finally {
      await cleanupLandlord(supabaseAdmin, landlord);
    }
  },

  // Landlord authenticated page
  landlordPage: async ({ browser, testLandlord }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsLandlord(page, testLandlord);
      await use(page);
    } finally {
      await context.close();
    }
  },

  // Test vendor data (created fresh for each test)
  testVendor: async ({ supabaseAdmin }, use) => {
    const vendor = await createTestVendor(supabaseAdmin, { status: 'active' });

    try {
      await use(vendor);
    } finally {
      await cleanupVendor(supabaseAdmin, vendor);
    }
  },

  // Vendor authenticated page
  vendorPage: async ({ browser, testVendor }, use) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await loginAsVendor(page, testVendor);
      await use(page);
    } finally {
      await context.close();
    }
  },
});

// Re-export expect from Playwright
export { expect } from '@playwright/test';

// ============================================================================
// Auth State Storage (for faster tests)
// ============================================================================

/**
 * Save authentication state to a file for reuse
 */
export async function saveAuthState(
  context: BrowserContext,
  path: string
): Promise<void> {
  await context.storageState({ path });
}

/**
 * Create a new context with saved authentication state
 */
export async function createAuthenticatedContext(
  browser: { newContext: (options?: { storageState?: string }) => Promise<BrowserContext> },
  storageStatePath: string
): Promise<BrowserContext> {
  return browser.newContext({ storageState: storageStatePath });
}

// ============================================================================
// Test Utilities
// ============================================================================

/**
 * Wait for page to be fully loaded (no network activity)
 */
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is logged in by looking for common auth indicators
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const logoutButton = page.locator('button:has-text("Logout"), a:has-text("Logout")');
  const loginButton = page.locator('button:has-text("Login"), a:has-text("Login")');

  const hasLogout = await logoutButton.isVisible({ timeout: 1000 }).catch(() => false);
  const hasLogin = await loginButton.isVisible({ timeout: 1000 }).catch(() => false);

  return hasLogout && !hasLogin;
}

/**
 * Get current user type based on URL or page indicators
 */
export async function getCurrentUserType(
  page: Page
): Promise<'admin' | 'landlord' | 'vendor' | 'none'> {
  const url = page.url();

  if (url.includes('/vendor/dashboard')) return 'vendor';
  if (url.includes('/dashboard')) return 'landlord';
  if (
    url.includes('/requests') ||
    url.includes('/vendors') ||
    url.includes('/applications') ||
    url.includes('/analytics')
  ) {
    return 'admin';
  }

  return 'none';
}
