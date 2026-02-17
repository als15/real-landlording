import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const { allowed } = rateLimit(`landlord-login:${ip}`, 5, 15 * 60 * 1000);
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

    // Get or create landlord profile
    let { data: landlord } = await supabase
      .from('landlords')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single();

    // If no landlord profile linked, try to find by email
    if (!landlord) {
      const { data: landlordByEmail } = await supabase
        .from('landlords')
        .select('*')
        .eq('email', email)
        .single();

      if (landlordByEmail) {
        // Link existing landlord profile to auth user
        await supabase
          .from('landlords')
          .update({ auth_user_id: authData.user.id })
          .eq('id', landlordByEmail.id);
        landlord = landlordByEmail;
      } else {
        // Create new landlord profile
        const { data: newLandlord } = await supabase
          .from('landlords')
          .insert({
            auth_user_id: authData.user.id,
            email: email,
            name: authData.user.user_metadata?.name || null,
          })
          .select()
          .single();
        landlord = newLandlord;
      }
    }

    return NextResponse.json({
      message: 'Login successful',
      user: {
        id: authData.user.id,
        email: authData.user.email,
      },
      landlord,
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
