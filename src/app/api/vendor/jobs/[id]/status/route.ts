import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

// Valid status transitions
const VALID_TRANSITIONS: Record<string, string[]> = {
  vendor_accepted: ['in_progress', 'completed'],
  in_progress: ['completed'],
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const { id } = await params;
    const body = await request.json();
    const { status: newStatus } = body;

    if (!newStatus || !['in_progress', 'completed'].includes(newStatus)) {
      return NextResponse.json(
        { message: 'Invalid status. Must be "in_progress" or "completed".' },
        { status: 400 }
      );
    }

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

    // Guard: check valid transition
    const allowedNext = VALID_TRANSITIONS[match.status] || [];
    if (!allowedNext.includes(newStatus)) {
      return NextResponse.json(
        { message: `Cannot transition from "${match.status}" to "${newStatus}"` },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { status: newStatus };

    if (newStatus === 'completed') {
      updates.job_completed = true;
      updates.job_completed_at = new Date().toISOString();
    }

    const { error: updateError } = await adminClient
      .from('request_vendor_matches')
      .update(updates)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return NextResponse.json(
        { message: 'Failed to update job status' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: `Job status updated to ${newStatus}` });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
