import { NextRequest, NextResponse } from 'next/server';
import { verifyLandlord } from '@/lib/api/landlord';

/**
 * GET /api/landlord/saved-vendors
 * List saved vendors with vendor details joined
 */
export async function GET() {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const { data, error } = await adminClient
      .from('landlord_saved_vendors')
      .select(`
        *,
        vendor:vendors(
          id,
          business_name,
          contact_name,
          email,
          phone,
          services,
          performance_score,
          total_reviews,
          licensed,
          insured,
          years_in_business,
          website
        )
      `)
      .eq('landlord_id', landlordId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved vendors:', error);
      return NextResponse.json(
        { message: 'Failed to fetch saved vendors' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/landlord/saved-vendors
 * Save a vendor
 */
export async function POST(request: NextRequest) {
  try {
    const result = await verifyLandlord();
    if (!result.success) return result.response;
    const { adminClient, landlordId } = result.context;

    const body = await request.json();
    const { vendor_id, notes, source_request_id } = body;

    if (!vendor_id) {
      return NextResponse.json(
        { message: 'vendor_id is required' },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
      .from('landlord_saved_vendors')
      .insert({
        landlord_id: landlordId,
        vendor_id,
        notes: notes || null,
        source_request_id: source_request_id || null,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { message: 'Vendor already saved' },
          { status: 409 }
        );
      }
      console.error('Error saving vendor:', error);
      return NextResponse.json(
        { message: 'Failed to save vendor' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
