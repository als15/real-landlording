/**
 * Global Setup for E2E Tests
 *
 * Runs once before all tests to:
 * 1. Verify environment variables are set
 * 2. Create admin user if it doesn't exist
 * 3. Clean up any stale test data from previous runs
 */

import { createClient } from '@supabase/supabase-js';
import { TEST_PREFIX } from '../fixtures/database.fixture';

async function globalSetup() {
  console.log('\n🚀 E2E Global Setup Starting...\n');

  // ============================================================================
  // 1. Verify Environment Variables
  // ============================================================================

  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach((v) => console.error(`   - ${v}`));
    throw new Error('E2E tests require Supabase credentials');
  }

  console.log('✅ Environment variables verified');

  // ============================================================================
  // 2. Create Supabase Admin Client
  // ============================================================================

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  // ============================================================================
  // 3. Create Admin User (if not exists)
  // ============================================================================

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@e2e.test';
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

  // Check if admin exists in admin_users table
  const { data: existingAdmin } = await supabase
    .from('admin_users')
    .select('id, email, auth_user_id')
    .eq('email', adminEmail)
    .single();

  if (existingAdmin) {
    console.log(`✅ Admin user already exists: ${adminEmail}`);
  } else {
    console.log(`📝 Creating admin user: ${adminEmail}`);

    try {
      // Check if auth user exists
      const { data: authUsers } = await supabase.auth.admin.listUsers();
      let authUser = authUsers?.users?.find((u) => u.email === adminEmail);

      if (!authUser) {
        // Create auth user
        const { data: newAuthUser, error: authError } = await supabase.auth.admin.createUser({
          email: adminEmail,
          password: adminPassword,
          email_confirm: true,
        });

        if (authError) {
          throw new Error(`Failed to create admin auth user: ${authError.message}`);
        }

        authUser = newAuthUser.user;
        console.log(`   ✅ Created auth user: ${authUser!.id}`);
      } else {
        console.log(`   ℹ️  Auth user already exists: ${authUser.id}`);
      }

      // Create admin_users record
      const { error: dbError } = await supabase.from('admin_users').insert({
        auth_user_id: authUser!.id,
        email: adminEmail,
        name: 'E2E Test Admin',
        role: 'admin',
      });

      if (dbError) {
        // Check if it's a duplicate key error (already exists)
        if (dbError.code === '23505') {
          console.log(`   ℹ️  Admin record already exists`);
        } else {
          throw new Error(`Failed to create admin record: ${dbError.message}`);
        }
      } else {
        console.log(`   ✅ Created admin record`);
      }
    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      // Don't fail the entire setup - tests that need admin will skip
    }
  }

  // ============================================================================
  // 4. Clean Up Stale Test Data
  // ============================================================================

  console.log('\n🧹 Cleaning up stale test data...');

  try {
    // Delete old test requests (older than 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Find old test requests
    const { data: oldRequests } = await supabase
      .from('service_requests')
      .select('id')
      .ilike('landlord_email', `%${TEST_PREFIX}%`)
      .lt('created_at', oneDayAgo);

    if (oldRequests && oldRequests.length > 0) {
      // Delete matches for old requests
      for (const req of oldRequests) {
        await supabase.from('request_vendor_matches').delete().eq('request_id', req.id);
      }

      // Delete old requests
      await supabase
        .from('service_requests')
        .delete()
        .ilike('landlord_email', `%${TEST_PREFIX}%`)
        .lt('created_at', oneDayAgo);

      console.log(`   ✅ Deleted ${oldRequests.length} old test requests`);
    }

    // Find and delete old test vendors
    const { data: oldVendors } = await supabase
      .from('vendors')
      .select('id, auth_user_id')
      .ilike('email', `%${TEST_PREFIX}%`)
      .lt('created_at', oneDayAgo);

    if (oldVendors && oldVendors.length > 0) {
      for (const vendor of oldVendors) {
        await supabase.from('request_vendor_matches').delete().eq('vendor_id', vendor.id);
        await supabase.from('vendors').delete().eq('id', vendor.id);

        if (vendor.auth_user_id) {
          await supabase.auth.admin.deleteUser(vendor.auth_user_id);
        }
      }

      console.log(`   ✅ Deleted ${oldVendors.length} old test vendors`);
    }

    // Find and delete old test landlords
    const { data: oldLandlords } = await supabase
      .from('landlords')
      .select('id, auth_user_id')
      .ilike('email', `%${TEST_PREFIX}%`)
      .lt('created_at', oneDayAgo);

    if (oldLandlords && oldLandlords.length > 0) {
      for (const landlord of oldLandlords) {
        await supabase.from('service_requests').delete().eq('landlord_id', landlord.id);
        await supabase.from('landlords').delete().eq('id', landlord.id);

        if (landlord.auth_user_id) {
          await supabase.auth.admin.deleteUser(landlord.auth_user_id);
        }
      }

      console.log(`   ✅ Deleted ${oldLandlords.length} old test landlords`);
    }
  } catch (error) {
    console.warn('⚠️  Failed to clean up stale test data:', error);
    // Don't fail setup - cleanup is best effort
  }

  // ============================================================================
  // 5. Verify Database Connection
  // ============================================================================

  console.log('\n🔍 Verifying database connection...');

  try {
    const { data, error } = await supabase.from('admin_users').select('count').limit(1);

    if (error) {
      throw error;
    }

    console.log('✅ Database connection verified');
  } catch (error) {
    console.error('❌ Failed to connect to database:', error);
    throw new Error('Cannot connect to Supabase database');
  }

  // ============================================================================
  // Done
  // ============================================================================

  console.log('\n✅ E2E Global Setup Complete!\n');
  console.log('📋 Test Configuration:');
  console.log(`   - Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
  console.log(`   - Admin Email: ${adminEmail}`);
  console.log(`   - Test Prefix: ${TEST_PREFIX}`);
  console.log('');
}

export default globalSetup;
