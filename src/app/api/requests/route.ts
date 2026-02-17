import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';
import { ServiceRequestInput } from '@/types/database';
import { sendRequestReceivedEmail } from '@/lib/email/send';
import { sendRequestReceivedSms } from '@/lib/sms/send';
import { notifyNewRequest, notifyEmergencyRequest } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const body: ServiceRequestInput = await request.json();

    // Validate required fields
    if (
      !body.landlord_email ||
      !body.first_name ||
      !body.last_name ||
      !body.service_type ||
      !body.property_address ||
      !body.zip_code ||
      !body.job_description
    ) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use admin client to bypass RLS for public request submission
    const supabase = createAdminClient();

    // Build property_location from address and zip for backward compatibility
    const propertyLocation = `${body.property_address}, ${body.zip_code}`;

    // Compute landlord_name from first/last name for backward compatibility
    const landlordName = `${body.first_name} ${body.last_name}`.trim();

    // Check if landlord exists with this email, or create one
    let { data: existingLandlord } = await supabase
      .from('landlords')
      .select('id, request_count')
      .eq('email', body.landlord_email)
      .single();

    // If no landlord exists, create one FIRST so we have the ID for the request
    if (!existingLandlord) {
      const { data: newLandlord, error: landlordError } = await supabase
        .from('landlords')
        .insert({
          email: body.landlord_email,
          name: landlordName,
          first_name: body.first_name,
          last_name: body.last_name,
          phone: body.landlord_phone || null,
          request_count: 0, // Will be incremented by trigger
        })
        .select('id, request_count')
        .single();

      if (landlordError) {
        console.error('Failed to create landlord:', landlordError);
        return NextResponse.json(
          { message: 'Failed to create landlord profile' },
          { status: 500 }
        );
      }
      existingLandlord = newLandlord;
    }

    // Create the service request with proper landlord_id
    const { data, error } = await supabase
      .from('service_requests')
      .insert({
        landlord_id: existingLandlord.id,
        landlord_email: body.landlord_email,
        landlord_name: landlordName,
        landlord_phone: body.landlord_phone || null,
        contact_preference: body.contact_preference || null,
        // New split name fields
        first_name: body.first_name,
        last_name: body.last_name,
        // Owner/business info
        is_owner: body.is_owner ?? true,
        business_name: body.business_name || null,
        // Property info
        property_address: body.property_address,
        zip_code: body.zip_code,
        property_type: body.property_type || null,
        unit_count: body.unit_count || null,
        occupancy_status: body.occupancy_status || null,
        latitude: body.latitude || null,
        longitude: body.longitude || null,
        property_location: propertyLocation, // Legacy field
        // Service info
        service_type: body.service_type,
        service_details: body.service_details || null,
        job_description: body.job_description,
        urgency: body.urgency || 'medium',
        // Note: budget_range column needs migration 016 to be applied
        // budget_range: body.budget_range || null,
        finish_level: body.finish_level || null,
        // Media
        media_urls: body.media_urls || [],
        status: 'new',
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to create request' },
        { status: 500 }
      );
    }

    // The trigger increments request_count automatically when request is inserted
    // Update landlord contact info if provided (in case they changed)
    await supabase
      .from('landlords')
      .update({
        first_name: body.first_name,
        last_name: body.last_name,
        name: landlordName,
        phone: body.landlord_phone || undefined, // Only update if provided
      })
      .eq('id', existingLandlord.id);

    // Fetch updated request count for graduated signup nudge
    const { data: updatedLandlord } = await supabase
      .from('landlords')
      .select('request_count')
      .eq('id', existingLandlord.id)
      .single();

    const requestCount = updatedLandlord?.request_count || 1;

    // Send confirmation email and SMS
    try {
      const emailSent = await sendRequestReceivedEmail(data);
      console.log(`[Request API] Email send result: ${emailSent}`);
    } catch (emailError) {
      console.error('[Request API] Email send failed:', emailError);
      // Don't fail the request if email fails
    }

    try {
      const smsSent = await sendRequestReceivedSms(data);
      console.log(`[Request API] SMS send result: ${smsSent}`);
    } catch (smsError) {
      console.error('[Request API] SMS send failed:', smsError);
      // Don't fail the request if SMS fails
    }

    // Create admin notification (A1 or A2)
    try {
      let notifyResult;
      if (data.urgency === 'emergency') {
        notifyResult = await notifyEmergencyRequest(supabase, {
          id: data.id,
          service_type: data.service_type,
          zip_code: data.zip_code,
          landlord_name: landlordName,
          job_description: data.job_description,
        });
      } else {
        notifyResult = await notifyNewRequest(supabase, {
          id: data.id,
          service_type: data.service_type,
          zip_code: data.zip_code,
          landlord_name: landlordName,
          urgency: data.urgency,
        });
      }
      console.log('[Request API] Notification result:', notifyResult);
    } catch (notifyError) {
      console.error('[Request API] Notification failed:', notifyError);
      // Don't fail the request if notification fails
    }

    return NextResponse.json({
      id: data.id,
      message: 'Request created successfully',
      requestCount, // Include for graduated signup nudge
    });
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
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { searchParams } = new URL(request.url);

    const status = searchParams.get('status');
    const urgency = searchParams.get('urgency');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = adminClient
      .from('service_requests')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    if (urgency) {
      query = query.eq('urgency', urgency);
    }

    // Server-side search across multiple fields
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(
        `landlord_email.ilike.${searchTerm},landlord_name.ilike.${searchTerm},property_location.ilike.${searchTerm},job_description.ilike.${searchTerm}`
      );
    }

    // Apply pagination after filters
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch requests' },
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
