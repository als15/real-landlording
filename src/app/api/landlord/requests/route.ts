import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

    // Get landlord profile
    const { data: landlord } = await supabase
      .from('landlords')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!landlord) {
      // Try to find by email
      const { data: landlordByEmail } = await supabase
        .from('landlords')
        .select('id')
        .eq('email', user.email)
        .single();

      if (!landlordByEmail) {
        return NextResponse.json({ data: [] });
      }

      // Get requests for this landlord
      const { data: requests, error } = await supabase
        .from('service_requests')
        .select('*')
        .or(`landlord_id.eq.${landlordByEmail.id},landlord_email.eq.${user.email}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching requests:', error);
        return NextResponse.json({ data: [] });
      }

      return NextResponse.json({ data: requests });
    }

    // Get requests for this landlord
    const { data: requests, error } = await supabase
      .from('service_requests')
      .select('*')
      .or(`landlord_id.eq.${landlord.id},landlord_email.eq.${user.email}`)
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
