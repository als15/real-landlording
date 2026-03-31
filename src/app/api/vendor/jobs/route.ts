import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';

export async function GET(request: NextRequest) {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status');
    const serviceType = searchParams.get('service_type');
    const urgency = searchParams.get('urgency');

    // Get jobs assigned to this vendor
    let query = adminClient
      .from('request_vendor_matches')
      .select(`
        *,
        request:service_requests(*)
      `)
      .eq('vendor_id', vendorId)
      .order('created_at', { ascending: false });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (serviceType) {
      query = query.eq('request.service_type', serviceType);
    }
    if (urgency) {
      query = query.eq('request.urgency', urgency);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ data: [] });
    }

    // Filter out null requests (from service_type/urgency filter mismatches on joined table)
    const filtered = (jobs || []).filter((j: Record<string, unknown>) => j.request !== null);

    return NextResponse.json({ data: filtered });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
