import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';
import { VendorInput } from '@/types/database';

// Helper to extract zip code from location string
function extractZipCode(location: string): string | null {
  // Match 5-digit zip code anywhere in the string
  const match = location.match(/\b(\d{5})\b/);
  return match ? match[1] : null;
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
    const search = searchParams.get('search');
    const service_type = searchParams.get('service_type');
    const location = searchParams.get('location');
    const zip_code = searchParams.get('zip_code'); // Direct zip code parameter
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const sortField = searchParams.get('sortField') || 'business_name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Validate sort field to prevent SQL injection
    const allowedSortFields = ['business_name', 'email', 'performance_score', 'status', 'created_at'];
    const validSortField = allowedSortFields.includes(sortField) ? sortField : 'business_name';
    const ascending = sortOrder === 'asc';

    let query = adminClient
      .from('vendors')
      .select('*', { count: 'exact' })
      .order(validSortField, { ascending });

    if (status) {
      query = query.eq('status', status);
    }

    if (service_type) {
      query = query.contains('services', [service_type]);
    }

    // Handle location/zip code filtering
    // Only filter by location if explicitly requested with require_location=true
    // This allows matching to find all vendors for a service type first
    const requireLocation = searchParams.get('require_location') === 'true';
    const targetZip = zip_code || (location ? extractZipCode(location) : null);
    if (targetZip && requireLocation) {
      // Check if vendor serves this zip code area
      query = query.contains('service_areas', [targetZip]);
    }

    // Server-side search across multiple fields
    if (search && search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query = query.or(
        `business_name.ilike.${searchTerm},contact_name.ilike.${searchTerm},email.ilike.${searchTerm},phone.ilike.${searchTerm}`
      );
    }

    // Apply pagination after filters
    query = query.range(offset, offset + limit - 1);

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
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const body: VendorInput = await request.json();

    // Validate required fields
    if (!body.contact_name || !body.email || !body.business_name || !body.services || !body.service_areas) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await adminClient
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
