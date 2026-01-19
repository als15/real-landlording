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

// Zip code prefix to state mapping (first 3 digits)
// This covers the major US zip code ranges
const ZIP_PREFIX_TO_STATE: Record<string, string> = {
  // Pennsylvania (PA) - Philadelphia area focus
  '150': 'PA', '151': 'PA', '152': 'PA', '153': 'PA', '154': 'PA', '155': 'PA', '156': 'PA', '157': 'PA', '158': 'PA', '159': 'PA',
  '160': 'PA', '161': 'PA', '162': 'PA', '163': 'PA', '164': 'PA', '165': 'PA', '166': 'PA', '167': 'PA', '168': 'PA', '169': 'PA',
  '170': 'PA', '171': 'PA', '172': 'PA', '173': 'PA', '174': 'PA', '175': 'PA', '176': 'PA', '177': 'PA', '178': 'PA', '179': 'PA',
  '180': 'PA', '181': 'PA', '182': 'PA', '183': 'PA', '184': 'PA', '185': 'PA', '186': 'PA', '187': 'PA', '188': 'PA', '189': 'PA',
  '190': 'PA', '191': 'PA', '192': 'PA', '193': 'PA', '194': 'PA', '195': 'PA', '196': 'PA',
  // New Jersey (NJ)
  '070': 'NJ', '071': 'NJ', '072': 'NJ', '073': 'NJ', '074': 'NJ', '075': 'NJ', '076': 'NJ', '077': 'NJ', '078': 'NJ', '079': 'NJ',
  '080': 'NJ', '081': 'NJ', '082': 'NJ', '083': 'NJ', '084': 'NJ', '085': 'NJ', '086': 'NJ', '087': 'NJ', '088': 'NJ', '089': 'NJ',
  // New York (NY)
  '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY', '105': 'NY', '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY',
  '110': 'NY', '111': 'NY', '112': 'NY', '113': 'NY', '114': 'NY', '115': 'NY', '116': 'NY', '117': 'NY', '118': 'NY', '119': 'NY',
  '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY', '124': 'NY', '125': 'NY', '126': 'NY', '127': 'NY', '128': 'NY', '129': 'NY',
  '130': 'NY', '131': 'NY', '132': 'NY', '133': 'NY', '134': 'NY', '135': 'NY', '136': 'NY', '137': 'NY', '138': 'NY', '139': 'NY',
  '140': 'NY', '141': 'NY', '142': 'NY', '143': 'NY', '144': 'NY', '145': 'NY', '146': 'NY', '147': 'NY', '148': 'NY', '149': 'NY',
  // Delaware (DE)
  '197': 'DE', '198': 'DE', '199': 'DE',
  // Maryland (MD)
  '206': 'MD', '207': 'MD', '208': 'MD', '209': 'MD', '210': 'MD', '211': 'MD', '212': 'MD', '214': 'MD', '215': 'MD', '216': 'MD', '217': 'MD', '218': 'MD', '219': 'MD',
  // Washington DC
  '200': 'DC', '202': 'DC', '203': 'DC', '204': 'DC', '205': 'DC',
  // Virginia (VA)
  '220': 'VA', '221': 'VA', '222': 'VA', '223': 'VA', '224': 'VA', '225': 'VA', '226': 'VA', '227': 'VA', '228': 'VA', '229': 'VA',
  '230': 'VA', '231': 'VA', '232': 'VA', '233': 'VA', '234': 'VA', '235': 'VA', '236': 'VA', '237': 'VA', '238': 'VA', '239': 'VA',
  '240': 'VA', '241': 'VA', '242': 'VA', '243': 'VA', '244': 'VA', '245': 'VA', '246': 'VA',
  // West Virginia (WV)
  '247': 'WV', '248': 'WV', '249': 'WV', '250': 'WV', '251': 'WV', '252': 'WV', '253': 'WV', '254': 'WV', '255': 'WV', '256': 'WV',
  '257': 'WV', '258': 'WV', '259': 'WV', '260': 'WV', '261': 'WV', '262': 'WV', '263': 'WV', '264': 'WV', '265': 'WV', '266': 'WV', '267': 'WV', '268': 'WV',
  // Connecticut (CT)
  '060': 'CT', '061': 'CT', '062': 'CT', '063': 'CT', '064': 'CT', '065': 'CT', '066': 'CT', '067': 'CT', '068': 'CT', '069': 'CT',
  // Massachusetts (MA)
  '010': 'MA', '011': 'MA', '012': 'MA', '013': 'MA', '014': 'MA', '015': 'MA', '016': 'MA', '017': 'MA', '018': 'MA', '019': 'MA',
  '020': 'MA', '021': 'MA', '022': 'MA', '023': 'MA', '024': 'MA', '025': 'MA', '026': 'MA', '027': 'MA',
};

// Get state from zip code using prefix mapping
function getStateFromZip(zip: string): string | null {
  if (!zip || zip.length < 3) return null;
  const prefix = zip.substring(0, 3);
  return ZIP_PREFIX_TO_STATE[prefix] || null;
}

// Build service area matching patterns for a given zip code
// Returns all patterns a vendor's service_areas could contain to match this zip
function getServiceAreaMatchPatterns(zip: string): string[] {
  const patterns: string[] = [];

  if (!zip || !/^\d{5}$/.test(zip)) return patterns;

  // Exact zip code match
  patterns.push(zip);

  // 3-digit prefix match (e.g., prefix:191 for 19103)
  patterns.push(`prefix:${zip.substring(0, 3)}`);

  // 4-digit prefix match (e.g., prefix:1910 for 19103)
  patterns.push(`prefix:${zip.substring(0, 4)}`);

  // State match
  const state = getStateFromZip(zip);
  if (state) {
    patterns.push(`state:${state}`);
  }

  return patterns;
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
      // Get all possible matching patterns for this zip code
      // This includes: exact zip, prefix:XXX, prefix:XXXX, state:XX
      const patterns = getServiceAreaMatchPatterns(targetZip);

      if (patterns.length > 0) {
        // Build OR conditions for each pattern
        // Each condition checks if service_areas contains that pattern
        const orConditions = patterns
          .map(pattern => `service_areas.cs.{"${pattern}"}`)
          .join(',');
        query = query.or(orConditions);
      }
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
