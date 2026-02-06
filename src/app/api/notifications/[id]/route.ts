import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

/**
 * PATCH /api/notifications/:id
 * Update a notification (mark as read, dismiss)
 */
export async function PATCH(
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
    const body = await request.json();

    const updateData: Record<string, unknown> = {};

    if (body.read !== undefined) {
      updateData.read = body.read;
      if (body.read) {
        updateData.read_at = new Date().toISOString();
      }
    }

    if (body.dismissed !== undefined) {
      updateData.dismissed = body.dismissed;
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
      .eq('user_type', 'admin')
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update notification', error: error.message },
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

/**
 * DELETE /api/notifications/:id
 * Dismiss a notification
 */
export async function DELETE(
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

    const { error } = await adminClient
      .from('notifications')
      .update({ dismissed: true })
      .eq('id', id)
      .eq('user_type', 'admin');

    if (error) {
      return NextResponse.json(
        { message: 'Failed to dismiss notification', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
