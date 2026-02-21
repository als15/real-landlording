import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

const MAX_BULK_DELETE = 100;

export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { message: 'ids array is required' },
        { status: 400 }
      );
    }

    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json(
        { message: `Maximum ${MAX_BULK_DELETE} landlords per request` },
        { status: 400 }
      );
    }

    // Fetch landlords to get their auth_user_ids
    const { data: landlords, error: fetchError } = await adminClient
      .from('landlords')
      .select('id, auth_user_id')
      .in('id', ids);

    if (fetchError || !landlords) {
      console.error('Error fetching landlords for bulk delete:', fetchError);
      return NextResponse.json(
        { message: 'Failed to fetch landlords' },
        { status: 500 }
      );
    }

    const foundIds = landlords.map((l) => l.id);

    // Nullify landlord_id on associated service_requests
    const { error: requestsError } = await adminClient
      .from('service_requests')
      .update({ landlord_id: null })
      .in('landlord_id', foundIds);

    if (requestsError) {
      console.error('Error nullifying requests:', requestsError);
    }

    // Delete landlord records
    const { error: deleteError } = await adminClient
      .from('landlords')
      .delete()
      .in('id', foundIds);

    if (deleteError) {
      console.error('Error bulk deleting landlords:', deleteError);
      return NextResponse.json(
        { message: 'Failed to delete landlords' },
        { status: 500 }
      );
    }

    // Delete auth users for landlords that had accounts
    const authUserIds = landlords
      .filter((l) => l.auth_user_id)
      .map((l) => l.auth_user_id as string);

    let authUsersDeleted = 0;
    for (const authUserId of authUserIds) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(authUserId);
      if (authError) {
        console.error(`Error deleting auth user ${authUserId}:`, authError);
      } else {
        authUsersDeleted++;
      }
    }

    return NextResponse.json({
      deletedCount: foundIds.length,
      authUsersDeleted,
    });
  } catch (error) {
    console.error('Bulk delete error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
