import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { verifyAdmin } from '@/lib/api/admin';
import { sendVendorWelcomeEmail } from '@/lib/email/send';
import { sendVendorWelcomeSms } from '@/lib/sms/send';
import { Vendor } from '@/types/database';
import { sendSlaToVendor, isPandaDocConfigured } from '@/lib/pandadoc';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { id } = await params;

    // Parse request body for commission rate
    let commissionRate: string | undefined;
    try {
      const body = await request.json();
      commissionRate = body.commissionRate;
    } catch {
      // No body provided, commission rate will be undefined
    }

    // Get vendor details to create auth account and send SLA
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('email, contact_name, business_name, phone')
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
      tempPassword = randomBytes(16).toString('base64url').slice(0, 14) + 'A1!';

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

    // Send welcome email and SMS with login instructions
    // If existing user, they'll use their current password; if new, include temp password
    sendVendorWelcomeEmail(vendor as Vendor, tempPassword || undefined)
      .catch(console.error);

    // Send welcome SMS
    sendVendorWelcomeSms(vendor as Vendor)
      .catch(console.error);

    // Auto-send SLA via PandaDoc if configured
    let slaSent = false;
    let slaDocumentId: string | undefined;

    if (isPandaDocConfigured()) {
      try {
        const slaResult = await sendSlaToVendor({
          vendorId: id,
          contactName: vendor.contact_name,
          businessName: vendor.business_name || vendor.contact_name,
          email: vendor.email,
          commissionRate,
        });

        if (slaResult.success && slaResult.documentId) {
          slaSent = true;
          slaDocumentId = slaResult.documentId;

          // Update vendor with SLA document info
          await adminClient
            .from('vendors')
            .update({
              sla_envelope_id: slaResult.documentId,
              sla_status: 'sent',
              sla_sent_at: new Date().toISOString(),
            })
            .eq('id', id);

          console.log(`[Vendor Approve] SLA sent to ${vendor.email}, document: ${slaResult.documentId}`);
        } else {
          console.error(`[Vendor Approve] Failed to send SLA: ${slaResult.error}`);
        }
      } catch (slaError) {
        console.error('[Vendor Approve] SLA send error:', slaError);
        // Don't fail the approval if SLA send fails
      }
    } else {
      console.log('[Vendor Approve] PandaDoc not configured, skipping SLA');
    }

    return NextResponse.json({
      message: existingAuthUser
        ? 'Vendor approved - linked to existing account'
        : 'Vendor approved successfully',
      tempPassword,
      existingAccount: !!existingAuthUser,
      slaSent,
      slaDocumentId,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
