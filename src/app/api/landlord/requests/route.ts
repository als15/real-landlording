import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client to bypass RLS for fetching user's own requests
    const adminClient = createAdminClient();

    // Get requests by email (most reliable - works for pre-signup and post-signup requests)
    const { data: requests, error } = await adminClient
      .from('service_requests')
      .select('*')
      .eq('landlord_email', user.email)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching requests:', error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
