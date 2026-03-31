import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

export async function GET(request: NextRequest) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, userEmail } = result.context;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const serviceType = searchParams.get('service_type');
    const urgency = searchParams.get('urgency');

    let query = adminClient
      .from('service_requests')
      .select('*, match_count:request_vendor_matches(count)')
      .eq('landlord_email', userEmail)
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (serviceType) query = query.eq('service_type', serviceType);
    if (urgency) query = query.eq('urgency', urgency);

    const { data: requests, error } = await query;

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json({ data: [] });
    }

    // Flatten match count from Supabase relation count format
    const formatted = (requests || []).map((r) => ({
      ...r,
      match_count: Array.isArray(r.match_count) && r.match_count[0]
        ? r.match_count[0].count
        : 0,
    }));

    return NextResponse.json({ data: formatted });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
