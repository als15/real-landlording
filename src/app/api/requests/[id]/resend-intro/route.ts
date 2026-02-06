import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { sendIntroEmails } from '@/lib/email/send';
import { sendIntroSms } from '@/lib/sms/send';
import { ServiceRequest, Vendor } from '@/types/database';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { id } = await params;
    const { vendor_id } = await request.json();

    if (!vendor_id) {
      return NextResponse.json(
        { message: 'vendor_id is required' },
        { status: 400 }
      );
    }

    // Get the service request
    const { data: serviceRequest, error: requestError } = await adminClient
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Get the vendor
    const { data: vendor, error: vendorError } = await adminClient
      .from('vendors')
      .select('*')
      .eq('id', vendor_id)
      .single();

    if (vendorError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Verify this vendor is actually matched to this request
    const { data: match, error: matchError } = await adminClient
      .from('request_vendor_matches')
      .select('id')
      .eq('request_id', id)
      .eq('vendor_id', vendor_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json(
        { message: 'Vendor is not matched to this request' },
        { status: 400 }
      );
    }

    console.log(`[Resend Intro] Resending intro to vendor ${vendor.business_name} for request ${id}`);

    // Send intro email and SMS to this single vendor
    // We pass an array with just this one vendor
    const emailResult = await sendIntroEmails(
      serviceRequest as ServiceRequest,
      [vendor as Vendor]
    );

    const smsResult = await sendIntroSms(
      serviceRequest as ServiceRequest,
      [vendor as Vendor]
    );

    // Update the match record with new intro sent timestamp
    await adminClient
      .from('request_vendor_matches')
      .update({
        intro_sent: true,
        intro_sent_at: new Date().toISOString(),
      })
      .eq('request_id', id)
      .eq('vendor_id', vendor_id);

    return NextResponse.json({
      message: 'Intro resent successfully',
      email: {
        landlordSent: emailResult.landlordSent,
        vendorSent: emailResult.vendorsSent > 0,
      },
      sms: {
        landlordSent: smsResult.landlordSent,
        vendorSent: smsResult.vendorsSent > 0,
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
