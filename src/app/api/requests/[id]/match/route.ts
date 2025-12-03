import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vendor_ids } = await request.json();

    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return NextResponse.json(
        { message: 'Please provide vendor IDs to match' },
        { status: 400 }
      );
    }

    if (vendor_ids.length > 3) {
      return NextResponse.json(
        { message: 'Maximum 3 vendors can be matched per request' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Create match records
    const matches = vendor_ids.map((vendor_id: string) => ({
      request_id: id,
      vendor_id,
      intro_sent: false,
    }));

    const { error: matchError } = await supabase
      .from('request_vendor_matches')
      .insert(matches);

    if (matchError) {
      console.error('Match error:', matchError);
      return NextResponse.json(
        { message: 'Failed to create matches', error: matchError.message },
        { status: 500 }
      );
    }

    // Update request status to matched
    const { error: updateError } = await supabase
      .from('service_requests')
      .update({ status: 'matched' })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    return NextResponse.json({
      message: 'Vendors matched successfully',
      matched_count: vendor_ids.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('request_vendor_matches')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('request_id', id);

    if (error) {
      return NextResponse.json(
        { message: 'Failed to fetch matches', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
