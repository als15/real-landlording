import { NextResponse } from 'next/server';
import { resend, isEmailEnabled } from '@/lib/email/resend';
import { verifyAdmin } from '@/lib/api/admin';

export async function GET() {
  try {
    // Verify admin access
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }

    if (!isEmailEnabled) {
      return NextResponse.json(
        { message: 'Email service not configured', data: [] },
        { status: 200 }
      );
    }

    // Fetch emails from Resend API
    const { data, error } = await resend.emails.list();

    if (error) {
      console.error('Error fetching emails from Resend:', error);
      return NextResponse.json(
        { message: 'Failed to fetch emails', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: data?.data || [] });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
