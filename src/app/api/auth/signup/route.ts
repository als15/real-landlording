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

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
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
      message: 'Account created successfully',
      user: { id: authData.user.id, email: authData.user.email },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
