/**
 * Database Fixture for E2E Tests
 *
 * Provides functions to create and cleanup test data in Supabase.
 * All test data uses identifiable prefixes for easy cleanup.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test data prefix to identify and cleanup test records
export const TEST_PREFIX = 'e2e-test';

// Standard test password for all test users
export const TEST_PASSWORD = 'TestPassword123!';

// Create Supabase admin client
export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables for E2E tests');
  }

  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// Landlord Functions
// ============================================================================

export interface TestLandlord {
  id: string;
  email: string;
  name: string;
  auth_user_id: string;
  password: string;
}

export async function createTestLandlord(
  supabase: SupabaseClient,
  options: { testId?: string; name?: string } = {}
): Promise<TestLandlord> {
  const testId = options.testId || `${TEST_PREFIX}-${Date.now()}`;
  const email = `landlord-${testId}@e2e.test`;
  const name = options.name || `Test Landlord ${testId}`;

  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: TEST_PASSWORD,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    throw new Error(`Failed to create landlord auth user: ${authError?.message}`);
  }

  // Create landlord record
  const { data: landlord, error: dbError } = await supabase
    .from('landlords')
    .insert({
      auth_user_id: authData.user.id,
      email,
      name,
      phone: '2155550100',
    })
    .select()
    .single();

  if (dbError || !landlord) {
    // Cleanup auth user on failure
    await supabase.auth.admin.deleteUser(authData.user.id);
    throw new Error(`Failed to create landlord record: ${dbError?.message}`);
  }

  return {
    id: landlord.id,
    email,
    name,
    auth_user_id: authData.user.id,
    password: TEST_PASSWORD,
  };
}

export async function cleanupLandlord(
  supabase: SupabaseClient,
  landlord: TestLandlord
): Promise<void> {
  // Delete related data first (foreign keys)
  await supabase.from('request_vendor_matches').delete().eq('request_id', landlord.id);
  await supabase.from('service_requests').delete().eq('landlord_id', landlord.id);
  await supabase.from('service_requests').delete().eq('landlord_email', landlord.email);

  // Delete landlord record
  await supabase.from('landlords').delete().eq('id', landlord.id);

  // Delete auth user
  if (landlord.auth_user_id) {
    await supabase.auth.admin.deleteUser(landlord.auth_user_id);
  }
}

// ============================================================================
// Vendor Functions
// ============================================================================

export interface TestVendor {
  id: string;
  email: string;
  business_name: string;
  contact_name: string;
  auth_user_id: string | null;
  password: string;
  status: string;
}

export interface CreateVendorOptions {
  testId?: string;
  email?: string; // Allow custom email
  status?: 'active' | 'pending_review' | 'inactive' | 'rejected';
  services?: string[];
  service_areas?: string[];
  createAuthUser?: boolean;
  business_name?: string;
  contact_name?: string;
  phone?: string;
}

export async function createTestVendor(
  supabase: SupabaseClient,
  options: CreateVendorOptions = {}
): Promise<TestVendor> {
  const testId = options.testId || `${TEST_PREFIX}-${Date.now()}`;
  const email = options.email || `vendor-${testId}@e2e.test`;
  const businessName = options.business_name || `Test Vendor ${testId}`;
  const contactName = options.contact_name || `Vendor Contact ${testId}`;
  const status = options.status || 'active';
  const services = options.services || ['plumber_sewer'];
  const serviceAreas = options.service_areas || ['19103', '19104'];
  const createAuthUser = options.createAuthUser ?? (status === 'active');

  let authUserId: string | null = null;

  // Create auth user only for active vendors (or if explicitly requested)
  if (createAuthUser) {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: TEST_PASSWORD,
      email_confirm: true,
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create vendor auth user: ${authError?.message}`);
    }
    authUserId = authData.user.id;
  }

  // Create vendor record
  const { data: vendor, error: dbError } = await supabase
    .from('vendors')
    .insert({
      auth_user_id: authUserId,
      email,
      business_name: businessName,
      contact_name: contactName,
      phone: '2155550200',
      services,
      service_areas: serviceAreas,
      status,
      licensed: true,
      insured: true,
      rental_experience: true,
      qualifications: 'E2E test vendor with full qualifications',
      terms_accepted: status === 'active',
      terms_accepted_at: status === 'active' ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (dbError || !vendor) {
    // Cleanup auth user on failure
    if (authUserId) {
      await supabase.auth.admin.deleteUser(authUserId);
    }
    throw new Error(`Failed to create vendor record: ${dbError?.message}`);
  }

  return {
    id: vendor.id,
    email,
    business_name: businessName,
    contact_name: contactName,
    auth_user_id: authUserId,
    password: TEST_PASSWORD,
    status,
  };
}

export async function cleanupVendor(
  supabase: SupabaseClient,
  vendor: TestVendor
): Promise<void> {
  // Delete related matches
  await supabase.from('request_vendor_matches').delete().eq('vendor_id', vendor.id);

  // Delete vendor record
  await supabase.from('vendors').delete().eq('id', vendor.id);

  // Delete auth user
  if (vendor.auth_user_id) {
    await supabase.auth.admin.deleteUser(vendor.auth_user_id);
  }
}

// ============================================================================
// Service Request Functions
// ============================================================================

export interface TestRequest {
  id: string;
  landlord_email: string;
  landlord_name: string;
  service_type: string;
  zip_code: string;
  status: string;
}

export interface CreateRequestOptions {
  testId?: string;
  landlordId?: string;
  landlord_email?: string; // Allow custom email
  landlord_name?: string;  // Allow custom name
  first_name?: string;
  last_name?: string;
  landlord_phone?: string;
  service_type?: string;
  zip_code?: string;
  urgency?: 'low' | 'medium' | 'high' | 'emergency';
  status?: 'new' | 'matching' | 'matched' | 'completed' | 'cancelled';
  property_address?: string;
  job_description?: string;
}

export async function createTestRequest(
  supabase: SupabaseClient,
  options: CreateRequestOptions = {}
): Promise<TestRequest> {
  const testId = options.testId || `${TEST_PREFIX}-${Date.now()}`;
  const email = options.landlord_email || `request-${testId}@e2e.test`;
  const name = options.landlord_name || `Request Landlord ${testId}`;
  const serviceType = options.service_type || 'plumber_sewer';
  const zipCode = options.zip_code || '19103';
  const urgency = options.urgency || 'medium';
  const status = options.status || 'new';
  const propertyAddress = options.property_address || `${testId} Test Street, Philadelphia, PA ${zipCode}`;
  const jobDescription = options.job_description || `E2E test job for ${serviceType}. Test ID: ${testId}`;

  const { data: request, error } = await supabase
    .from('service_requests')
    .insert({
      landlord_id: options.landlordId || null,
      landlord_email: email,
      landlord_name: name,
      landlord_phone: '2155550300',
      service_type: serviceType,
      property_location: zipCode,
      zip_code: zipCode,
      property_address: propertyAddress,
      job_description: jobDescription,
      urgency,
      status,
      is_owner: true,
    })
    .select()
    .single();

  if (error || !request) {
    throw new Error(`Failed to create test request: ${error?.message}`);
  }

  return {
    id: request.id,
    landlord_email: email,
    landlord_name: name,
    service_type: serviceType,
    zip_code: zipCode,
    status,
  };
}

export async function cleanupRequest(
  supabase: SupabaseClient,
  request: TestRequest
): Promise<void> {
  // Delete matches first
  await supabase.from('request_vendor_matches').delete().eq('request_id', request.id);

  // Delete request
  await supabase.from('service_requests').delete().eq('id', request.id);
}

// ============================================================================
// Match Functions
// ============================================================================

export interface TestMatch {
  id: string;
  request_id: string;
  vendor_id: string;
}

export async function createTestMatch(
  supabase: SupabaseClient,
  requestId: string,
  vendorId: string,
  options: { introSent?: boolean } = {}
): Promise<TestMatch> {
  const { data: match, error } = await supabase
    .from('request_vendor_matches')
    .insert({
      request_id: requestId,
      vendor_id: vendorId,
      intro_sent: options.introSent ?? true,
      intro_sent_at: options.introSent ? new Date().toISOString() : null,
    })
    .select()
    .single();

  if (error || !match) {
    throw new Error(`Failed to create test match: ${error?.message}`);
  }

  return {
    id: match.id,
    request_id: requestId,
    vendor_id: vendorId,
  };
}

// ============================================================================
// Bulk Cleanup Functions
// ============================================================================

/**
 * Cleanup all test data matching a specific test ID pattern
 */
export async function cleanupTestData(
  supabase: SupabaseClient,
  testId: string
): Promise<void> {
  // Find and delete matches for test requests
  const { data: requests } = await supabase
    .from('service_requests')
    .select('id')
    .ilike('landlord_email', `%${testId}%`);

  if (requests) {
    for (const req of requests) {
      await supabase.from('request_vendor_matches').delete().eq('request_id', req.id);
    }
  }

  // Delete test requests
  await supabase.from('service_requests').delete().ilike('landlord_email', `%${testId}%`);

  // Find and delete test vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id, auth_user_id')
    .ilike('email', `%${testId}%`);

  if (vendors) {
    for (const vendor of vendors) {
      await supabase.from('request_vendor_matches').delete().eq('vendor_id', vendor.id);
      await supabase.from('vendors').delete().eq('id', vendor.id);
      if (vendor.auth_user_id) {
        await supabase.auth.admin.deleteUser(vendor.auth_user_id);
      }
    }
  }

  // Find and delete test landlords
  const { data: landlords } = await supabase
    .from('landlords')
    .select('id, auth_user_id')
    .ilike('email', `%${testId}%`);

  if (landlords) {
    for (const landlord of landlords) {
      await supabase.from('landlords').delete().eq('id', landlord.id);
      if (landlord.auth_user_id) {
        await supabase.auth.admin.deleteUser(landlord.auth_user_id);
      }
    }
  }
}

/**
 * Cleanup all E2E test data (use with caution)
 */
export async function cleanupAllTestData(supabase: SupabaseClient): Promise<void> {
  await cleanupTestData(supabase, TEST_PREFIX);
}

/**
 * Cleanup test data by email pattern
 */
export async function cleanupByEmail(
  supabase: SupabaseClient,
  email: string
): Promise<void> {
  // Delete from landlords
  const { data: landlord } = await supabase
    .from('landlords')
    .select('id, auth_user_id')
    .eq('email', email)
    .single();

  if (landlord) {
    await supabase.from('service_requests').delete().eq('landlord_id', landlord.id);
    await supabase.from('landlords').delete().eq('id', landlord.id);
    if (landlord.auth_user_id) {
      await supabase.auth.admin.deleteUser(landlord.auth_user_id);
    }
  }

  // Delete from vendors
  const { data: vendor } = await supabase
    .from('vendors')
    .select('id, auth_user_id')
    .eq('email', email)
    .single();

  if (vendor) {
    await supabase.from('request_vendor_matches').delete().eq('vendor_id', vendor.id);
    await supabase.from('vendors').delete().eq('id', vendor.id);
    if (vendor.auth_user_id) {
      await supabase.auth.admin.deleteUser(vendor.auth_user_id);
    }
  }

  // Delete requests by email
  await supabase.from('service_requests').delete().eq('landlord_email', email);

  // Try to delete auth user directly by email
  const { data: authUsers } = await supabase.auth.admin.listUsers();
  const authUser = authUsers?.users?.find((u) => u.email === email);
  if (authUser) {
    await supabase.auth.admin.deleteUser(authUser.id);
  }
}
