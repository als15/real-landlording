/**
 * Landlord API utilities
 *
 * Mirrors the admin.ts pattern for landlord API routes.
 * All landlord routes should use verifyLandlord() to authenticate
 * and get a context with adminClient + landlord info.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { SupabaseClient } from '@supabase/supabase-js';

export interface LandlordContext {
  adminClient: SupabaseClient;
  userId: string;
  userEmail: string;
  landlordId: string;
}

export type LandlordApiResult =
  | { success: true; context: LandlordContext }
  | { success: false; response: NextResponse };

/**
 * Verify the current user is an authenticated landlord.
 * Looks up landlord by auth_user_id first, then by email.
 * Returns landlord context if successful, or an error response if not.
 */
export async function verifyLandlord(): Promise<LandlordApiResult> {
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

    // Try auth_user_id first, then email (handles pre-signup requests)
    let landlord = null;

    const { data: byAuthId } = await adminClient
      .from('landlords')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (byAuthId) {
      landlord = byAuthId;
    } else {
      const { data: byEmail } = await adminClient
        .from('landlords')
        .select('id')
        .eq('email', user.email)
        .single();

      landlord = byEmail;
    }

    if (!landlord) {
      return {
        success: false,
        response: NextResponse.json(
          { message: 'Landlord profile not found' },
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
        landlordId: landlord.id,
      },
    };
  } catch (error) {
    console.error('Landlord verification error:', error);
    return {
      success: false,
      response: NextResponse.json(
        { message: 'Internal server error' },
        { status: 500 }
      ),
    };
  }
}
