import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, requestId } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { message: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Get the site URL for email redirect
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || request.headers.get('origin') || '';

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: `${siteUrl}/auth/login?confirmed=true`,
      },
    });

    if (authError) {
      return NextResponse.json(
        { message: authError.message },
        { status: 400 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'Failed to create user' },
        { status: 500 }
      );
    }

    // Check if user already exists (identities will be empty if user exists but is unconfirmed)
    const isExistingUser = authData.user.identities && authData.user.identities.length === 0;
    if (isExistingUser) {
      return NextResponse.json(
        { message: 'An account with this email already exists. Please sign in or reset your password.' },
        { status: 400 }
      );
    }

    // Check if email confirmation is required
    const needsEmailConfirmation = !authData.user.email_confirmed_at;

    // Update or create landlord profile with auth user id
    const { error: landlordError } = await supabase
      .from('landlords')
      .upsert(
        {
          email,
          name,
          auth_user_id: authData.user.id,
        },
        { onConflict: 'email' }
      );

    if (landlordError) {
      console.error('Error updating landlord:', landlordError);
    }

    // If there's a request ID, link it to the landlord
    if (requestId) {
      const { data: landlord } = await supabase
        .from('landlords')
        .select('id')
        .eq('email', email)
        .single();

      if (landlord) {
        await supabase
          .from('service_requests')
          .update({ landlord_id: landlord.id })
          .eq('id', requestId);
      }
    }

    return NextResponse.json({
      message: needsEmailConfirmation
        ? 'Account created! Please check your email to verify your account before signing in.'
        : 'Account created successfully! You can now sign in.',
      user: { id: authData.user.id, email: authData.user.email },
      needsEmailConfirmation,
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
