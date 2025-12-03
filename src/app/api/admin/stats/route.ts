import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch counts in parallel
    const [requestsResult, newRequestsResult, vendorsResult, landlordsResult] = await Promise.all([
      supabase.from('service_requests').select('*', { count: 'exact', head: true }),
      supabase.from('service_requests').select('*', { count: 'exact', head: true }).eq('status', 'new'),
      supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('landlords').select('*', { count: 'exact', head: true }),
    ]);

    return NextResponse.json({
      totalRequests: requestsResult.count || 0,
      newRequests: newRequestsResult.count || 0,
      totalVendors: vendorsResult.count || 0,
      totalLandlords: landlordsResult.count || 0,
    });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
