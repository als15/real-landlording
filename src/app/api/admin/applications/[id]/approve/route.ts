import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendVendorWelcomeEmail } from '@/lib/email/send';
import { Vendor } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // Get vendor email to create auth account
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('email, contact_name')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check if auth user already exists (e.g., they're already a landlord)
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(u => u.email === vendor.email);

    let authUserId: string | null = null;
    let tempPassword: string | null = null;

    if (existingAuthUser) {
      // User already has an account (likely a landlord), reuse their auth
      authUserId = existingAuthUser.id;
      console.log(`Vendor ${vendor.email} already has auth account, linking existing user`);
    } else {
      // Create new auth user for vendor
      tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

      const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
        email: vendor.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name: vendor.contact_name },
      });

      if (authError) {
        console.error('Error creating auth user:', authError);
        // Continue anyway - vendor can use password reset
      } else {
        authUserId = authUser?.user?.id || null;
      }
    }

    // Update vendor status to active
    const { error: updateError } = await adminClient
      .from('vendors')
      .update({
        status: 'active',
        auth_user_id: authUserId,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error approving vendor:', updateError);
      return NextResponse.json(
        { message: 'Failed to approve vendor' },
        { status: 500 }
      );
    }

    // Send welcome email with login instructions
    // If existing user, they'll use their current password; if new, include temp password
    sendVendorWelcomeEmail(vendor as Vendor, tempPassword || undefined)
      .catch(console.error);

    return NextResponse.json({
      message: existingAuthUser
        ? 'Vendor approved - linked to existing account'
        : 'Vendor approved successfully',
      tempPassword,
      existingAccount: !!existingAuthUser,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
