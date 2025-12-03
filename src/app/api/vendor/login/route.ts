import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      return NextResponse.json(
        { message: authError.message },
        { status: 401 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Login failed' },
        { status: 401 }
      );
    }

    // Check if user is a vendor (bypass RLS)
    const { data: vendor } = await adminClient
      .from('vendors')
      .select('id, status, business_name')
      .eq('email', email)
      .single();

    if (!vendor) {
      return NextResponse.json(
        { message: 'No vendor account found with this email. Please apply first.' },
        { status: 403 }
      );
    }

    if (vendor.status === 'pending_review') {
      return NextResponse.json(
        { message: 'Your application is still under review. We\'ll notify you once approved.' },
        { status: 403 }
      );
    }

    if (vendor.status === 'rejected') {
      return NextResponse.json(
        { message: 'Your application was not approved. Please contact us for more information.' },
        { status: 403 }
      );
    }

    if (vendor.status === 'inactive') {
      return NextResponse.json(
        { message: 'Your vendor account is inactive. Please contact us to reactivate.' },
        { status: 403 }
      );
    }

    // Link vendor to auth user if not already linked
    await adminClient
      .from('vendors')
      .update({ auth_user_id: authData.user.id })
      .eq('id', vendor.id);

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      vendor: {
        id: vendor.id,
        business_name: vendor.business_name,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
