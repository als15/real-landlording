import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS
    const adminClient = createAdminClient();

    // Get the request with matches
    const { data: serviceRequest, error } = await adminClient
      .from('service_requests')
      .select(`
        *,
        matches:request_vendor_matches(
          *,
          vendor:vendors(
            id,
            business_name,
            contact_name,
            email,
            phone,
            services,
            performance_score,
            total_reviews
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error || !serviceRequest) {
      console.error('Error fetching request:', error);
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify the request belongs to this user (by email)
    if (serviceRequest.landlord_email !== user.email) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    return NextResponse.json(serviceRequest);
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
