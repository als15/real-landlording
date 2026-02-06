/**
 * Test Data Generators for E2E Tests
 *
 * Provides functions to generate test data with unique identifiers
 * to avoid conflicts between test runs.
 */

import { Page } from '@playwright/test';

// ============================================================================
// ID Generation
// ============================================================================

/**
 * Generate a unique test ID based on timestamp
 */
export function generateTestId(prefix: string = 'e2e'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Generate a unique email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}@e2e.test`;
}

// ============================================================================
// Request Data
// ============================================================================

export interface RequestFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  service_type: string;
  property_address: string;
  zip_code: string;
  job_description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  property_type?: string;
  unit_count?: string;
  is_owner?: boolean;
}

/**
 * Generate request form data for testing
 */
export function generateRequestData(overrides: Partial<RequestFormData> = {}): RequestFormData {
  const testId = generateTestId('request');

  return {
    first_name: 'E2E',
    last_name: 'Tester',
    email: overrides.email || generateTestEmail('landlord'),
    phone: '2155551234',
    service_type: 'plumber_sewer',
    property_address: `${testId} Test Street, Philadelphia, PA`,
    zip_code: '19103',
    job_description: `E2E test request - ${testId}. Need plumbing service for kitchen sink leak.`,
    urgency: 'medium',
    property_type: 'single_family',
    unit_count: '1',
    is_owner: true,
    ...overrides,
  };
}

// ============================================================================
// Vendor Application Data
// ============================================================================

export interface VendorApplicationData {
  contact_name: string;
  business_name: string;
  email: string;
  phone: string;
  website?: string;
  services: string[];
  service_areas: string[];
  qualifications: string;
  years_in_business: number;
  licensed: boolean;
  insured: boolean;
  rental_experience: boolean;
  terms_accepted: boolean;
}

/**
 * Generate vendor application data for testing
 */
export function generateVendorApplicationData(
  overrides: Partial<VendorApplicationData> = {}
): VendorApplicationData {
  const testId = generateTestId('vendor');

  return {
    contact_name: `Test Vendor ${testId}`,
    business_name: `Test Business ${testId}`,
    email: overrides.email || generateTestEmail('vendor'),
    phone: '2155552345',
    website: `https://testvendor-${testId}.example.com`,
    services: ['plumber_sewer'],
    service_areas: ['19103', '19104', '19102'],
    qualifications:
      'Licensed and insured with 10+ years experience in residential plumbing. E2E test vendor.',
    years_in_business: 10,
    licensed: true,
    insured: true,
    rental_experience: true,
    terms_accepted: true,
    ...overrides,
  };
}

// ============================================================================
// Landlord Data
// ============================================================================

export interface LandlordSignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Generate landlord signup data for testing
 */
export function generateLandlordSignupData(
  overrides: Partial<LandlordSignupData> = {}
): LandlordSignupData {
  const testId = generateTestId('landlord');
  const password = 'TestPassword123!';

  return {
    name: `Test Landlord ${testId}`,
    email: overrides.email || generateTestEmail('landlord'),
    password,
    confirmPassword: password,
    ...overrides,
  };
}

// ============================================================================
// Form Filling Helpers
// ============================================================================

/**
 * Fill the service request form (multi-step)
 */
export async function fillRequestForm(page: Page, data: RequestFormData): Promise<void> {
  // Step 1: Contact Info
  await page.fill('input[name="first_name"], #first_name', data.first_name);
  await page.fill('input[name="last_name"], #last_name', data.last_name);
  await page.fill('input[name="email"], #email', data.email);
  await page.fill('input[name="phone"], #phone', data.phone);

  // Click next if there's a next button
  const nextButton = page.locator('button:has-text("Next")');
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Step 2: Service Details
  // Service type select
  const serviceSelect = page.locator(
    '[name="service_type"], #service_type, .ant-select:has-text("Service")'
  );
  if (await serviceSelect.isVisible()) {
    await serviceSelect.click();
    await page.click(`.ant-select-item:has-text("${data.service_type}")`).catch(async () => {
      // Fallback for regular select
      await page.selectOption('select[name="service_type"]', data.service_type);
    });
  }

  await page.fill('input[name="property_address"], #property_address', data.property_address);
  await page.fill('input[name="zip_code"], #zip_code', data.zip_code);
  await page.fill(
    'textarea[name="job_description"], #job_description',
    data.job_description
  );

  // Click next if there's a next button
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Step 3: Urgency (if separate step)
  const urgencySelect = page.locator('[name="urgency"], #urgency');
  if (await urgencySelect.isVisible()) {
    await urgencySelect.click();
    await page.click(`.ant-select-item:has-text("${data.urgency}")`).catch(async () => {
      await page.selectOption('select[name="urgency"]', data.urgency);
    });
  }
}

/**
 * Submit the request form (after filling)
 */
export async function submitRequestForm(page: Page): Promise<void> {
  const submitButton = page.locator(
    'button:has-text("Submit"), button:has-text("Submit Request")'
  );
  await submitButton.click();

  // Wait for success indicator
  await page.waitForSelector(
    '.ant-result-success, [data-testid="success"], :text("successfully")',
    { timeout: 15000 }
  );
}

/**
 * Complete the full request flow (fill + submit)
 */
export async function completeRequestForm(
  page: Page,
  data: Partial<RequestFormData> = {}
): Promise<void> {
  const fullData = generateRequestData(data);
  await fillRequestForm(page, fullData);
  await submitRequestForm(page);
}

/**
 * Fill the vendor application form (multi-step)
 */
export async function fillVendorApplicationForm(
  page: Page,
  data: VendorApplicationData
): Promise<void> {
  // Step 1: Contact Info
  await page.fill('input[name="contact_name"], #contact_name', data.contact_name);
  await page.fill('input[name="business_name"], #business_name', data.business_name);
  await page.fill('input[name="email"], #email', data.email);
  await page.fill('input[name="phone"], #phone', data.phone);

  if (data.website) {
    await page.fill('input[name="website"], #website', data.website);
  }

  // Click next
  const nextButton = page.locator('button:has-text("Next")');
  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Step 2: Services
  for (const service of data.services) {
    const serviceCheckbox = page.locator(
      `input[value="${service}"], [data-service="${service}"], :has-text("${service}")`
    );
    if (await serviceCheckbox.isVisible()) {
      await serviceCheckbox.click();
    }
  }

  // Service areas
  for (const area of data.service_areas) {
    const areaInput = page.locator('input[name="service_areas"], .ant-select-selector').first();
    if (await areaInput.isVisible()) {
      await areaInput.click();
      await page.keyboard.type(area);
      await page.keyboard.press('Enter');
    }
  }

  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Step 3: Experience
  await page.fill(
    'textarea[name="qualifications"], #qualifications',
    data.qualifications
  );

  // Years in business
  const yearsSelect = page.locator('[name="years_in_business"], #years_in_business');
  if (await yearsSelect.isVisible()) {
    await yearsSelect.click();
    await page.click(`.ant-select-item:has-text("${data.years_in_business}")`).catch(async () => {
      await page.selectOption('select[name="years_in_business"]', String(data.years_in_business));
    });
  }

  // Checkboxes
  if (data.licensed) {
    await page.check('input[name="licensed"], #licensed').catch(() => {});
  }
  if (data.insured) {
    await page.check('input[name="insured"], #insured').catch(() => {});
  }
  if (data.rental_experience) {
    await page.check('input[name="rental_experience"], #rental_experience').catch(() => {});
  }

  if (await nextButton.isVisible()) {
    await nextButton.click();
    await page.waitForTimeout(500);
  }

  // Final step: Terms acceptance
  if (data.terms_accepted) {
    await page.check('input[name="terms_accepted"], #terms_accepted').catch(async () => {
      const termsCheckbox = page.locator(':has-text("terms")').locator('input[type="checkbox"]');
      if (await termsCheckbox.isVisible()) {
        await termsCheckbox.check();
      }
    });
  }
}

/**
 * Submit the vendor application form
 */
export async function submitVendorApplicationForm(page: Page): Promise<void> {
  const submitButton = page.locator(
    'button:has-text("Submit"), button:has-text("Submit Application")'
  );
  await submitButton.click();

  // Wait for success indicator
  await page.waitForSelector(
    '.ant-result-success, [data-testid="success"], :text("application")',
    { timeout: 15000 }
  );
}

/**
 * Complete the full vendor application flow
 */
export async function completeVendorApplication(
  page: Page,
  data: Partial<VendorApplicationData> = {}
): Promise<void> {
  const fullData = generateVendorApplicationData(data);
  await fillVendorApplicationForm(page, fullData);
  await submitVendorApplicationForm(page);
}

// ============================================================================
// Service Types
// ============================================================================

export const SERVICE_TYPES = [
  'plumber_sewer',
  'electrician',
  'hvac',
  'handyman',
  'general_contractor',
  'painter',
  'roofer',
  'pest_control',
  'locksmith_security',
  'cleanout',
  'lead_testing',
  'exterior_contractor',
  'windows_doors',
  'move_ins',
  'compliance_legal',
  'boost_my_skills',
  'maintenance',
] as const;

export type ServiceType = (typeof SERVICE_TYPES)[number];

// ============================================================================
// Philadelphia Zip Codes
// ============================================================================

export const PHILLY_ZIP_CODES = [
  '19102',
  '19103',
  '19104',
  '19106',
  '19107',
  '19111',
  '19114',
  '19115',
  '19116',
  '19118',
  '19119',
  '19120',
  '19121',
  '19122',
  '19123',
  '19124',
  '19125',
  '19126',
  '19127',
  '19128',
  '19129',
  '19130',
  '19131',
  '19132',
  '19133',
  '19134',
  '19135',
  '19136',
  '19137',
  '19138',
  '19139',
  '19140',
  '19141',
  '19142',
  '19143',
  '19144',
  '19145',
  '19146',
  '19147',
  '19148',
  '19149',
  '19150',
  '19151',
  '19152',
  '19153',
  '19154',
] as const;

/**
 * Get a random Philadelphia zip code
 */
export function getRandomZipCode(): string {
  return PHILLY_ZIP_CODES[Math.floor(Math.random() * PHILLY_ZIP_CODES.length)];
}

/**
 * Get a random service type
 */
export function getRandomServiceType(): ServiceType {
  return SERVICE_TYPES[Math.floor(Math.random() * SERVICE_TYPES.length)];
}
