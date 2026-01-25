import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// PATCH - Update application fields (social links, admin notes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const supabase = createAdminClient();

    // Only allow updating specific fields (NOT personal info: contact_name, email, phone, business_name)
    const allowedFields = [
      // Business info
      'website',
      'location',
      'services',
      'service_specialties',
      'service_areas',
      // Qualifications
      'licensed',
      'insured',
      'rental_experience',
      'qualifications',
      'licensed_areas',
      // Business details
      'years_in_business',
      'employee_count',
      'emergency_services',
      'job_size_range',
      'service_hours_weekdays',
      'service_hours_weekends',
      'service_hours_24_7',
      'accepted_payments',
      // Contact preferences
      'call_preferences',
      // Social media
      'social_instagram',
      'social_facebook',
      'social_linkedin',
      // Referral
      'referral_source',
      'referral_source_name',
      // Admin
      'admin_notes',
    ];

    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields to update' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('vendors')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating application:', error);
      return NextResponse.json(
        { message: 'Failed to update application', error: error.message },
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

// DELETE - Delete an application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { error } = await supabase
      .from('vendors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting application:', error);
      return NextResponse.json(
        { message: 'Failed to delete application', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Application deleted' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
