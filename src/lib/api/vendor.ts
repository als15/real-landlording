/**
 * Vendor API utilities
 *
 * Mirrors the landlord.ts pattern for vendor API routes.
 * All vendor routes should use verifyVendor() to authenticate
 * and get a context with adminClient + vendor info.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';
import { VendorStatus } from '@/types/database';

export interface VendorContext {
  adminClient: SupabaseClient;
  userId: string;
  userEmail: string;
  vendorId: string;
  vendorStatus: VendorStatus;
}

export type VendorApiResult =
  | { success: true; context: VendorContext }
  | { success: false; response: NextResponse };

/**
 * Verify the current user is an authenticated vendor.
 * Looks up vendor by email from the authenticated user.
 * Returns vendor context if successful, or an error response if not.
 */
export async function verifyVendor(): Promise<VendorApiResult> {
  try {
    const supabase = await createClient();

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

    const { data: vendor } = await adminClient
      .from('vendors')
      .select('id, status')
      .eq('email', user.email)
      .single();

    if (!vendor) {
      return {
        success: false,
        response: NextResponse.json(
          { message: 'Vendor profile not found' },
          { status: 404 }
        ),
      };
    }

    return {
      success: true,
      context: {
        adminClient,
        userId: user.id,
        userEmail: user.email || '',
        vendorId: vendor.id,
        vendorStatus: vendor.status,
      },
    };
  } catch (error) {
    console.error('Vendor verification error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}
