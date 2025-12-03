import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET() {
  try {
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

    // Get vendor profile (bypass RLS)
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

    // Get jobs assigned to this vendor
    const { data: jobs, error } = await adminClient
      .from('request_vendor_matches')
      .select(`
        *,
        request:service_requests(*)
      `)
      .eq('vendor_id', vendor.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: jobs });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
