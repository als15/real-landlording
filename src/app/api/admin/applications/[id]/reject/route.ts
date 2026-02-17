import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { sendVendorRejectedEmail } from '@/lib/email/send';
import { sendVendorRejectedSms } from '@/lib/sms/send';
import { Vendor } from '@/types/database';

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
    const { reason } = await request.json();

    // Get vendor details before rejecting
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('email, contact_name, phone')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    const { error } = await adminClient
      .from('vendors')
      .update({
        status: 'rejected',
        admin_notes: reason || 'Application rejected',
      })
      .eq('id', id);

    if (error) {
      console.error('Error rejecting vendor:', error);
      return NextResponse.json(
        { message: 'Failed to reject application' },
        { status: 500 }
      );
    }

    // Send rejection email and SMS
    sendVendorRejectedEmail(vendor as Vendor)
      .catch(console.error);

    sendVendorRejectedSms(vendor as Vendor)
      .catch(console.error);

    return NextResponse.json({ message: 'Application rejected' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
