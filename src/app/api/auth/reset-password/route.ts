import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const { token, password, userType = 'landlord' } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { message: 'Token and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { message: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Find and validate token
    const { data: tokenData, error: tokenError } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('token', token)
      .eq('user_type', userType)
      .single();

    if (tokenError || !tokenData) {
      return NextResponse.json(
        { message: 'Invalid or expired reset link' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      // Delete expired token
      await supabase
        .from('password_reset_tokens')
        .delete()
        .eq('token', token);

      return NextResponse.json(
        { message: 'Reset link has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Get the user's auth_user_id from the appropriate table
    const table = userType === 'vendor' ? 'vendors' : 'landlords';
    const { data: userData, error: userError } = await supabase
      .from(table)
      .select('auth_user_id')
      .eq('email', tokenData.email)
      .single();

    if (userError || !userData?.auth_user_id) {
      console.error('Error finding user:', userError);
      return NextResponse.json(
        { message: 'User account not found. Please sign up first.' },
        { status: 400 }
      );
    }

    // Update password in Supabase Auth using admin API
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userData.auth_user_id,
      { password }
    );

    if (updateError) {
      console.error('Error updating password:', updateError);
      return NextResponse.json(
        { message: 'Failed to update password' },
        { status: 500 }
      );
    }

    // Delete used token
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('token', token);

    return NextResponse.json({
      message: 'Password has been reset successfully',
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { message: 'Failed to reset password' },
      { status: 500 }
    );
  }
}
