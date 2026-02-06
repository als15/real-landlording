/**
 * Notification Service
 *
 * Helper functions to create notifications for different events.
 * All notifications are created using the admin client (service role).
 */

import { SupabaseClient } from '@supabase/supabase-js';
import {
  NotificationType,
  NotificationUserType,
  NotificationPriority,
  SERVICE_TYPE_LABELS,
  ServiceCategory,
} from '@/types/database';

interface CreateNotificationParams {
  userType: NotificationUserType;
  userId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  requestId?: string | null;
  vendorId?: string | null;
  matchId?: string | null;
  actionUrl?: string | null;
  priority?: NotificationPriority;
  metadata?: Record<string, unknown>;
  expiresAt?: Date | null;
}

/**
 * Create a notification in the database
 */
export async function createNotification(
  supabase: SupabaseClient,
  params: CreateNotificationParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('notifications').insert({
      user_type: params.userType,
      user_id: params.userId || null,
      type: params.type,
      title: params.title,
      message: params.message,
      request_id: params.requestId || null,
      vendor_id: params.vendorId || null,
      match_id: params.matchId || null,
      action_url: params.actionUrl || null,
      priority: params.priority || 'medium',
      metadata: params.metadata || {},
      expires_at: params.expiresAt?.toISOString() || null,
    });

    if (error) {
      console.error('Failed to create notification:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error creating notification:', err);
    return { success: false, error: 'Failed to create notification' };
  }
}

// ============================================================================
// Admin Notification Helpers
// ============================================================================

/**
 * A1: Notify admins of a new service request
 */
export async function notifyNewRequest(
  supabase: SupabaseClient,
  request: {
    id: string;
    service_type: ServiceCategory;
    zip_code?: string;
    landlord_name?: string;
    urgency?: string;
  }
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  const location = request.zip_code || 'Unknown';

  await createNotification(supabase, {
    userType: 'admin',
    type: 'new_request',
    title: 'New Service Request',
    message: `${serviceLabel} request in ${location}${request.landlord_name ? ` from ${request.landlord_name}` : ''}`,
    requestId: request.id,
    actionUrl: `/requests?view=${request.id}`,
    priority: 'medium',
    metadata: {
      service_type: request.service_type,
      zip_code: request.zip_code,
    },
  });
}

/**
 * A2: Notify admins of an emergency request
 */
export async function notifyEmergencyRequest(
  supabase: SupabaseClient,
  request: {
    id: string;
    service_type: ServiceCategory;
    zip_code?: string;
    landlord_name?: string;
    job_description?: string;
  }
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  const location = request.zip_code || 'Unknown';

  await createNotification(supabase, {
    userType: 'admin',
    type: 'emergency_request',
    title: '🚨 Emergency Request',
    message: `URGENT: ${serviceLabel} needed in ${location}${request.landlord_name ? ` - ${request.landlord_name}` : ''}`,
    requestId: request.id,
    actionUrl: `/requests?view=${request.id}`,
    priority: 'high',
    metadata: {
      service_type: request.service_type,
      zip_code: request.zip_code,
      description_preview: request.job_description?.substring(0, 100),
    },
  });
}

/**
 * A3: Notify admins of a stale request (unmatched for 3+ days)
 */
export async function notifyStaleRequest(
  supabase: SupabaseClient,
  request: {
    id: string;
    service_type: ServiceCategory;
    zip_code?: string;
    created_at: string;
  }
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  const daysOld = Math.floor(
    (Date.now() - new Date(request.created_at).getTime()) / (1000 * 60 * 60 * 24)
  );

  await createNotification(supabase, {
    userType: 'admin',
    type: 'stale_request',
    title: 'Stale Request Alert',
    message: `${serviceLabel} request in ${request.zip_code || 'Unknown'} has been unmatched for ${daysOld} days`,
    requestId: request.id,
    actionUrl: `/requests?view=${request.id}`,
    priority: 'high',
    metadata: {
      days_old: daysOld,
      service_type: request.service_type,
    },
  });
}

/**
 * A4: Notify admins of a new vendor application
 */
export async function notifyNewApplication(
  supabase: SupabaseClient,
  vendor: {
    id: string;
    business_name: string;
    services?: ServiceCategory[];
    service_areas?: string[];
  }
): Promise<void> {
  const servicesText = vendor.services
    ?.slice(0, 2)
    .map((s) => SERVICE_TYPE_LABELS[s] || s)
    .join(', ');

  await createNotification(supabase, {
    userType: 'admin',
    type: 'new_application',
    title: 'New Vendor Application',
    message: `"${vendor.business_name}" applied${servicesText ? ` - ${servicesText}` : ''}`,
    vendorId: vendor.id,
    actionUrl: `/applications`,
    priority: 'medium',
    metadata: {
      business_name: vendor.business_name,
      services: vendor.services,
      service_areas: vendor.service_areas,
    },
  });
}

/**
 * A5: Notify admins when a vendor accepts a job
 */
export async function notifyVendorAccepted(
  supabase: SupabaseClient,
  match: {
    id: string;
    request_id: string;
    vendor_id: string;
  },
  vendor: { business_name: string },
  request: { service_type: ServiceCategory; zip_code?: string }
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  await createNotification(supabase, {
    userType: 'admin',
    type: 'vendor_accepted',
    title: 'Vendor Accepted Job',
    message: `${vendor.business_name} accepted ${serviceLabel} job in ${request.zip_code || 'Unknown'}`,
    requestId: match.request_id,
    vendorId: match.vendor_id,
    matchId: match.id,
    actionUrl: `/crm`,
    priority: 'low',
    metadata: {
      business_name: vendor.business_name,
      service_type: request.service_type,
    },
  });
}

/**
 * A6: Notify admins when a vendor declines a job
 */
export async function notifyVendorDeclined(
  supabase: SupabaseClient,
  match: {
    id: string;
    request_id: string;
    vendor_id: string;
  },
  vendor: { business_name: string },
  request: { service_type: ServiceCategory; zip_code?: string },
  reason?: string
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  await createNotification(supabase, {
    userType: 'admin',
    type: 'vendor_declined',
    title: 'Vendor Declined Job',
    message: `${vendor.business_name} declined ${serviceLabel} job${reason ? `: ${reason}` : ''}`,
    requestId: match.request_id,
    vendorId: match.vendor_id,
    matchId: match.id,
    actionUrl: `/requests?view=${match.request_id}`,
    priority: 'medium',
    metadata: {
      business_name: vendor.business_name,
      service_type: request.service_type,
      decline_reason: reason,
    },
  });
}

/**
 * A8: Notify admins of a new review
 */
export async function notifyNewReview(
  supabase: SupabaseClient,
  review: {
    match_id: string;
    request_id: string;
    vendor_id: string;
    rating: number;
  },
  vendor: { business_name: string },
  landlord?: { name?: string }
): Promise<void> {
  const stars = '⭐'.repeat(review.rating);

  await createNotification(supabase, {
    userType: 'admin',
    type: review.rating <= 2 ? 'negative_review' : 'new_review',
    title: review.rating <= 2 ? '⚠️ Negative Review' : 'New Review Submitted',
    message: `${stars} for ${vendor.business_name}${landlord?.name ? ` from ${landlord.name}` : ''}`,
    requestId: review.request_id,
    vendorId: review.vendor_id,
    matchId: review.match_id,
    actionUrl: `/crm`,
    priority: review.rating <= 2 ? 'high' : 'low',
    metadata: {
      rating: review.rating,
      business_name: vendor.business_name,
      landlord_name: landlord?.name,
    },
  });
}

// ============================================================================
// Vendor Notification Helpers (Phase 2)
// ============================================================================

/**
 * V1: Notify vendor of a new job lead
 */
export async function notifyVendorNewLead(
  supabase: SupabaseClient,
  vendorId: string,
  match: {
    id: string;
    request_id: string;
  },
  request: {
    service_type: ServiceCategory;
    zip_code?: string;
    job_description?: string;
  }
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  await createNotification(supabase, {
    userType: 'vendor',
    userId: vendorId,
    type: 'new_job_lead',
    title: 'New Job Lead',
    message: `${serviceLabel} job in ${request.zip_code || 'your area'}`,
    requestId: match.request_id,
    matchId: match.id,
    actionUrl: `/vendor/dashboard`,
    priority: 'high',
    metadata: {
      service_type: request.service_type,
      zip_code: request.zip_code,
      description_preview: request.job_description?.substring(0, 100),
    },
  });
}

/**
 * V4: Notify vendor of a new review
 */
export async function notifyVendorNewReview(
  supabase: SupabaseClient,
  vendorId: string,
  review: {
    match_id: string;
    request_id: string;
    rating: number;
  }
): Promise<void> {
  const stars = '⭐'.repeat(review.rating);

  await createNotification(supabase, {
    userType: 'vendor',
    userId: vendorId,
    type: 'new_review_received',
    title: 'New Review',
    message: `You received a ${review.rating}-star review ${stars}`,
    requestId: review.request_id,
    matchId: review.match_id,
    actionUrl: `/vendor/dashboard`,
    priority: 'medium',
    metadata: {
      rating: review.rating,
    },
  });
}

// ============================================================================
// Landlord Notification Helpers (Phase 3)
// ============================================================================

/**
 * L2: Notify landlord that vendors have been matched
 */
export async function notifyLandlordVendorsMatched(
  supabase: SupabaseClient,
  landlordId: string,
  request: {
    id: string;
    service_type: ServiceCategory;
  },
  vendorCount: number
): Promise<void> {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;

  await createNotification(supabase, {
    userType: 'landlord',
    userId: landlordId,
    type: 'vendors_matched',
    title: 'Vendors Matched',
    message: `${vendorCount} ${serviceLabel} vendor${vendorCount > 1 ? 's' : ''} matched to your request`,
    requestId: request.id,
    actionUrl: `/landlord/dashboard`,
    priority: 'high',
    metadata: {
      vendor_count: vendorCount,
      service_type: request.service_type,
    },
  });
}
