/**
 * Admin API utilities
 *
 * This module provides consistent handling for admin API routes.
 * All admin routes should use the admin client to bypass RLS,
 * since we verify admin status through the admin_users table check.
 *
 * The pattern is:
 * 1. Verify the user is authenticated via Supabase Auth
 * 2. Verify the user is an admin via admin_users table
 * 3. Use adminClient for all database operations (bypasses RLS)
 *
 * This approach is simpler and more reliable than trying to make
 * RLS policies work correctly across all scenarios.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';

export interface AdminContext {
  adminClient: SupabaseClient;
  userId: string;
  userEmail: string;
  adminRole: string;
}

export type AdminApiResult =
  | { success: true; context: AdminContext }
  | { success: false; response: NextResponse };

/**
 * Verify the current user is an authenticated admin
 * Returns admin context if successful, or an error response if not
 */
export async function verifyAdmin(): Promise<AdminApiResult> {
  try {
    const supabase = await createClient();

    // Get current user from auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        response: NextResponse.json(
          { message: 'Unauthorized - not authenticated' },
          { status: 401 }
        ),
      };
    }

    const adminClient = createAdminClient();

    // Check if user is an admin
    const { data: adminUser, error: adminError } = await adminClient
      .from('admin_users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single();

    if (adminError || !adminUser) {
      return {
        success: false,
        response: NextResponse.json(
          { message: 'Forbidden - admin access required' },
          { status: 403 }
        ),
      };
    }

    return {
      success: true,
      context: {
        adminClient,
        userId: user.id,
        userEmail: user.email || '',
        adminRole: adminUser.role,
      },
    };
  } catch (error) {
    console.error('Admin verification error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}

/**
 * Get admin client without verification
 * Use this for internal/cron jobs that don't have user context
 */
export function getAdminClient(): SupabaseClient {
  return createAdminClient();
}
