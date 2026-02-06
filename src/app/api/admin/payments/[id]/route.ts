import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';

// GET /api/admin/payments/[id] - Get single payment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;
    const { id } = await params;

    const { data, error } = await adminClient
      .from('referral_payments')
      .select(`
        *,
        vendor:vendors(id, business_name, contact_name, email, phone),
        request:service_requests(id, service_type, property_address, zip_code, landlord_name, landlord_email, landlord_phone),
        match:request_vendor_matches(id, status, job_completed, job_completed_at, job_won, review_rating)
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Payment not found', error: error.message },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/payments/[id] - Update payment
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;
    const { id } = await params;

    const body = await request.json();
    const {
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
    } = body;

    // Build update object with only provided fields
    const updates: Record<string, unknown> = {};
    if (amount !== undefined) updates.amount = amount;
    if (fee_type !== undefined) updates.fee_type = fee_type;
    if (fee_percentage !== undefined) updates.fee_percentage = fee_percentage;
    if (job_cost !== undefined) updates.job_cost = job_cost;
    if (status !== undefined) updates.status = status;
    if (invoice_date !== undefined) updates.invoice_date = invoice_date;
    if (due_date !== undefined) updates.due_date = due_date;
    if (paid_date !== undefined) updates.paid_date = paid_date;
    if (payment_method !== undefined) updates.payment_method = payment_method;
    if (payment_reference !== undefined) updates.payment_reference = payment_reference;
    if (notes !== undefined) updates.notes = notes;

    // Auto-set paid_date when status changes to paid
    if (status === 'paid' && !paid_date) {
      updates.paid_date = new Date().toISOString();
    }

    const { data, error } = await adminClient
      .from('referral_payments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      return NextResponse.json(
        { message: 'Failed to update payment', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Update payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/payments/[id] - Delete payment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminResult = await verifyAdmin();
    if (!adminResult.success) {
      return adminResult.response;
    }
    const { adminClient } = adminResult.context;
    const { id } = await params;

    const { error } = await adminClient
      .from('referral_payments')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting payment:', error);
      return NextResponse.json(
        { message: 'Failed to delete payment', error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
