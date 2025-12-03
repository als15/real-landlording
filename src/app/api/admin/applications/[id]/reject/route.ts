import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { reason } = await request.json();
    const adminClient = createAdminClient();

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

    // TODO: Send rejection email

    return NextResponse.json({ message: 'Application rejected' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
