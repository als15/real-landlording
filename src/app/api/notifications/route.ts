import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

/**
 * GET /api/notifications
 * List notifications for the current user
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access (Phase 1: admin only)
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = adminClient
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_type', 'admin')
      .eq('dismissed', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { message: 'Failed to fetch notifications', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      data: data || [],
      count: count || 0,
      unreadCount: data?.filter((n) => !n.read).length || 0,
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
 * PATCH /api/notifications
 * Mark all notifications as read
 */
export async function PATCH(request: NextRequest) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const body = await request.json();
    const action = body.action;

    if (action === 'read_all') {
      const { error } = await adminClient
        .from('notifications')
        .update({ read: true, read_at: new Date().toISOString() })
        .eq('user_type', 'admin')
        .eq('read', false);

      if (error) {
        return NextResponse.json(
          { message: 'Failed to mark notifications as read', error: error.message },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });
    }

    return NextResponse.json(
      { message: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
