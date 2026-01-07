import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendVendorWelcomeEmail } from '@/lib/email/send';
import { Vendor } from '@/types/database';
import { sendSlaToVendor, isDocuSignConfigured } from '@/lib/docusign';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminClient = createAdminClient();

    // Get vendor details to create auth account and send SLA
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('email, contact_name, business_name')
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

    // Auto-send SLA via DocuSign if configured
    let slaSent = false;
    let slaEnvelopeId: string | undefined;

    if (isDocuSignConfigured()) {
      try {
        const slaResult = await sendSlaToVendor({
          vendorId: id,
          contactName: vendor.contact_name,
          businessName: vendor.business_name || vendor.contact_name,
          email: vendor.email,
        });

        if (slaResult.success && slaResult.envelopeId) {
          slaSent = true;
          slaEnvelopeId = slaResult.envelopeId;

          // Update vendor with SLA envelope info
          await adminClient
            .from('vendors')
            .update({
              sla_envelope_id: slaResult.envelopeId,
              sla_status: 'sent',
              sla_sent_at: new Date().toISOString(),
            })
            .eq('id', id);

          console.log(`[Vendor Approve] SLA sent to ${vendor.email}, envelope: ${slaResult.envelopeId}`);
        } else {
          console.error(`[Vendor Approve] Failed to send SLA: ${slaResult.error}`);
        }
      } catch (slaError) {
        console.error('[Vendor Approve] SLA send error:', slaError);
        // Don't fail the approval if SLA send fails
      }
    } else {
      console.log('[Vendor Approve] DocuSign not configured, skipping SLA');
    }

    return NextResponse.json({
      message: existingAuthUser
        ? 'Vendor approved - linked to existing account'
        : 'Vendor approved successfully',
      tempPassword,
      existingAccount: !!existingAuthUser,
      slaSent,
      slaEnvelopeId,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
