import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * DELETE /api/landlord/saved-vendors/:id
 * Remove a saved vendor
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const { id } = await params;

    const { error } = await adminClient
      .from('landlord_saved_vendors')
      .delete()
      .eq('id', id)
      .eq('landlord_id', landlordId);

    if (error) {
      console.error('Error removing saved vendor:', error);
      return NextResponse.json(
        { message: 'Failed to remove saved vendor' },
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

/**
 * PATCH /api/landlord/saved-vendors/:id
 * Update notes on a saved vendor
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

    const { data, error } = await adminClient
      .from('landlord_saved_vendors')
      .update({ notes: body.notes ?? null })
      .eq('id', id)
      .eq('landlord_id', landlordId)
      .select()
      .single();

    if (error) {
      console.error('Error updating saved vendor:', error);
      return NextResponse.json(
        { message: 'Failed to update saved vendor' },
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
