import { NextRequest, NextResponse } from 'next/server';
import { verifyVendor } from '@/lib/api/vendor';
import { calculateVettingScore } from '@/lib/scoring/vetting';

export async function GET() {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const { data: vendor, error } = await adminClient
      .from('vendors')
      .select('*')
      .eq('id', vendorId)
      .single();

    if (error || !vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: vendor });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Allowlisted fields that vendors can edit
const EDITABLE_FIELDS = new Set([
  // Contact
  'contact_name', 'phone', 'website', 'location', 'call_preferences',
  // Social
  'social_instagram', 'social_facebook', 'social_linkedin',
  // Services
  'services', 'service_specialties', 'service_areas', 'licensed_areas',
  // Qualifications
  'qualifications', 'licensed', 'insured', 'rental_experience',
  'license_not_required', 'not_currently_licensed', 'years_in_business',
  // Business
  'employee_count', 'job_size_range', 'accepted_payments',
  'service_hours_weekdays', 'service_hours_weekends', 'emergency_services',
]);

// Fields that trigger vetting score recalculation
const VETTING_FIELDS = new Set(['licensed', 'insured', 'years_in_business']);

export async function PATCH(request: NextRequest) {
  try {
    const result = await verifyVendor();
    if (!result.success) return result.response;
    const { adminClient, vendorId } = result.context;

    const body = await request.json();

    // Filter to only allowed fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(body)) {
      if (EDITABLE_FIELDS.has(key)) {
        updates[key] = value;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { message: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Check if vetting fields changed — recalculate vetting_score
    const needsVettingRecalc = Object.keys(updates).some((k) => VETTING_FIELDS.has(k));

    if (needsVettingRecalc) {
      // Fetch current vendor data for fields not being updated
      const { data: currentVendor } = await adminClient
        .from('vendors')
        .select('licensed, insured, years_in_business, vetting_admin_adjustment')
        .eq('id', vendorId)
        .single();

      if (currentVendor) {
        const vettingInput = {
          licensed: (updates.licensed !== undefined ? updates.licensed : currentVendor.licensed) as boolean,
          insured: (updates.insured !== undefined ? updates.insured : currentVendor.insured) as boolean,
          years_in_business: (updates.years_in_business !== undefined ? updates.years_in_business : currentVendor.years_in_business) as number | null,
          vetting_admin_adjustment: currentVendor.vetting_admin_adjustment,
        };

        const { totalScore } = calculateVettingScore(vettingInput);
        updates.vetting_score = totalScore;
      }
    }

    updates.updated_at = new Date().toISOString();

    const { data: vendor, error } = await adminClient
      .from('vendors')
      .update(updates)
      .eq('id', vendorId)
      .select('*')
      .single();

    if (error) {
      console.error('Error updating vendor profile:', error);
      return NextResponse.json(
        { message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: vendor });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
