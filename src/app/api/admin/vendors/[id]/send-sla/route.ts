import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendSlaToVendor, isDocuSignConfigured } from '@/lib/docusign';

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
      .select('id, email, contact_name, business_name, sla_status, sla_envelope_id')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Validate vendor has required fields for SLA
    if (!vendor.email || !vendor.email.trim()) {
      return NextResponse.json(
        { message: 'Vendor email is missing. Please update the vendor profile first.' },
        { status: 400 }
      );
    }

    if (!vendor.contact_name || !vendor.contact_name.trim()) {
      return NextResponse.json(
        { message: 'Vendor contact name is missing. Please update the vendor profile first.' },
        { status: 400 }
      );
    }

    // Check if SLA was already sent and is pending signature
    if (vendor.sla_status === 'sent' || vendor.sla_status === 'delivered' || vendor.sla_status === 'viewed') {
      return NextResponse.json(
        { message: 'SLA has already been sent and is awaiting signature', sla_status: vendor.sla_status },
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

    // Send SLA via DocuSign
    const result = await sendSlaToVendor({
      vendorId: vendor.id,
      contactName: vendor.contact_name,
      businessName: vendor.business_name,
      email: vendor.email,
    });

    if (!result.success) {
      console.error('[Send SLA] DocuSign error:', result.error);
      return NextResponse.json(
        { message: 'Failed to send SLA', error: result.error },
        { status: 500 }
      );
    }

    // Update vendor record with envelope ID and status
    const { error: updateError } = await adminClient
      .from('vendors')
      .update({
        sla_envelope_id: result.envelopeId,
        sla_status: 'sent',
        sla_sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('[Send SLA] Database update error:', updateError);
      // SLA was sent but we failed to update the database
      // Log this for manual resolution
      return NextResponse.json(
        {
          message: 'SLA sent but failed to update database',
          envelopeId: result.envelopeId,
          error: updateError.message
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'SLA sent successfully',
      envelopeId: result.envelopeId,
    });
  } catch (error) {
    console.error('[Send SLA] API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
