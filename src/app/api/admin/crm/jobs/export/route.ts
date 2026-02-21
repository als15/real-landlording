import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { MatchStatus } from '@/types/database';
import {
  JOB_SELECT_EXPORT,
  applyStageFilter,
  applyPostQueryFilters,
  fetchPaymentsByMatchIds,
  attachPaymentsAndFilter,
} from '@/lib/crm/job-query';

// GET /api/admin/crm/jobs/export - Get all filtered jobs without pagination (for CSV export)
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') as MatchStatus | null;
    const stage = searchParams.get('stage');
    const vendorId = searchParams.get('vendorId');
    const serviceType = searchParams.get('serviceType');
    const search = searchParams.get('search');

    // Build query — same filters as jobs/route.ts but no pagination
    let query = adminClient
      .from('request_vendor_matches')
      .select(JOB_SELECT_EXPORT);

    if (status) {
      query = query.eq('status', status);
    }

    if (stage) {
      query = applyStageFilter(query, stage);
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching jobs for export:', error);
      return NextResponse.json(
        { message: 'Failed to fetch jobs', error: error.message },
        { status: 500 }
      );
    }

    const filteredData = applyPostQueryFilters(data || [], { serviceType, search });

    const matchIds = filteredData.map((job) => job.id as string);
    const payments = await fetchPaymentsByMatchIds(adminClient, matchIds);
    const jobsWithPayments = attachPaymentsAndFilter(filteredData, payments, stage);

    return NextResponse.json({ jobs: jobsWithPayments });
  } catch (error) {
    console.error('Jobs export API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
