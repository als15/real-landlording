import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { VendorInput } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const service_type = searchParams.get('service_type');
    const location = searchParams.get('location');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('vendors')
      .select('*', { count: 'exact' })
      .order('performance_score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status) {
      query = query.eq('status', status);
    }

    if (service_type) {
      query = query.contains('services', [service_type]);
    }

    if (location) {
      // Check if vendor serves this zip code area
      query = query.contains('service_areas', [location.substring(0, 5)]);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch vendors', error: error.message },
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

export async function POST(request: NextRequest) {
  try {
    const body: VendorInput = await request.json();

    // Validate required fields
    if (!body.contact_name || !body.email || !body.business_name || !body.services || !body.service_areas) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('vendors')
      .insert({
        contact_name: body.contact_name,
        email: body.email,
        phone: body.phone || null,
        business_name: body.business_name,
        website: body.website || null,
        location: body.location || null,
        services: body.services,
        services_other: body.services_other || null,
        qualifications: body.qualifications || null,
        licensed: body.licensed || false,
        insured: body.insured || false,
        rental_experience: body.rental_experience || false,
        service_areas: body.service_areas,
        call_preferences: body.call_preferences || null,
        status: 'pending_review',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to create vendor', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id, message: 'Vendor created successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
