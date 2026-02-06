import { ServiceRequest, Vendor, SERVICE_TYPE_LABELS, URGENCY_LABELS } from '@/types/database';

// SMS when landlord submits a request
export function requestReceivedSms(request: ServiceRequest): string {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  // TODO: Replace with actual message text
  return `Real Landlording: We received your ${serviceLabel} request for ${request.property_location}. We're matching you with vetted vendors now. Check your email for details!`;
}

// SMS to landlord when vendors are matched
export function landlordIntroSms(request: ServiceRequest, vendors: Vendor[]): string {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  const vendorCount = vendors.length;
  // TODO: Replace with actual message text
  return `Real Landlording: Great news! We matched you with ${vendorCount} vendor${vendorCount > 1 ? 's' : ''} for your ${serviceLabel} request. Check your email for their contact info!`;
}

// SMS to vendor about new job referral
export function vendorIntroSms(request: ServiceRequest, vendor: Vendor): string {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  // TODO: Replace with actual message text
  return `Real Landlording: New referral! ${serviceLabel} job in ${request.property_location}. Client: ${request.landlord_name || 'See email'}. Contact them ASAP - check your email for full details.`;
}

// SMS follow-up to landlord
export function followUpSms(request: ServiceRequest, vendorNames: string[]): string {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  // TODO: Replace with actual message text
  return `Real Landlording: How did it go with your ${serviceLabel} vendors? We'd love your feedback - reply or check your email!`;
}

// SMS when vendor is approved
export function vendorWelcomeSms(vendor: Vendor): string {
  // TODO: Replace with actual message text
  return `Real Landlording: Welcome ${vendor.contact_name}! You're now approved as a vendor. Login credentials sent to your email. Start getting referrals soon!`;
}

// SMS when vendor is rejected
export function vendorRejectedSms(vendor: Vendor): string {
  // TODO: Replace with actual message text
  return `Real Landlording: Thank you for your interest. Unfortunately, we're unable to approve your application at this time. Check your email for details.`;
}

// SMS when no vendors matched
export function noVendorMatchedSms(request: ServiceRequest): string {
  const serviceLabel = SERVICE_TYPE_LABELS[request.service_type] || request.service_type;
  // TODO: Replace with actual message text
  return `Real Landlording: Update on your ${serviceLabel} request - we're working to find the right vendor. Check your email for details.`;
}

// SMS when vendor submits application
export function vendorApplicationReceivedSms(vendor: { contact_name: string; phone?: string }): string {
  // TODO: Replace with actual message text
  return `Real Landlording: Thanks ${vendor.contact_name}! We received your vendor application. Our team is reviewing it - check your email for next steps.`;
}
