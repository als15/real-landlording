import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyAdmin } from '@/lib/api/admin';
import { sendIntroEmails } from '@/lib/email/send';
import { ServiceRequest, Vendor } from '@/types/database';

// Note: createClient is used for the GET endpoint below

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const { id } = await params;
    const { vendor_ids } = await request.json();

    if (!vendor_ids || !Array.isArray(vendor_ids) || vendor_ids.length === 0) {
      return NextResponse.json(
        { message: 'Please provide vendor IDs to match' },
        { status: 400 }
      );
    }

    if (vendor_ids.length > 3) {
      return NextResponse.json(
        { message: 'Maximum 3 vendors can be matched per request' },
        { status: 400 }
      );
    }

    // Get the service request
    const { data: serviceRequest, error: requestError } = await adminClient
      .from('service_requests')
      .select('*')
      .eq('id', id)
      .single();

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { message: 'Request not found' },
        { status: 404 }
      );
    }

    // Get vendor details
    const { data: vendors, error: vendorError } = await adminClient
      .from('vendors')
      .select('*')
      .in('id', vendor_ids);

    if (vendorError || !vendors || vendors.length === 0) {
      return NextResponse.json(
        { message: 'Vendors not found' },
        { status: 404 }
      );
    }

    // Check for existing matches for this request
    const { data: existingMatches } = await adminClient
      .from('request_vendor_matches')
      .select('vendor_id')
      .eq('request_id', id);

    const existingVendorIds = new Set(existingMatches?.map(m => m.vendor_id) || []);

    // Filter out vendors that are already matched
    const newVendorIds = vendor_ids.filter((vid: string) => !existingVendorIds.has(vid));

    if (newVendorIds.length === 0) {
      return NextResponse.json(
        { message: 'All selected vendors are already matched to this request' },
        { status: 400 }
      );
    }

    // Create match records only for new vendors
    const matches = newVendorIds.map((vendor_id: string) => ({
      request_id: id,
      vendor_id,
      intro_sent: true,
      intro_sent_at: new Date().toISOString(),
    }));

    const { error: matchError } = await adminClient
      .from('request_vendor_matches')
      .insert(matches);

    if (matchError) {
      console.error('Match error:', matchError);
      return NextResponse.json(
        { message: 'Failed to create matches', error: matchError.message },
        { status: 500 }
      );
    }

    // Filter vendors to only send emails to newly matched ones
    const newlyMatchedVendors = vendors.filter((v: Vendor) => newVendorIds.includes(v.id));

    // Update request status to matched and record intro sent time
    const { error: updateError } = await adminClient
      .from('service_requests')
      .update({
        status: 'matched',
        intro_sent_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Update error:', updateError);
    }

    // Send intro emails only to newly matched vendors (async, don't block response)
    if (newlyMatchedVendors.length > 0) {
      sendIntroEmails(serviceRequest as ServiceRequest, newlyMatchedVendors as Vendor[])
        .then(({ landlordSent, vendorsSent }) => {
          console.log(`Intro emails sent: landlord=${landlordSent}, vendors=${vendorsSent}`);
        })
        .catch(console.error);
    }

    return NextResponse.json({
      message: 'Vendors matched successfully',
      matched_count: newVendorIds.length,
      skipped_count: vendor_ids.length - newVendorIds.length,
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('request_vendor_matches')
      .select(`
        *,
        vendor:vendors(*)
      `)
      .eq('request_id', id);

    if (error) {
      return NextResponse.json(
        { message: 'Failed to fetch matches', error: error.message },
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
