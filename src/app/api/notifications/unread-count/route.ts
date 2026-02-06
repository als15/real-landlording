import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

/**
 * GET /api/notifications/unread-count
 * Get the count of unread notifications (for badge display)
 */
export async function GET() {
  try {
    // Verify admin access (Phase 1: admin only)
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { count, error } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'admin')
      .eq('read', false)
      .eq('dismissed', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return NextResponse.json(
        { message: 'Failed to fetch unread count', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
