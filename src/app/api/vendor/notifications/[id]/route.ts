import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

/**
 * PATCH /api/vendor/notifications/:id
 * Mark a notification as read
 */
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

    const updateData: Record<string, unknown> = {};

    if (body.read !== undefined) {
      updateData.read = body.read;
      if (body.read) {
        updateData.read_at = new Date().toISOString();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No update fields provided' },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from('notifications')
      .update(updateData)
      .eq('id', id)
      .eq('user_type', 'vendor')
      .eq('user_id', vendorId)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
