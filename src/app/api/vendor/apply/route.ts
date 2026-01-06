import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { calculateVettingScore } from '@/lib/scoring/vetting';
import { sendVendorApplicationReceivedEmail } from '@/lib/email/send';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const required = ['contact_name', 'business_name', 'email', 'phone', 'services', 'service_areas', 'qualifications', 'years_in_business'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === '') {
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

    // Use admin client to bypass RLS for public vendor applications
    const supabase = createAdminClient();

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

    // Determine if vendor is licensed based on licensed_areas
    const licensedAreas = Array.isArray(body.licensed_areas) ? body.licensed_areas : [];
    const isLicensed = licensedAreas.length > 0;

    // Calculate initial vetting score
    const vettingBreakdown = calculateVettingScore({
      licensed: isLicensed,
      insured: body.insured || false,
      years_in_business: body.years_in_business,
    });

    // Process service_specialties - flatten the nested structure
    // Form sends: { hvac: { "Equipment Type": ["Gas Furnace"], "Service Needed": ["No Heat"] } }
    // We store: { hvac: ["Gas Furnace", "No Heat"] } (flat array per service)
    let serviceSpecialties: Record<string, string[]> = {};
    if (body.service_specialties && typeof body.service_specialties === 'object') {
      for (const [service, classifications] of Object.entries(body.service_specialties)) {
        if (classifications && typeof classifications === 'object') {
          const allOptions: string[] = [];
          for (const options of Object.values(classifications as Record<string, string[]>)) {
            if (Array.isArray(options)) {
              allOptions.push(...options);
            }
          }
          if (allOptions.length > 0) {
            serviceSpecialties[service] = allOptions;
          }
        }
      }
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
        service_specialties: Object.keys(serviceSpecialties).length > 0 ? serviceSpecialties : null,
        service_areas: body.service_areas,
        qualifications: body.qualifications,
        licensed: isLicensed,
        licensed_areas: licensedAreas,
        insured: body.insured || false,
        rental_experience: body.rental_experience || false,
        call_preferences: Array.isArray(body.call_preferences) ? body.call_preferences.join(', ') : body.call_preferences || null,
        years_in_business: body.years_in_business,
        vetting_score: vettingBreakdown.totalScore,
        vetting_admin_adjustment: 0,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        status: 'pending_review',
        // Social media
        social_instagram: body.social_instagram || null,
        social_facebook: body.social_facebook || null,
        social_linkedin: body.social_linkedin || null,
        // Business details
        employee_count: body.employee_count || null,
        emergency_services: body.emergency_services || false,
        job_size_range: Array.isArray(body.job_size_range) ? body.job_size_range : null,
        // Service hours
        service_hours_weekdays: body.service_hours_weekdays || false,
        service_hours_weekends: body.service_hours_weekends || false,
        service_hours_24_7: body.service_hours_24_7 || false,
        // Payment and referral
        accepted_payments: Array.isArray(body.accepted_payments) ? body.accepted_payments : null,
        referral_source: body.referral_source || null,
        referral_source_name: body.referral_source_name || null,
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

    // Send confirmation email to vendor
    try {
      const emailSent = await sendVendorApplicationReceivedEmail({
        contact_name: body.contact_name,
        business_name: body.business_name,
        email: body.email,
      });
      console.log(`[Vendor Apply API] Email send result: ${emailSent}`);
    } catch (emailError) {
      console.error('[Vendor Apply API] Email send failed:', emailError);
      // Don't fail the application if email fails
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
