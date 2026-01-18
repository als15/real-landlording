import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resend, FROM_EMAIL, isEmailEnabled } from '@/lib/email/resend';
import { randomBytes } from 'crypto';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function passwordResetEmail(resetUrl: string, name?: string): { subject: string; html: string } {
  return {
    subject: 'Reset Your Password - Real Landlording',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #1890ff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #fff; padding: 24px; border: 1px solid #e8e8e8; border-top: none; }
    .footer { background: #fafafa; padding: 16px; text-align: center; font-size: 12px; color: #888; border: 1px solid #e8e8e8; border-top: none; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #1890ff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0; }
    .info-box { background: #f5f5f5; padding: 16px; border-radius: 4px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">Real Landlording</h1>
      <p style="margin: 8px 0 0;">Philadelphia's Landlord Community</p>
    </div>
    <div class="content">
      <h2>Reset Your Password</h2>
      <p>Hi ${name || 'there'},</p>
      <p>We received a request to reset your password. Click the button below to choose a new password:</p>

      <p style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </p>

      <div class="info-box">
        <p style="margin: 0;"><strong>This link expires in 1 hour.</strong></p>
      </div>

      <p>If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.</p>

      <p style="font-size: 12px; color: #888; margin-top: 24px;">
        If the button doesn't work, copy and paste this URL into your browser:<br>
        <a href="${resetUrl}" style="color: #1890ff; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Real Landlording | Philadelphia, PA</p>
      <p>Questions? Reply to this email or contact us at support@reallandlording.com</p>
    </div>
  </div>
</body>
</html>
    `.trim(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { email, userType = 'landlord' } = await request.json();

    if (!email) {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Determine which table to check
    const table = userType === 'vendor' ? 'vendors' : 'landlords';
    const nameField = userType === 'vendor' ? 'contact_name' : 'name';

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from(table)
      .select(`id, ${nameField}, email`)
      .eq('email', email.toLowerCase())
      .single();

    // Always return success to prevent email enumeration
    if (userError || !user) {
      console.log(`Password reset requested for non-existent ${userType}: ${email}`);
      return NextResponse.json({
        message: 'If an account with that email exists, you will receive a password reset link.',
      });
    }

    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store reset token
    const { error: tokenError } = await supabase
      .from('password_reset_tokens')
      .upsert({
        email: email.toLowerCase(),
        token: resetToken,
        user_type: userType,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
      }, {
        onConflict: 'email,user_type',
      });

    if (tokenError) {
      console.error('Error storing reset token:', tokenError);
      return NextResponse.json(
        { message: 'Failed to process request' },
        { status: 500 }
      );
    }

    // Send reset email
    const resetUrl = `${APP_URL}/auth/reset-password?token=${resetToken}&type=${userType}`;
    const userName = user[nameField as keyof typeof user] as string | undefined;

    if (isEmailEnabled) {
      const { subject, html } = passwordResetEmail(resetUrl, userName);
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject,
        html,
      });
      console.log(`Password reset email sent to ${email}`);
    } else {
      console.log(`[Email Skipped] Password reset URL for ${email}: ${resetUrl}`);
    }

    return NextResponse.json({
      message: 'If an account with that email exists, you will receive a password reset link.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
