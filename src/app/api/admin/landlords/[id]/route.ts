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

    // Fetch landlord with their service requests
    const { data, error } = await adminClient
      .from('landlords')
      .select(`
        *,
        requests:service_requests(
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
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Landlord not found', error: error.message },
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
