import { NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * GET /api/landlord/notifications/unread-count
 * Get unread notification count for badge display
 */
export async function GET() {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const { count, error } = await adminClient
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_type', 'landlord')
      .eq('user_id', landlordId)
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
