/**
 * Shared CRM job query logic used by both the paginated jobs endpoint
 * and the unpaginated export endpoint.
 */

import { MatchStatus, PaymentStatus } from '@/types/database';
import { SupabaseClient } from '@supabase/supabase-js';

// ── Status group constants ──────────────────────────────────────────

/** Statuses where a follow-up is needed (no outcome yet) */
export const FOLLOWUP_STATUSES: MatchStatus[] = [
  'intro_sent',
  'estimate_sent',
  'vendor_accepted',
];

/** Terminal / lost statuses */
export const LOST_STATUSES: MatchStatus[] = [
  'vendor_declined',
  'no_response',
  'no_show',
  'cancelled',
];

/** All closed statuses (terminal + completed) */
export const CLOSED_STATUSES: MatchStatus[] = [
  'completed',
  ...LOST_STATUSES,
];

/** Statuses excluded from "overdue" checks (Supabase .not() filter format) */
export const TERMINAL_STATUSES_FILTER = `("${CLOSED_STATUSES.join('","')}")`;

/** Payment statuses that count as outstanding for commission tracking */
export const OUTSTANDING_PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'invoiced',
  'overdue',
];

// ── Shared select fragments ─────────────────────────────────────────

export const JOB_SELECT_BASE = `
  *,
  vendor:vendors(id, business_name, contact_name, email, phone),
  request:service_requests(
    id, service_type, property_address, zip_code,
    landlord_name, landlord_email, landlord_phone,
    job_description, urgency, status, created_at
  )
`;

export const JOB_SELECT_EXPORT = `
  *,
  vendor:vendors(id, business_name, contact_name, email, phone),
  request:service_requests(
    id, service_type, finish_level, property_address, zip_code,
    landlord_name, landlord_email, landlord_phone,
    job_description, urgency, status, created_at
  )
`;

// ── Query builder helpers ───────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryBuilder = any;

/**
 * Apply a stage filter preset to a Supabase query on request_vendor_matches.
 * Returns the modified query.
 */
export function applyStageFilter(query: QueryBuilder, stage: string): QueryBuilder {
  switch (stage) {
    case 'intro_sent':
      return query.eq('status', 'intro_sent');
    case 'awaiting_outcome':
      return query.eq('status', 'vendor_accepted').is('job_won', null);
    case 'job_won':
      return query.eq('job_won', true).eq('job_completed', false);
    case 'in_progress':
      return query.eq('status', 'in_progress');
    case 'completed':
      return query.eq('status', 'completed');
    case 'lost':
      return query.in('status', LOST_STATUSES);
    case 'needs_review':
      return query.eq('job_completed', true).is('review_rating', null);
    case 'needs_followup':
      return query.in('status', FOLLOWUP_STATUSES).is('job_won', null);
    case 'commission_pending':
      // Pre-filter: all won jobs. Post-filter in attachPayments handles the rest.
      return query.eq('job_won', true);
    case 'overdue':
      return query
        .lt('expected_due_date', new Date().toISOString())
        .not('status', 'in', TERMINAL_STATUSES_FILTER);
    case 'closed':
      return query.in('status', CLOSED_STATUSES);
    default:
      return query;
  }
}

/**
 * Post-query: filter results by service type and search text.
 * These filters run client-side because they reference joined relations.
 */
export function applyPostQueryFilters(
  data: Record<string, unknown>[],
  options: { serviceType?: string | null; search?: string | null }
): Record<string, unknown>[] {
  let filtered = data;

  if (options.serviceType) {
    filtered = filtered.filter(
      (job) => (job.request as Record<string, unknown>)?.service_type === options.serviceType
    );
  }

  if (options.search) {
    const term = options.search.toLowerCase();
    filtered = filtered.filter((job) => {
      const req = job.request as Record<string, string | null> | undefined;
      const vendor = job.vendor as Record<string, string | null> | undefined;
      return (
        req?.landlord_name?.toLowerCase().includes(term) ||
        req?.landlord_email?.toLowerCase().includes(term) ||
        vendor?.business_name?.toLowerCase().includes(term) ||
        vendor?.contact_name?.toLowerCase().includes(term)
      );
    });
  }

  return filtered;
}

/**
 * Fetch referral payments for a set of match IDs and return them indexed by match_id.
 */
export async function fetchPaymentsByMatchIds(
  adminClient: SupabaseClient,
  matchIds: string[]
): Promise<Record<string, Record<string, unknown>>> {
  if (matchIds.length === 0) return {};

  const { data: paymentData } = await adminClient
    .from('referral_payments')
    .select('*')
    .in('match_id', matchIds);

  if (!paymentData) return {};

  return paymentData.reduce((acc, payment) => {
    if (payment.match_id) {
      acc[payment.match_id] = payment;
    }
    return acc;
  }, {} as Record<string, Record<string, unknown>>);
}

/**
 * Attach payments to jobs and apply the commission_pending post-filter if needed.
 */
export function attachPaymentsAndFilter(
  jobs: Record<string, unknown>[],
  payments: Record<string, Record<string, unknown>>,
  stage?: string | null
) {
  let result = jobs.map((job) => ({
    ...job,
    payment: payments[job.id as string] || null,
  }));

  if (stage === 'commission_pending') {
    result = result.filter((job) => {
      const completed = (job as Record<string, unknown>).job_completed;
      const payment = job.payment as Record<string, unknown> | null;
      return (
        !completed ||
        (payment &&
          OUTSTANDING_PAYMENT_STATUSES.includes(payment.status as PaymentStatus))
      );
    });
  }

  return result;
}
