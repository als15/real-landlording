import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/api/admin';
import { JobOutcomeReason } from '@/types/database';

// PATCH /api/admin/matches/[id] - Update match (job outcome, completion, etc.)
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
      job_won,
      job_completed,
      job_outcome_reason,
      outcome_notes,
      review_requested_at,
      status,
      expected_due_date,
      admin_notes,
      // For creating payment when job is marked complete
      create_payment,
      payment_amount,
      payment_fee_type,
      job_cost,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};

    // Job won tracking
    if (job_won !== undefined) {
      updates.job_won = job_won;
      if (job_won === true) {
        updates.job_won_at = new Date().toISOString();
        updates.status = 'in_progress';
      }
    }

    // Job completion
    if (job_completed !== undefined) {
      updates.job_completed = job_completed;
      if (job_completed === true) {
        updates.job_completed_at = new Date().toISOString();
        updates.status = 'completed';
        if (!job_outcome_reason) {
          updates.job_outcome_reason = 'completed_successfully';
        }
      }
    }

    // Outcome tracking
    if (job_outcome_reason !== undefined) {
      updates.job_outcome_reason = job_outcome_reason as JobOutcomeReason;
    }
    if (outcome_notes !== undefined) {
      updates.outcome_notes = outcome_notes;
    }

    // Review request tracking
    if (review_requested_at !== undefined) {
      updates.review_requested_at = review_requested_at;
    }

    // Direct status override (if provided)
    if (status !== undefined && !updates.status) {
      updates.status = status;
    }

    // Operational fields
    if (expected_due_date !== undefined) {
      updates.expected_due_date = expected_due_date;
    }
    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes;
    }

    // Update the match
    const { data: matchData, error: matchError } = await adminClient
      .from('request_vendor_matches')
      .update(updates)
      .eq('id', id)
      .select('*, vendor:vendors(id, business_name, default_fee_amount, default_fee_type)')
      .single();

    if (matchError) {
      console.error('Error updating match:', matchError);
      return NextResponse.json(
        { message: 'Failed to update match', error: matchError.message },
        { status: 500 }
      );
    }

    // Create payment record if requested (typically when job is marked complete)
    let paymentData = null;
    if (create_payment && job_completed === true && payment_amount) {
      const { data: payment, error: paymentError } = await adminClient
        .from('referral_payments')
        .insert({
          match_id: id,
          vendor_id: matchData.vendor_id,
          request_id: matchData.request_id,
          amount: payment_amount,
          fee_type: payment_fee_type || matchData.vendor?.default_fee_type || 'fixed',
          job_cost: job_cost,
          status: 'pending',
        })
        .select()
        .single();

      if (paymentError) {
        console.error('Error creating payment:', paymentError);
        // Don't fail the whole request, just log it
      } else {
        paymentData = payment;
      }
    }

    // Update request status if all matches for the request are completed
    if (job_completed === true) {
      // Check if this was the winning match
      if (matchData.job_won === true) {
        await adminClient
          .from('service_requests')
          .update({ status: 'completed' })
          .eq('id', matchData.request_id);
      }
    }

    return NextResponse.json({
      match: matchData,
      payment: paymentData,
    });
  } catch (error) {
    console.error('Update match error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/admin/matches/[id] - Get single match with full details
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
      .from('request_vendor_matches')
      .select(`
        *,
        vendor:vendors(
          id, business_name, contact_name, email, phone,
          default_fee_type, default_fee_amount, default_fee_percentage
        ),
        request:service_requests(
          id, service_type, property_address, zip_code,
          landlord_name, landlord_email, landlord_phone,
          job_description, urgency, status, created_at
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { message: 'Match not found', error: error.message },
        { status: 404 }
      );
    }

    // Also fetch any payment associated with this match
    const { data: payment } = await adminClient
      .from('referral_payments')
      .select('*')
      .eq('match_id', id)
      .single();

    return NextResponse.json({
      ...data,
      payment,
    });
  } catch (error) {
    console.error('Get match error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
