import { NextRequest, NextResponse } from 'next/server';

// DEPRECATED: Use /api/cron/follow-up-system instead.
// This endpoint is kept for backward compatibility only.

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    message: 'Deprecated — use /api/cron/follow-up-system',
    count: 0,
  });
}
