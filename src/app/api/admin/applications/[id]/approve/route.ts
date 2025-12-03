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

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    // Create auth user for vendor
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: vendor.email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: vendor.contact_name },
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      // Continue anyway - vendor can use password reset
    }

    // Update vendor status to active
    const { error: updateError } = await adminClient
      .from('vendors')
      .update({
        status: 'active',
        auth_user_id: authUser?.user?.id || null,
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
    sendVendorWelcomeEmail(vendor as Vendor, authUser?.user ? tempPassword : undefined)
      .catch(console.error);

    return NextResponse.json({
      message: 'Vendor approved successfully',
      tempPassword: authUser?.user ? tempPassword : null,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
