import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * PATCH /api/landlord/notifications/:id
 * Mark a notification as read
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

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
      .eq('user_type', 'landlord')
      .eq('user_id', landlordId)
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
