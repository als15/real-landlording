import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { PaymentStatus } from '@/types/database';

// GET /api/admin/payments - List payments with filters
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
    const status = searchParams.get('status') as PaymentStatus | null;
    const vendorId = searchParams.get('vendorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Build query
    let query = adminClient
      .from('referral_payments')
      .select(`
        *,
        vendor:vendors(id, business_name, contact_name, email),
        request:service_requests(id, service_type, property_address, zip_code, landlord_name, landlord_email),
        match:request_vendor_matches(id, status, job_completed, job_completed_at)
      `, { count: 'exact' });

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (vendorId) {
      query = query.eq('vendor_id', vendorId);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) {
      console.error('Error fetching payments:', error);
      return NextResponse.json(
        { message: 'Failed to fetch payments', error: error.message },
        { status: 500 }
      );
    }

    // Calculate summary stats
    const { data: summaryData } = await adminClient
      .from('referral_payments')
      .select('status, amount');

    const summary = {
      pending: 0,
      pendingAmount: 0,
      paid: 0,
      paidAmount: 0,
      overdue: 0,
      overdueAmount: 0,
      thisMonth: 0,
      thisMonthAmount: 0,
    };

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    if (summaryData) {
      for (const payment of summaryData) {
        const amount = Number(payment.amount) || 0;
        if (payment.status === 'pending' || payment.status === 'invoiced') {
          summary.pending++;
          summary.pendingAmount += amount;
        } else if (payment.status === 'paid') {
          summary.paid++;
          summary.paidAmount += amount;
        } else if (payment.status === 'overdue') {
          summary.overdue++;
          summary.overdueAmount += amount;
        }
      }
    }

    // Get this month's paid payments
    const { data: thisMonthData } = await adminClient
      .from('referral_payments')
      .select('amount')
      .eq('status', 'paid')
      .gte('paid_date', startOfMonth.toISOString());

    if (thisMonthData) {
      summary.thisMonth = thisMonthData.length;
      summary.thisMonthAmount = thisMonthData.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    }

    return NextResponse.json({
      payments: data || [],
      total: count || 0,
      page,
      pageSize,
      summary,
    });
  } catch (error) {
    console.error('Payments API error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/admin/payments - Create a new payment record
export async function POST(request: NextRequest) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;

    const body = await request.json();
    const {
      match_id,
      vendor_id,
      request_id,
      amount,
      fee_type = 'fixed',
      fee_percentage,
      job_cost,
      status = 'pending',
      invoice_date,
      due_date,
      paid_date,
      payment_method,
      payment_reference,
      notes,
    } = body;

    // Validate required fields
    if (!amount || amount <= 0) {
      return NextResponse.json(
        { message: 'Amount is required and must be positive' },
        { status: 400 }
      );
    }

    if (!vendor_id && !match_id) {
      return NextResponse.json(
        { message: 'Either vendor_id or match_id is required' },
        { status: 400 }
      );
    }

    // If match_id provided but no vendor_id/request_id, fetch them
    let finalVendorId = vendor_id;
    let finalRequestId = request_id;

    if (match_id && (!vendor_id || !request_id)) {
      const { data: match } = await adminClient
        .from('request_vendor_matches')
        .select('vendor_id, request_id')
        .eq('id', match_id)
        .single();

      if (match) {
        finalVendorId = finalVendorId || match.vendor_id;
        finalRequestId = finalRequestId || match.request_id;
      }
    }

    const { data, error } = await adminClient
      .from('referral_payments')
      .insert({
        match_id,
        vendor_id: finalVendorId,
        request_id: finalRequestId,
        amount,
        fee_type,
        fee_percentage,
        job_cost,
        status,
        invoice_date,
        due_date,
        paid_date,
        payment_method,
        payment_reference,
        notes,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating payment:', error);
      return NextResponse.json(
        { message: 'Failed to create payment', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Create payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
