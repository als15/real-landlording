import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { resendSlaNotification, isDocuSignConfigured } from '@/lib/docusign';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Check if DocuSign is configured
    if (!isDocuSignConfigured()) {
      return NextResponse.json(
        { message: 'DocuSign is not configured' },
        { status: 503 }
      );
    }

    const adminClient = createAdminClient();

    // Get vendor details
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('id, email, contact_name, sla_status, sla_envelope_id')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Check if SLA was sent
    if (!vendor.sla_envelope_id) {
      return NextResponse.json(
        { message: 'No SLA has been sent to this vendor yet' },
        { status: 400 }
      );
    }

    // Check if SLA is already signed
    if (vendor.sla_status === 'signed') {
      return NextResponse.json(
        { message: 'SLA has already been signed' },
        { status: 400 }
      );
    }

    // Resend notification
    const success = await resendSlaNotification(vendor.sla_envelope_id);

    if (!success) {
      return NextResponse.json(
        { message: 'Failed to resend SLA notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'SLA notification resent successfully',
    });
  } catch (error) {
    console.error('[Resend SLA] API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
