import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

export async function GET(
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

    const { data, error } = await adminClient
      .from('service_requests')
      .select(`
        *,
        matches:request_vendor_matches(
          *,
          vendor:vendors(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Request not found', error: error.message },
        { status: 404 }
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

    const { data, error } = await adminClient
      .from('service_requests')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update request', error: error.message },
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
      .from('service_requests')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { message: 'Failed to delete request', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Request deleted' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
