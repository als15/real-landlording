import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { MatchStatus } from '@/types/database';

// GET /api/admin/crm/jobs - Get jobs with full lifecycle data
export async function GET(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const status = searchParams.get('status') as MatchStatus | null;
    const stage = searchParams.get('stage'); // Custom stage filter
    const vendorId = searchParams.get('vendorId');
    const serviceType = searchParams.get('serviceType');
    const search = searchParams.get('search');

    // Build query
    let query = adminClient
      .from('request_vendor_matches')
      .select(`
        *,
        vendor:vendors(id, business_name, contact_name, email, phone),
        request:service_requests(
          id, service_type, property_address, zip_code,
          landlord_name, landlord_email, landlord_phone,
          job_description, urgency, status, created_at
        )
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }

    // Stage filter (groups of statuses)
    if (stage) {
      switch (stage) {
        case 'intro_sent':
          query = query.eq('status', 'intro_sent');
          break;
        case 'awaiting_outcome':
          query = query.eq('status', 'vendor_accepted').is('job_won', null);
          break;
        case 'job_won':
          query = query.eq('job_won', true).eq('job_completed', false);
          break;
        case 'in_progress':
          query = query.eq('status', 'in_progress');
          break;
        case 'completed':
          query = query.eq('status', 'completed');
          break;
        case 'lost':
          query = query.in('status', ['vendor_declined', 'no_response', 'no_show', 'cancelled']);
          break;
        case 'needs_review':
          query = query.eq('job_completed', true).is('review_rating', null);
          break;
      }
    }

    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching jobs:', error);
      return NextResponse.json(
        { message: 'Failed to fetch jobs', error: error.message },
        { status: 500 }
      );
    }

    // Filter by service type (need to do this after join)
    let filteredData = data || [];
    if (serviceType) {
      filteredData = filteredData.filter(
        (job) => job.request?.service_type === serviceType
      );
    }

    // Filter by search (landlord name/email or vendor name)
    if (search) {
      const searchLower = search.toLowerCase();
      filteredData = filteredData.filter(
        (job) =>
          job.request?.landlord_name?.toLowerCase().includes(searchLower) ||
          job.request?.landlord_email?.toLowerCase().includes(searchLower) ||
          job.vendor?.business_name?.toLowerCase().includes(searchLower) ||
          job.vendor?.contact_name?.toLowerCase().includes(searchLower)
      );
    }

    // Fetch payments for these matches
    const matchIds = filteredData.map((job) => job.id);
    let payments: Record<string, unknown> = {};

    if (matchIds.length > 0) {
      const { data: paymentData } = await adminClient
        .from('referral_payments')
        .select('*')
        .in('match_id', matchIds);

      if (paymentData) {
        payments = paymentData.reduce((acc, payment) => {
          if (payment.match_id) {
            acc[payment.match_id] = payment;
          }
          return acc;
        }, {} as Record<string, unknown>);
      }
    }

    // Attach payments to jobs
    const jobsWithPayments = filteredData.map((job) => ({
      ...job,
      payment: payments[job.id] || null,
    }));

    return NextResponse.json({
      jobs: jobsWithPayments,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error('Jobs API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
