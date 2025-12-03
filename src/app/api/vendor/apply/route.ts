import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['contact_name', 'business_name', 'email', 'phone', 'services', 'service_areas', 'qualifications'];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { message: `${field} is required` },
          { status: 400 }
        );
      }
    }

    if (!body.terms_accepted) {
      return NextResponse.json(
        { message: 'You must accept the terms to apply' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if vendor with this email already exists
    const { data: existingVendor } = await supabase
      .from('vendors')
      .select('id, status')
      .eq('email', body.email)
      .single();

    if (existingVendor) {
      if (existingVendor.status === 'pending_review') {
        return NextResponse.json(
          { message: 'An application with this email is already pending review' },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { message: 'A vendor with this email already exists. Please sign in instead.' },
        { status: 400 }
        );
    }

    // Create vendor application
    const { data, error } = await supabase
      .from('vendors')
      .insert({
        contact_name: body.contact_name,
        business_name: body.business_name,
        email: body.email,
        phone: body.phone,
        website: body.website || null,
        location: body.location || null,
        services: body.services,
        service_areas: body.service_areas,
        qualifications: body.qualifications,
        licensed: body.licensed || false,
        insured: body.insured || false,
        rental_experience: body.rental_experience || false,
        call_preferences: body.call_preferences || null,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'pending_review',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to submit application', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Application submitted successfully',
      id: data.id,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
