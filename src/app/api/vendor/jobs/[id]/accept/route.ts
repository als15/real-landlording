import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get vendor profile
    const { data: vendor } = await adminClient
      .from('vendors')
      .select('id')
      .eq('email', user.email)
      .single();

    if (!vendor) {
      return NextResponse.json(
        { message: 'Vendor not found' },
        { status: 404 }
      );
    }

    // Verify this job belongs to this vendor
    const { data: match } = await adminClient
      .from('request_vendor_matches')
      .select('id, vendor_id')
      .eq('id', id)
      .single();

    if (!match || match.vendor_id !== vendor.id) {
      return NextResponse.json(
        { message: 'Job not found' },
        { status: 404 }
      );
    }

    // Update the match to accepted
    const { error: updateError } = await adminClient
      .from('request_vendor_matches')
      .update({
        vendor_accepted: true,
        vendor_responded_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      console.error('Error accepting job:', updateError);
      return NextResponse.json(
        { message: 'Failed to accept job' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Job accepted successfully' });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
