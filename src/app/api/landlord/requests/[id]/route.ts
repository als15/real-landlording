import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, userEmail } = result.context;

    // Get the request with matches and follow-up data
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
          ),
          followup:match_followups(
            stage
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
    if (serviceRequest.landlord_email !== userEmail) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Flatten followup from array to single object per match
    if (serviceRequest.matches) {
      serviceRequest.matches = serviceRequest.matches.map((match: Record<string, unknown>) => ({
        ...match,
        followup: Array.isArray(match.followup) && match.followup.length > 0
          ? match.followup[0]
          : null,
      }));
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
