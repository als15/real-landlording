import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = rateLimit(`vendor-login:${ip}`, 5, 15 * 60 * 1000);
    if (!allowed) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

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

    if (!vendor || vendor.status !== 'active') {
      // Sign out the user since they can't access vendor dashboard
      await supabase.auth.signOut();
      return NextResponse.json(
        { message: 'Unable to access vendor account. Please contact support if you need help.' },
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
