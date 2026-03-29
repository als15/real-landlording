import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { sendVendorInterviewScheduleEmail } from '@/lib/email/send';
import { sendVendorInterviewScheduleSms } from '@/lib/sms/send';

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

    const calendlyUrl = process.env.CALENDLY_URL;
    if (!calendlyUrl) {
      return NextResponse.json(
        { message: 'Interview scheduling is not configured. Set CALENDLY_URL in environment variables.' },
        { status: 503 }
      );
    }

    const { id } = await params;

    // Fetch vendor details
    const { data: vendor, error: fetchError } = await adminClient
      .from('vendors')
      .select('id, contact_name, business_name, email, phone, interview_scheduled_at, interview_scheduled_count')
      .eq('id', id)
      .single();

    if (fetchError || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Update interview scheduling fields
    const now = new Date().toISOString();
    const newCount = (vendor.interview_scheduled_count || 0) + 1;

    const { error: updateError } = await adminClient
      .from('vendors')
      .update({
        interview_scheduled_at: now,
        interview_scheduled_count: newCount,
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error updating interview schedule:', updateError);
      return NextResponse.json(
        { message: 'Failed to update interview schedule' },
        { status: 500 }
      );
    }

    // Fire-and-forget email and SMS
    sendVendorInterviewScheduleEmail(vendor, calendlyUrl).catch(console.error);
    sendVendorInterviewScheduleSms(vendor, calendlyUrl).catch(console.error);

    return NextResponse.json({
      message: 'Interview link sent',
      interview_scheduled_at: now,
      interview_scheduled_count: newCount,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
