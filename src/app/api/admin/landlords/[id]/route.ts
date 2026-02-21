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

    // Fetch landlord first
    const { data: landlord, error: landlordError } = await adminClient
      .from('landlords')
      .select('*')
      .eq('id', id)
      .single();

    if (landlordError) {
      return NextResponse.json(
        { message: 'Landlord not found', error: landlordError.message },
        { status: 404 }
      );
    }

    // Fetch requests by landlord_id OR landlord_email (to catch orphaned requests)
    const { data: requests, error: requestsError } = await adminClient
      .from('service_requests')
      .select(`
        id,
        service_type,
        property_location,
        property_address,
        zip_code,
        job_description,
        urgency,
        status,
        created_at,
        intro_sent_at,
        matches:request_vendor_matches(
          id,
          vendor_id,
          status,
          intro_sent,
          vendor_accepted,
          job_completed,
          review_rating
        )
      `)
      .or(`landlord_id.eq.${id},landlord_email.eq.${landlord.email}`)
      .order('created_at', { ascending: false });

    if (requestsError) {
      console.error('Error fetching requests:', requestsError);
    }

    return NextResponse.json({
      ...landlord,
      requests: requests || [],
    });
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
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { id } = await params;

    // Fetch landlord to get auth_user_id
    const { data: landlord, error: landlordError } = await adminClient
      .from('landlords')
      .select('id, auth_user_id, email')
      .eq('id', id)
      .single();

    if (landlordError || !landlord) {
      return NextResponse.json(
        { message: 'Landlord not found' },
        { status: 404 }
      );
    }

    // Nullify landlord_id on associated service_requests (preserve request data)
    const { error: requestsError } = await adminClient
      .from('service_requests')
      .update({ landlord_id: null })
      .eq('landlord_id', id);

    if (requestsError) {
      console.error('Error nullifying requests:', requestsError);
    }

    // Delete landlord record
    const { error: deleteError } = await adminClient
      .from('landlords')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting landlord:', deleteError);
      return NextResponse.json(
        { message: 'Failed to delete landlord' },
        { status: 500 }
      );
    }

    // If landlord had an auth account, delete it from Supabase Auth
    let authUserDeleted = false;
    if (landlord.auth_user_id) {
      const { error: authError } = await adminClient.auth.admin.deleteUser(
        landlord.auth_user_id
      );
      if (authError) {
        console.error('Error deleting auth user:', authError);
      } else {
        authUserDeleted = true;
      }
    }

    return NextResponse.json({
      message: 'Landlord deleted',
      authUserDeleted,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
