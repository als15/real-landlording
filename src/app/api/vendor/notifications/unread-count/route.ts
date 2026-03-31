import { NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

/**
 * GET /api/vendor/notifications/unread-count
 * Get unread notification count for badge display
 */
export async function GET() {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const { count, error } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'vendor')
      .eq('user_id', vendorId)
      .eq('read', false)
      .eq('dismissed', false);

    if (error) {
      console.error('Error fetching unread count:', error);
      return NextResponse.json(
        { message: 'Failed to fetch unread count' },
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
