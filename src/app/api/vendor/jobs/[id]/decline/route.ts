import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const { id } = await params;

    // Verify this job belongs to this vendor
    const { data: match } = await adminClient
      .from('request_vendor_matches')
      .select('id, vendor_id, status')
      .eq('id', id)
      .single();

    if (!match || match.vendor_id !== vendorId) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Guard: can only decline from pending/intro_sent/estimate_sent
    if (!['pending', 'intro_sent', 'estimate_sent'].includes(match.status)) {
      return NextResponse.json(
        { message: `Cannot decline job with status "${match.status}"` },
        { status: 400 }
      );
    }

    const { error: updateError } = await adminClient
      .from('request_vendor_matches')
      .update({
        vendor_accepted: false,
        vendor_responded_at: new Date().toISOString(),
        status: 'vendor_declined',
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error declining job:', updateError);
      return NextResponse.json(
        { message: 'Failed to decline job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Job declined' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
