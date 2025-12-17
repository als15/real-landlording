import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateVettingScore } from '@/lib/scoring/vetting';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vendors')
      .select(`
        *,
        matches:request_vendor_matches(
          *,
          request:service_requests(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Vendor not found', error: error.message },
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
    const { id } = await params;
    const body = await request.json();
    const supabase = await createClient();

    // Check if vetting-related fields are being updated
    const vettingFieldsChanged = 'licensed' in body || 'insured' in body || 'years_in_business' in body;

    let updateData = { ...body };

    // If vetting fields changed, recalculate the vetting score
    if (vettingFieldsChanged) {
      // Get current vendor data to merge with updates
      const { data: currentVendor } = await supabase
        .from('vendors')
        .select('licensed, insured, years_in_business')
        .eq('id', id)
        .single();

      if (currentVendor) {
        const mergedData = {
          licensed: body.licensed ?? currentVendor.licensed,
          insured: body.insured ?? currentVendor.insured,
          years_in_business: body.years_in_business ?? currentVendor.years_in_business,
        };

        const vettingBreakdown = calculateVettingScore({
          licensed: mergedData.licensed || false,
          insured: mergedData.insured || false,
          years_in_business: mergedData.years_in_business,
        });

        updateData.vetting_score = vettingBreakdown.totalScore;
      }
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Failed to update vendor', error: error.message },
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { message: 'Failed to delete vendor', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Vendor deleted' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
