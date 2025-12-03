import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ServiceRequestInput } from '@/types/database';
import { sendRequestReceivedEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const body: ServiceRequestInput = await request.json();

    // Validate required fields
    if (!body.landlord_email || !body.service_type || !body.property_location || !body.job_description) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if landlord exists with this email
    const { data: existingLandlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('email', body.landlord_email)
      .single();

    // Create the service request
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        landlord_id: existingLandlord?.id || null,
        landlord_email: body.landlord_email,
        landlord_name: body.landlord_name || null,
        landlord_phone: body.landlord_phone || null,
        service_type: body.service_type,
        property_location: body.property_location,
        job_description: body.job_description,
        urgency: body.urgency || 'medium',
        budget_min: body.budget_min || null,
        budget_max: body.budget_max || null,
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to create request', error: error.message },
        { status: 500 }
      );
    }

    // If landlord doesn't exist, create a basic profile
    if (!existingLandlord) {
      await supabase.from('landlords').insert({
        email: body.landlord_email,
        name: body.landlord_name || null,
        phone: body.landlord_phone || null,
        request_count: 1,
      });
    }

    // Send confirmation email (async, don't wait)
    sendRequestReceivedEmail(data).catch(console.error);

    return NextResponse.json({ id: data.id, message: 'Request created successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('service_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch requests', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data, count });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
