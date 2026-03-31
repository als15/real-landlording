import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * GET /api/landlord/notifications
 * List notifications for the current landlord
 */
export async function GET(request: NextRequest) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data, error, count } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_type', 'landlord')
      .eq('user_id', landlordId)
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { message: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/landlord/notifications
 * Mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const body = await request.json();

    if (body.action === 'read_all') {
      const { error } = await adminClient
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_type', 'landlord')
        .eq('user_id', landlordId)
        .eq('read', false);

      if (error) {
        return NextResponse.json(
          { message: 'Failed to mark notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
