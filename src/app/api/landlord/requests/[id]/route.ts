import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get the request with matches and verify ownership
    const { data: serviceRequest, error } = await supabase
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
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Verify the request belongs to this user
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    const isOwner =
      serviceRequest.landlord_email === user.email ||
      (landlord && serviceRequest.landlord_id === landlord.id);

    if (!isOwner) {
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
