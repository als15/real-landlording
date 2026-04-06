import { ServiceRequest, SERVICE_TYPE_LABELS } from '@/types/database';
import { getServiceDisplayLabel } from '@/lib/utils/serviceLabel';

/**
 * SMS companion for Day 3 vendor check email
 */
export function vendorDay3CheckSms(request: ServiceRequest): string {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  return `Real Landlording: Quick check on your ${serviceLabel} project referral. Please check your email for a status update link.`;
}

/**
 * SMS companion for Day 7 vendor recheck email
 */
export function vendorDay7RecheckSms(request: ServiceRequest): string {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  return `Real Landlording: Following up on your ${serviceLabel} referral. Check your email to let us know where things stand.`;
}

/**
 * SMS companion for landlord contact check email
 */
export function landlordContactCheckSms(request: ServiceRequest, vendorName: string): string {
  return `Real Landlording: Did ${vendorName} reach out about your project? Check your email to let us know.`;
}

/**
 * SMS companion for vendor completion check email
 */
export function vendorCompletionCheckSms(request: ServiceRequest): string {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  return `Real Landlording: How's the ${serviceLabel} job going? Check your email for a quick status update link.`;
}

/**
 * SMS companion for Day 0 landlord expectation email
 */
export function landlordDay0ExpectationSms(request: ServiceRequest, vendorName: string): string {
  const serviceLabel = getServiceDisplayLabel(request.service_type, request.service_details as Record<string, string> | undefined, SERVICE_TYPE_LABELS);
  return `Real Landlording: We matched you with ${vendorName} for your ${serviceLabel} project. They should reach out shortly.`;
}

/**
 * SMS companion for landlord feedback request email
 */
export function landlordFeedbackRequestSms(request: ServiceRequest, vendorName: string): string {
  return `Real Landlording: How was your experience with ${vendorName}? Check your email to share your feedback.`;
}
